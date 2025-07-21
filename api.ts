import type { PageAnalytics, Prisma } from "@prisma/client";
import { db } from "~/server/db";
import {
  getAuth,
  requestMultimodalModel,
  getBaseUrl,
  sendEmail,
  upload,
  queueTask,
  getTaskStatus as getTaskStatusInternal,
  createProduct,
  listUserPurchases,
  startRealtimeResponse,
} from "~/server/actions";
import { z } from "zod";

const AdvancedInsightsSchema = z.object({
  trendingTopics: z
    .array(
      z.object({
        topic: z.string(),
        sentiment: z.string(),
        relevanceScore: z.number(),
        executiveSummary: z.string(),
        strategicAngle: z.string(),
        exampleHook: z.string(),
        samplePost: z.string(),
        historicalData: z.string(),
        contentFormatSuggestions: z.array(z.string()),
        sources: z
          .array(z.object({ title: z.string(), url: z.string() }))
          .optional(),
      }),
    )
    .optional(),
  viralContentPotential: z
    .array(
      z.object({
        concept: z.string(),
        viralityScore: z.number(),
        targetPlatforms: z.array(z.string()),
        justification: z.string(),
        hook: z.string(),
        body: z.string(),
        callToAction: z.string(),
        hashtags: z.array(z.string()),
        creativeDirection: z.string(),
        optimizationTips: z.string(),
        sources: z
          .array(z.object({ title: z.string(), url: z.string() }))
          .optional(),
      }),
    )
    .optional(),
  audienceInsights: z
    .object({
      keyInsightsSummary: z.string(),
      personas: z.array(
        z.object({
          personaName: z.string(),
          description: z.string(),
          motivations: z.array(z.string()),
          painPoints: z.array(z.string()),
          communicationTips: z.array(z.string()),
          engagementPatterns: z.string(),
          preferredContentFormats: z.array(z.string()),
          channels: z.array(z.string()),
        }),
      ),
      overallSentiment: z.object({
        score: z.number(),
        trend: z.string(),
        analysis: z.string(),
      }),
      competitiveMentions: z.array(
        z.object({
          competitor: z.string(),
          sentiment: z.string(),
          count: z.number(),
        }),
      ),
    })
    .optional(),
});

import axios from "axios";

import { nanoid } from "nanoid";
import { createHash } from "crypto";

// Retry and error handling utilities
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

interface BatchRequest {
  id: string;
  type:
    | "trend_analysis"
    | "content_generation"
    | "sentiment_analysis"
    | "trending_topics_detection";
  parameters: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: number;
  userId?: string;
}

interface BatchProcessor {
  requests: BatchRequest[];
  processingTimer?: NodeJS.Timeout;
  isProcessing: boolean;
  maxBatchSize: number;
  maxWaitTime: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    // Retry on network errors, timeouts, rate limits, and temporary server errors
    if (
      error?.code === "ENOTFOUND" ||
      error?.code === "ECONNRESET" ||
      error?.code === "ETIMEDOUT"
    )
      return true;
    if (error?.response?.status >= 500 && error?.response?.status < 600)
      return true;
    if (error?.response?.status === 429) return true; // Rate limit
    if (error?.response?.status === 408) return true; // Request timeout
    if (error?.message?.includes("timeout")) return true;
    if (error?.message?.includes("network")) return true;
    return false;
  },
};

// Circuit breaker pattern for external API calls
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  successCount: number;
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 300000, // 5 minutes
  halfOpenMaxCalls: 3,
};

// Circuit breaker states for different service types
const circuitBreakers = new Map<string, CircuitBreakerState>();

// Rate limiting for trending topics detection
interface RateLimitState {
  requests: Array<{ timestamp: number; userId: string }>;
  lastCleanup: number;
}

interface RateLimitConfig {
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  cleanupInterval: number; // in milliseconds
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerHour: 10,
  maxRequestsPerDay: 50,
  cleanupInterval: 300000, // 5 minutes
};

const rateLimitStates = new Map<string, RateLimitState>();

function getRateLimitState(serviceName: string): RateLimitState {
  if (!rateLimitStates.has(serviceName)) {
    rateLimitStates.set(serviceName, {
      requests: [],
      lastCleanup: Date.now(),
    });
  }
  return rateLimitStates.get(serviceName)!;
}

function cleanupOldRateLimitEntries(
  state: RateLimitState,
  config: RateLimitConfig,
): void {
  const now = Date.now();
  if (now - state.lastCleanup < config.cleanupInterval) {
    return; // Skip cleanup if not enough time has passed
  }

  const dayAgo = now - 24 * 60 * 60 * 1000;
  state.requests = state.requests.filter((req) => req.timestamp > dayAgo);
  state.lastCleanup = now;
}

function checkRateLimit(
  serviceName: string,
  userId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG,
): { allowed: boolean; resetTime?: number } {
  const state = getRateLimitState(serviceName);
  cleanupOldRateLimitEntries(state, config);

  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const userRequestsLastHour = state.requests.filter(
    (req) => req.userId === userId && req.timestamp > hourAgo,
  ).length;

  const userRequestsLastDay = state.requests.filter(
    (req) => req.userId === userId && req.timestamp > dayAgo,
  ).length;

  if (userRequestsLastHour >= config.maxRequestsPerHour) {
    // Find the oldest request in the last hour to calculate reset time
    const oldestHourRequest = state.requests
      .filter((req) => req.userId === userId && req.timestamp > hourAgo)
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    return {
      allowed: false,
      resetTime: oldestHourRequest
        ? oldestHourRequest.timestamp + 60 * 60 * 1000
        : now + 60 * 60 * 1000,
    };
  }

  if (userRequestsLastDay >= config.maxRequestsPerDay) {
    // Find the oldest request in the last day to calculate reset time
    const oldestDayRequest = state.requests
      .filter((req) => req.userId === userId && req.timestamp > dayAgo)
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    return {
      allowed: false,
      resetTime: oldestDayRequest
        ? oldestDayRequest.timestamp + 24 * 60 * 60 * 1000
        : now + 24 * 60 * 60 * 1000,
    };
  }

  return { allowed: true };
}

function recordRateLimitRequest(serviceName: string, userId: string): void {
  const state = getRateLimitState(serviceName);
  state.requests.push({ timestamp: Date.now(), userId });
}

function getCircuitBreakerState(serviceName: string): CircuitBreakerState {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, {
      failures: 0,
      lastFailureTime: 0,
      state: "CLOSED",
      successCount: 0,
    });
  }
  return circuitBreakers.get(serviceName)!;
}

function updateCircuitBreakerOnSuccess(serviceName: string): void {
  const state = getCircuitBreakerState(serviceName);

  if (state.state === "HALF_OPEN") {
    state.successCount++;
    if (
      state.successCount >= DEFAULT_CIRCUIT_BREAKER_OPTIONS.halfOpenMaxCalls
    ) {
      // Reset to closed state
      state.state = "CLOSED";
      state.failures = 0;
      state.successCount = 0;
      console.log(`Circuit breaker for ${serviceName} reset to CLOSED state`);
    }
  } else if (state.state === "CLOSED") {
    // Reset failure count on success
    state.failures = 0;
  }
}

function updateCircuitBreakerOnFailure(serviceName: string): void {
  const state = getCircuitBreakerState(serviceName);
  const now = Date.now();

  state.failures++;
  state.lastFailureTime = now;

  if (state.failures >= DEFAULT_CIRCUIT_BREAKER_OPTIONS.failureThreshold) {
    state.state = "OPEN";
    console.log(
      `Circuit breaker for ${serviceName} opened after ${state.failures} failures`,
    );
  }
}

function shouldAllowRequest(serviceName: string): boolean {
  const state = getCircuitBreakerState(serviceName);
  const now = Date.now();

  switch (state.state) {
    case "CLOSED":
      return true;

    case "OPEN":
      // Check if we should transition to half-open
      if (
        now - state.lastFailureTime >=
        DEFAULT_CIRCUIT_BREAKER_OPTIONS.resetTimeout
      ) {
        state.state = "HALF_OPEN";
        state.successCount = 0;
        console.log(
          `Circuit breaker for ${serviceName} transitioning to HALF_OPEN state`,
        );
        return true;
      }
      return false;

    case "HALF_OPEN":
      return (
        state.successCount < DEFAULT_CIRCUIT_BREAKER_OPTIONS.halfOpenMaxCalls
      );

    default:
      return true;
  }
}

async function executeWithCircuitBreaker<T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallback?: () => Promise<T>,
): Promise<T> {
  if (!shouldAllowRequest(serviceName)) {
    console.log(`Circuit breaker for ${serviceName} is OPEN, request blocked`);

    if (fallback) {
      console.log(`Executing fallback for ${serviceName}`);
      return await fallback();
    }

    throw new Error(
      `Service ${serviceName} is currently unavailable (circuit breaker OPEN)`,
    );
  }

  try {
    const result = await operation();
    updateCircuitBreakerOnSuccess(serviceName);
    return result;
  } catch (error) {
    updateCircuitBreakerOnFailure(serviceName);

    // If we have a fallback and this was a service failure, try fallback
    if (fallback && isServiceFailure(error)) {
      console.log(`Primary service failed for ${serviceName}, trying fallback`);
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error(
          `Fallback also failed for ${serviceName}:`,
          fallbackError,
        );
        throw error; // Throw original error
      }
    }

    throw error;
  }
}

function isServiceFailure(error: any): boolean {
  // Determine if this is a service failure that should trigger circuit breaker
  if (error?.response?.status >= 500) return true;
  if (error?.response?.status === 429) return true; // Rate limit
  if (
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNRESET" ||
    error?.code === "ETIMEDOUT"
  )
    return true;
  if (error?.message?.includes("timeout")) return true;
  if (error?.message?.includes("network")) return true;
  if (error?.message?.includes("rate limit")) return true;
  if (error?.message?.includes("capacity")) return true;
  if (error?.message?.includes("overloaded")) return true;
  return false;
}

// Batch processing system for intelligent request grouping
const batchProcessor: BatchProcessor = {
  requests: [],
  processingTimer: undefined,
  isProcessing: false,
  maxBatchSize: 5,
  maxWaitTime: 2000, // 2 seconds
};

// Add request to batch queue
function addToBatch(
  request: Omit<BatchRequest, "id" | "timestamp">,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const batchRequest: BatchRequest = {
      ...request,
      id: nanoid(),
      resolve,
      reject,
      timestamp: Date.now(),
    };

    batchProcessor.requests.push(batchRequest);

    // Schedule batch processing
    if (!batchProcessor.processingTimer) {
      batchProcessor.processingTimer = setTimeout(() => {
        processBatch().catch(console.error);
      }, batchProcessor.maxWaitTime);
    }

    // Process immediately if batch is full
    if (batchProcessor.requests.length >= batchProcessor.maxBatchSize) {
      clearTimeout(batchProcessor.processingTimer);
      batchProcessor.processingTimer = undefined;
      processBatch();
    }
  });
}

// Process batched requests
async function processBatch() {
  if (batchProcessor.isProcessing || batchProcessor.requests.length === 0) {
    return;
  }

  batchProcessor.isProcessing = true;
  batchProcessor.processingTimer = undefined;

  const requestsToProcess = [...batchProcessor.requests];
  batchProcessor.requests = [];

  // Group requests by type and similarity
  const groupedRequests = groupSimilarRequests(requestsToProcess);

  // Process each group
  for (const group of groupedRequests) {
    try {
      await processBatchGroup(group);
    } catch (error) {
      // Handle group processing errors
      group.forEach((req) => req.reject(error));
    }
  }

  batchProcessor.isProcessing = false;
}

// Group similar requests for batch processing
function groupSimilarRequests(requests: BatchRequest[]): BatchRequest[][] {
  const groups: { [key: string]: BatchRequest[] } = {};

  requests.forEach((request) => {
    let groupKey = request.type;

    // Create more specific grouping based on parameters
    if (request.type === "sentiment_analysis") {
      groupKey = "sentiment_analysis";
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey]!.push(request);
  });

  return Object.values(groups);
}

// Process a group of similar requests
async function processBatchGroup(requests: BatchRequest[]) {
  if (requests.length === 0) return;

  const requestType = requests[0]?.type;

  switch (requestType) {
    case "sentiment_analysis":
      await processSentimentAnalysisBatch(requests);
      break;
    default:
      // Fallback: process individually
      for (const request of requests) {
        try {
          const result = await processIndividualRequest(request);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
  }
}

// Process sentiment analysis requests in batch
async function processSentimentAnalysisBatch(requests: BatchRequest[]) {
  try {
    // Combine all comments for batch sentiment analysis
    const allComments = requests.flatMap(
      (req) => req.parameters.comments || [],
    );

    if (allComments.length > 0) {
      const batchResults = await analyzeSentimentBatch(allComments);

      // Distribute results back to individual requests
      requests.forEach((request) => {
        const requestComments = request.parameters.comments || [];
        const requestResults: any = {};

        requestComments.forEach((comment: any) => {
          if (batchResults[comment.id]) {
            requestResults[comment.id] = batchResults[comment.id];
          }
        });

        request.resolve({ sentiments: requestResults });
      });
    } else {
      requests.forEach((request) => request.resolve({ sentiments: {} }));
    }
  } catch (error) {
    requests.forEach((request) => request.reject(error));
  }
}

// Fallback for individual request processing
async function processIndividualRequest(request: BatchRequest): Promise<any> {
  // This is a fallback - in practice, most requests should be handled by batch processors
  throw new Error(
    `No batch processor available for request type: ${request.type}`,
  );
}

// Enhanced batch-aware wrapper for AI model requests
async function batchAwareRequestMultimodalModel<T>(
  requestType: BatchRequest["type"],
  parameters: any,
  modelConfig: Parameters<typeof requestMultimodalModel>[0],
): Promise<T> {
  // Check if this request can be batched
  const canBatch = shouldBatchRequest(requestType, parameters);

  if (canBatch && requestType === "sentiment_analysis") {
    return new Promise((resolve, reject) => {
      addToBatch({
        type: requestType,
        parameters: { ...parameters, modelConfig },
        priority: getPriority(requestType, parameters),
        resolve,
        reject,
      });
    });
  }

  // Process immediately for high-priority or non-batchable requests
  return (await requestMultimodalModel({
    system:
      "You are a helpful assistant that processes content analysis requests.",
    ...modelConfig,
  })) as T;
}

// Determine if a request should be batched
function shouldBatchRequest(
  requestType: BatchRequest["type"],
  parameters: any,
): boolean {
  // Don't batch high-priority or time-sensitive requests
  if (parameters?.priority === "high" || parameters?.realTime) {
    return false;
  }

  // Don't batch very large requests
  if (parameters?.complexity === "high" || parameters?.dataSize > 1000000) {
    return false;
  }

  // Only batch sentiment analysis for now (safest to start with)
  return requestType === "sentiment_analysis";
}

// Get request priority for batching
function getPriority(
  requestType: BatchRequest["type"],
  parameters: any,
): number {
  if (parameters?.priority === "high") return 1;
  if (parameters?.priority === "medium") return 2;
  if (requestType === "sentiment_analysis") return 3; // Lower priority for batch-friendly operations
  return 4; // Default priority
}

// Intelligent model selection based on content complexity
function selectOptimalModel(
  systemPrompt: string,
  userContent: string,
  taskType: string,
  fallbackModel?: "small" | "medium" | "large",
): "small" | "medium" | "large" {
  if (fallbackModel) {
    return fallbackModel;
  }

  // Calculate complexity score based on multiple factors
  let complexityScore = 0;

  // Factor 1: Content length
  const totalLength = systemPrompt.length + userContent.length;
  if (totalLength > 5000) complexityScore += 3;
  else if (totalLength > 2000) complexityScore += 2;
  else if (totalLength > 500) complexityScore += 1;

  // Factor 2: Task complexity keywords in system prompt
  const complexTaskKeywords = [
    "analyze",
    "strategic",
    "comprehensive",
    "expert",
    "advanced",
    "sophisticated",
    "multi-dimensional",
    "competitive intelligence",
    "brand strategy",
    "viral marketing",
    "consumer psychology",
    "predictive",
    "forecast",
    "anomaly",
    "cross-platform",
    "roi",
  ];
  const complexKeywordCount = complexTaskKeywords.filter((keyword) =>
    systemPrompt.toLowerCase().includes(keyword),
  ).length;
  complexityScore += Math.min(complexKeywordCount, 5);

  // Factor 3: Structured output complexity (check for nested objects)
  const structureComplexity =
    (systemPrompt + userContent).split("z.object").length - 1;
  if (structureComplexity > 5) complexityScore += 3;
  else if (structureComplexity > 2) complexityScore += 2;
  else if (structureComplexity > 1) complexityScore += 1;

  // Factor 4: Task type specific scoring
  switch (taskType.toLowerCase()) {
    case "trend_analysis":
    case "brand_analysis":
    case "competitive_intelligence":
      complexityScore += 2;
      break;
    case "content_generation":
    case "response_generation":
      complexityScore += 1;
      break;
    case "sentiment_analysis":
    case "simple_categorization":
      complexityScore += 0;
      break;
  }

  // Factor 5: Multi-step reasoning indicators
  const reasoningKeywords = [
    "step by step",
    "analyze then",
    "first.*then",
    "based on.*provide",
    "consider.*factors",
    "workflow",
    "process",
    "methodology",
  ];
  const reasoningCount = reasoningKeywords.filter((pattern) =>
    new RegExp(pattern, "i").test(systemPrompt),
  ).length;
  complexityScore += reasoningCount;

  // Model selection based on complexity score
  if (complexityScore >= 10) {
    return "large"; // High complexity tasks
  } else if (complexityScore >= 5) {
    return "medium"; // Medium complexity tasks
  } else {
    return "small"; // Simple tasks
  }
}

// Enhanced requestMultimodalModel wrapper with intelligent model selection
async function intelligentRequestMultimodalModel<T>(
  config: Parameters<typeof requestMultimodalModel>[0] & {
    taskType?: string;
    forceModel?: "small" | "medium" | "large";
  },
): Promise<T> {
  const systemPrompt = config.system || "You are a helpful AI assistant.";
  const userContent = Array.isArray(config.messages)
    ? config.messages
        .map((m) =>
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        )
        .join(" ")
    : "";

  const optimalModel = selectOptimalModel(
    systemPrompt,
    userContent,
    config.taskType || "general",
    config.forceModel || (config.model as any),
  );

  return (await requestMultimodalModel({
    ...config,
    system: systemPrompt,
    model: optimalModel,
  })) as T;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt or if error is not retryable
      if (attempt === opts.maxAttempts || !opts.retryableErrors(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay,
      );

      console.log(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms delay. Error:`,
        (error as any)?.message || error,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Enhanced error logging with context

// Content similarity caching utilities
function generateContentCacheKey(prompt: string, context?: string): string {
  const input = context ? `${prompt}|${context}` : prompt;
  return createHash("md5").update(input.toLowerCase().trim()).digest("hex");
}

async function getCachedContent(
  cacheKey: string,
  maxAgeHours = 24,
): Promise<string | null> {
  try {
    const cached = await db.analyticsCache.findFirst({
      where: {
        cacheKey,
        status: "COMPLETED",
        startedAt: { gt: new Date(Date.now() - maxAgeHours * 60 * 60 * 1000) },
      },
    });
    if (cached?.data) {
      const parsedData = JSON.parse(cached.data as string) as {
        content?: string;
      };
      return parsedData.content || null;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving cached content:", error);
    return null;
  }
}

async function setCachedContent(
  cacheKey: string,
  content: string,
  userId?: string,
): Promise<void> {
  try {
    await db.analyticsCache.upsert({
      where: { cacheKey },
      update: {
        data: JSON.stringify({ content }),
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        cacheKey,
        data: JSON.stringify({ content }),
        status: "COMPLETED",
        cacheType: "CONTENT",
        startedAt: new Date(),
        completedAt: new Date(),
        userId: userId || "system",
      },
    });
  } catch (error) {
    console.error("Error caching content:", error);
  }
}

// Helper function for input validation
// Enhanced input sanitization utilities
function sanitizeString(input: string | undefined, maxLength = 100): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[<>"'&\x00-\x1f\x7f-\x9f]/g, "") // Remove HTML/script chars and control chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .substring(0, maxLength);
}

function sanitizeArray(
  input: string[] | undefined,
  maxItems = 20,
  maxItemLength = 50,
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .slice(0, maxItems) // Limit array size
    .map((item) => sanitizeString(item, maxItemLength))
    .filter((item) => item.length > 0); // Remove empty strings
}

export function validateTrendingTopicsInput(input?: {
  region?: string;
  category?: string;
  includeInstagram?: boolean;
  includeTikTok?: boolean;
  includeTwitter?: boolean;
  includeGoogle?: boolean;
  timeframe?: "1h" | "24h" | "7d";
}) {
  const {
    region = "US",
    category = "all",
    includeInstagram = true,
    includeTikTok = true,
    includeTwitter = true,
    includeGoogle = true,
    timeframe = "24h",
  } = input || {};

  const validRegions = [
    "US",
    "UK",
    "CA",
    "AU",
    "IN",
    "DE",
    "FR",
    "JP",
    "BR",
    "MX",
    "ES",
    "IT",
    "NL",
    "SE",
    "NO",
    "DK",
    "FI",
    "BE",
    "AT",
    "CH",
  ];
  const validCategories = [
    "all",
    "technology",
    "entertainment",
    "sports",
    "news",
    "lifestyle",
    "business",
    "health",
    "gaming",
    "fashion",
    "food",
    "travel",
    "finance",
    "education",
    "science",
    "art",
    "music",
    "politics",
    "environment",
  ];
  const validTimeframes = ["1h", "24h", "7d"];

  // Sanitize and validate region
  const sanitizedRegion =
    typeof region === "string" && validRegions.includes(region.toUpperCase())
      ? region.toUpperCase()
      : "US";

  // Sanitize and validate category
  const sanitizedCategory =
    typeof category === "string" &&
    validCategories.includes(category.toLowerCase())
      ? category.toLowerCase()
      : "all";

  // Validate timeframe
  const validatedTimeframe = validTimeframes.includes(timeframe as any)
    ? timeframe
    : "24h";

  // Ensure at least one platform is selected
  const hasValidPlatform =
    includeInstagram || includeTikTok || includeTwitter || includeGoogle;
  const finalPlatforms = hasValidPlatform
    ? { includeInstagram, includeTikTok, includeTwitter, includeGoogle }
    : {
        includeInstagram: true,
        includeTikTok: true,
        includeTwitter: true,
        includeGoogle: true,
      };

  return {
    sanitizedRegion,
    sanitizedCategory,
    ...finalPlatforms,
    timeframe: validatedTimeframe,
  };
}

// Enhanced validation for brand analysis input
export function validateBrandAnalysisInput(input?: {
  industry?: string;
  targetAudience?: string;
  contentGoals?: string[];
  avoidTopics?: string[];
  brandContext?: string;
}) {
  const { industry, targetAudience, contentGoals, avoidTopics, brandContext } =
    input || {};

  return {
    industry: sanitizeString(industry, 100),
    targetAudience: sanitizeString(targetAudience, 200),
    contentGoals: sanitizeArray(contentGoals, 10, 100),
    avoidTopics: sanitizeArray(avoidTopics, 20, 100),
    brandContext: sanitizeString(brandContext, 2000),
  };
}

// Enhanced validation for TikTok/Instagram trends input
export function validateTikTokInstagramInput(input?: {
  region?: string;
  niche?: string;
  timeframe?: string;
}) {
  const { region = "US", niche = "all", timeframe = "24h" } = input || {};

  const validRegions = [
    "US",
    "UK",
    "CA",
    "AU",
    "IN",
    "DE",
    "FR",
    "JP",
    "BR",
    "MX",
    "ES",
    "IT",
    "NL",
    "SE",
    "NO",
    "DK",
    "FI",
    "BE",
    "AT",
    "CH",
  ];
  const validNiches = [
    "all",
    "beauty",
    "fashion",
    "fitness",
    "food",
    "travel",
    "technology",
    "entertainment",
    "music",
    "dance",
    "comedy",
    "education",
    "business",
    "lifestyle",
    "health",
    "gaming",
    "art",
    "diy",
    "pets",
    "parenting",
  ];
  const validTimeframes = ["1h", "6h", "24h", "7d"];

  return {
    region:
      typeof region === "string" && validRegions.includes(region.toUpperCase())
        ? region.toUpperCase()
        : "US",
    niche:
      typeof niche === "string" && validNiches.includes(niche.toLowerCase())
        ? niche.toLowerCase()
        : "all",
    timeframe: validTimeframes.includes(timeframe as any) ? timeframe : "24h",
  };
}

// Helper function for fallback trending topics
async function getFallbackTrendingTopics(userId?: string) {
  // Try to get recent cached results first
  const cachedResults = await getCachedTrendingTopicsFromDB(userId, 48); // 48 hour cache
  if (cachedResults && cachedResults.length > 0) {
    return {
      trendingTopics: cachedResults,
      lastUpdated: new Date().toISOString(),
      summary: "Recent cached trending topics results",
      source: "cached",
    };
  }

  // Enhanced fallback topics with more variety
  const fallbackTopics = [
    {
      topic: "AI and Technology Trends",
      platforms: ["Twitter", "LinkedIn", "Google"],
      estimatedReach: "10M+",
      context: "Ongoing interest in artificial intelligence developments",
      viralPotentialScore: 7,
      contentAngles: [
        "AI tools for business",
        "Future of work",
        "Tech innovation",
        "Machine learning applications",
      ],
      demographics: "Tech professionals, entrepreneurs, students",
      timeSensitivity: "Ongoing trend",
      sources: [
        {
          title: "AI Technology Trends",
          url: "https://example.com/ai-trends",
          platform: "Google Trends",
        },
      ],
    },
    {
      topic: "Sustainable Living",
      platforms: ["Instagram", "TikTok", "Pinterest"],
      estimatedReach: "5M+",
      context: "Growing environmental consciousness",
      viralPotentialScore: 6,
      contentAngles: [
        "Eco-friendly products",
        "Green lifestyle tips",
        "Sustainability challenges",
        "Zero waste living",
      ],
      demographics: "Millennials, Gen Z, environmentally conscious consumers",
      timeSensitivity: "Long-term trend",
      sources: [
        {
          title: "Sustainable Living Trends",
          url: "https://example.com/sustainability",
          platform: "Instagram",
        },
      ],
    },
    {
      topic: "Remote Work Culture",
      platforms: ["LinkedIn", "Twitter", "YouTube"],
      estimatedReach: "8M+",
      context: "Evolution of workplace dynamics and productivity",
      viralPotentialScore: 8,
      contentAngles: [
        "Work-life balance tips",
        "Remote team management",
        "Home office setups",
        "Digital nomad lifestyle",
      ],
      demographics: "Working professionals, managers, freelancers",
      timeSensitivity: "Ongoing trend",
      sources: [
        {
          title: "Remote Work Trends",
          url: "https://example.com/remote-work",
          platform: "LinkedIn",
        },
      ],
    },
    {
      topic: "Health and Wellness",
      platforms: ["Instagram", "TikTok", "YouTube"],
      estimatedReach: "12M+",
      context: "Increased focus on mental and physical health",
      viralPotentialScore: 9,
      contentAngles: [
        "Mental health awareness",
        "Fitness routines",
        "Healthy eating habits",
        "Mindfulness practices",
      ],
      demographics: "Health-conscious individuals, fitness enthusiasts",
      timeSensitivity: "Evergreen",
      sources: [
        {
          title: "Health and Wellness Trends",
          url: "https://example.com/health-wellness",
          platform: "Instagram",
        },
      ],
    },
  ];

  // Randomize and select subset for variety
  const selectedTopics = fallbackTopics
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(3, fallbackTopics.length));

  return {
    trendingTopics: selectedTopics,
    lastUpdated: new Date().toISOString(),
    summary: "Fallback trending topics with enhanced variety and caching",
    source: "fallback",
  };
}

// Helper function to get cached trending topics from database
async function getCachedTrendingTopicsFromDB(
  userId?: string,
  maxAgeHours = 24,
) {
  try {
    const recentAnalyses = await db.trendAnalysis.findMany({
      where: {
        ...(userId && { userId }),
        createdAt: {
          gt: new Date(Date.now() - maxAgeHours * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (recentAnalyses.length === 0) {
      return null;
    }

    // Extract trending topics from recent analyses
    const topics: any[] = [];
    for (const analysis of recentAnalyses) {
      try {
        const data = JSON.parse(analysis.rawTrends) as any;
        if (data.trendingTopics && Array.isArray(data.trendingTopics)) {
          topics.push(...data.trendingTopics.slice(0, 2)); // Take top 2 from each
        }
      } catch (parseError) {
        console.error("Error parsing cached analysis data:", parseError);
      }
    }

    // Remove duplicates and limit results
    const uniqueTopics = topics
      .filter(
        (topic, index, self) =>
          index === self.findIndex((t: any) => t.topic === topic.topic),
      )
      .slice(0, 5);

    return uniqueTopics.length > 0 ? uniqueTopics : null;
  } catch (error) {
    console.error("Error getting cached trending topics:", error);
    return null;
  }
}

// Helper function to create trending topics prompt
function createTrendingTopicsPrompt(params: {
  includeInstagram: boolean;
  includeTikTok: boolean;
  includeTwitter: boolean;
  includeGoogle: boolean;
  sanitizedRegion: string;
  sanitizedCategory: string;
  timeframe: "1h" | "24h" | "7d";
}) {
  const {
    includeInstagram,
    includeTikTok,
    includeTwitter,
    includeGoogle,
    sanitizedRegion,
    sanitizedCategory,
    timeframe,
  } = params;

  return `Search for and identify the top 5-8 trending topics right now across these platforms:
${includeInstagram ? "- Instagram (hashtags, reels, stories)\n" : ""}${includeTikTok ? "- TikTok (challenges, sounds, hashtags)\n" : ""}${includeTwitter ? "- Twitter/X (trending hashtags, viral tweets)\n" : ""}${includeGoogle ? "- Google Trends (search spikes)\n" : ""}

Region: ${sanitizedRegion}
Category: ${sanitizedCategory}
Timeframe: ${timeframe}

For each trending topic, provide:
1. The topic/hashtag/keyword
2. Platform(s) where it's trending
3. Estimated reach/engagement
4. Why it's trending (context)
5. Viral potential score (1-10)
6. Best content angles for brands
7. Relevant demographics
8. Time sensitivity (how long this trend might last)
9. Source links for verification

Prioritize quality over quantity - focus on the most impactful and actionable trends.`;
}

// Helper function to store trending analysis results
async function storeTrendingAnalysisResult(params: {
  currentUserId: string;
  result: any;
  sanitizedRegion: string;
  sanitizedCategory: string;
  timeframe: "1h" | "24h" | "7d";
  isError?: boolean;
  errorMessage?: string;
  cached?: boolean;
}) {
  const {
    currentUserId,
    result,
    sanitizedRegion,
    sanitizedCategory,
    timeframe,
    isError = false,
    errorMessage,
    cached = false,
  } = params;

  if (isError) {
    await db.trendAnalysis.create({
      data: {
        userId: currentUserId,
        rawTrends: JSON.stringify({
          error: errorMessage || "Unknown error occurred",
          errorType: "TrendDetectionError",
          timestamp: new Date().toISOString(),
          region: sanitizedRegion,
          category: sanitizedCategory,
          timeframe: timeframe,
        }),
        brandAnalysis: JSON.stringify({
          success: false,
          error: errorMessage || "Unknown error occurred",
          errorType: "TrendDetectionError",
          timestamp: new Date().toISOString(),
          region: sanitizedRegion,
          category: sanitizedCategory,
          timeframe: timeframe,
        }),
        brandContext: "Real-time trending topics (error)",
        industry: sanitizedCategory,
        targetAudience: sanitizedRegion,
        contentGoals: null,
        avoidTopics: null,
      },
    });
  } else {
    await db.trendAnalysis.create({
      data: {
        userId: currentUserId,
        rawTrends: JSON.stringify(result),
        brandAnalysis: JSON.stringify({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
          region: sanitizedRegion,
          category: sanitizedCategory,
          timeframe: timeframe,
          cached,
        }),
        brandContext: cached
          ? "Real-time trending topics (cached)"
          : "Real-time trending topics",
        industry: sanitizedCategory,
        targetAudience: sanitizedRegion,
        contentGoals: null,
        avoidTopics: null,
      },
    });
  }
}

// Enhanced real-time trending topics detection
export async function detectRealTimeTrendingTopics(input?: {
  region?: string;
  category?: string;
  includeInstagram?: boolean;
  includeTikTok?: boolean;
  includeTwitter?: boolean;
  includeGoogle?: boolean;
  timeframe?: "1h" | "24h" | "7d";
}) {
  // Get authenticated user ID before starting the streaming response
  const auth = await getAuth({ required: true });
  const currentUserId = auth.userId;

  // Check rate limiting for trending topics detection
  const rateLimitCheck = checkRateLimit("trending-topics", currentUserId);
  if (!rateLimitCheck.allowed) {
    const resetTime = rateLimitCheck.resetTime
      ? new Date(rateLimitCheck.resetTime).toLocaleString()
      : "soon";
    throw new Error(`Rate limit exceeded. Please try again at ${resetTime}`);
  }

  // Record the request for rate limiting
  recordRateLimitRequest("trending-topics", currentUserId);

  // Start streaming response for real-time progress updates
  const stream = await startRealtimeResponse<{
    status?: string;
    progress?: number;
    currentStep?: string;
    toolHistory?: Array<{
      name: string;
      status: "in_progress" | "done";
      inProgressMessage: string;
    }>;
    result?: any;
    error?: string;
  }>();

  const validatedInput = validateTrendingTopicsInput(input);
  const {
    sanitizedRegion,
    sanitizedCategory,
    includeInstagram,
    includeTikTok,
    includeTwitter,
    includeGoogle,
    timeframe,
  } = validatedInput;

  const cacheKey = generateContentCacheKey(
    `trending-topics-${sanitizedRegion}-${sanitizedCategory}-${timeframe}-${includeInstagram}-${includeTikTok}-${includeTwitter}-${includeGoogle}`,
  );

  try {
    // Initial status update
    stream.next({
      status: "starting",
      progress: 0,
      currentStep: "Initializing trending topics detection...",
    });

    // Check for cached results first (30 minute cache)
    stream.next({
      status: "checking_cache",
      progress: 10,
      currentStep: "Checking for cached results...",
    });

    const cachedResult = await getCachedContent(cacheKey, 0.5);
    if (cachedResult) {
      stream.next({
        status: "using_cache",
        progress: 90,
        currentStep: "Using cached trending topics...",
      });

      console.log("Using cached trending topics result");
      const parsedResult = JSON.parse(cachedResult);
      await db.trendAnalysis.create({
        data: {
          userId: currentUserId,
          rawTrends: JSON.stringify(parsedResult),
          brandAnalysis: JSON.stringify({
            success: true,
            data: parsedResult,
            timestamp: new Date().toISOString(),
            cached: true,
          }),
          brandContext: "Real-time trending topics (cached)",
          industry: sanitizedCategory,
          targetAudience: sanitizedRegion,
          contentGoals: null,
          avoidTopics: null,
        },
      });

      stream.next({
        status: "completed",
        progress: 100,
        currentStep: "Completed! Cached trends loaded successfully.",
        result: parsedResult,
      });

      return stream.end();
    }

    // Use fallback function for when main request fails
    const fallbackTrends = async () => {
      stream.next({
        status: "using_fallback",
        progress: 80,
        currentStep: "Using fallback trending topics...",
      });
      return getFallbackTrendingTopics();
    };

    stream.next({
      status: "analyzing",
      progress: 20,
      currentStep: "Starting AI analysis of trending topics...",
    });

    // Use circuit breaker and retry logic with fallback
    const trendingResult = await executeWithCircuitBreaker(
      "trending-topics-detection",
      () =>
        withRetry(
          async () => {
            console.log("Starting trending topics detection with AI model");
            return await requestMultimodalModel({
              system: `You are a real-time trend detection specialist with access to web search tools. Your task is to identify the most current trending topics across social media platforms and search engines. Focus on trends that are happening RIGHT NOW and have viral potential. Be efficient and focus on the most impactful trends.`,
              messages: [
                {
                  role: "user",
                  content: createTrendingTopicsPrompt({
                    includeInstagram,
                    includeTikTok,
                    includeTwitter,
                    includeGoogle,
                    sanitizedRegion,
                    sanitizedCategory,
                    timeframe,
                  }),
                },
              ],
              returnType: z
                .object({
                  trendingTopics: z.array(
                    z.object({
                      topic: z.string(),
                      platforms: z.array(z.string()),
                      estimatedReach: z.string(),
                      context: z.string(),
                      viralPotentialScore: z.number().min(1).max(10),
                      contentAngles: z.array(z.string()),
                      demographics: z.string(),
                      timeSensitivity: z.string(),
                      sources: z.array(
                        z.object({
                          title: z.string(),
                          url: z.string(),
                          platform: z.string(),
                        }),
                      ),
                    }),
                  ),
                  lastUpdated: z.string(),
                  summary: z.string(),
                })
                .describe(
                  "Trending topics analysis with platform data and viral potential",
                ),
              model: "medium",
              temperature: 0.3,
              onProgress: (tools) => {
                stream.next({
                  toolHistory: tools.map((tool) => ({
                    name: tool.toolName,
                    status: tool.status,
                    inProgressMessage: tool.inProgressMessage,
                  })),
                  progress:
                    30 +
                    (tools.filter((t) => t.status === "done").length /
                      tools.length) *
                      50,
                  currentStep:
                    tools.find((t) => t.status === "in_progress")
                      ?.inProgressMessage || "Analyzing trends...",
                });
              },
            });
          },
          {
            maxAttempts: 2,
            baseDelay: 2000,
            maxDelay: 8000,
            backoffMultiplier: 2,
            retryableErrors: (error: any) => {
              const errorMessage = error?.message?.toLowerCase() || "";
              return (
                errorMessage.includes("timeout") ||
                errorMessage.includes("fetch failed") ||
                errorMessage.includes("network") ||
                errorMessage.includes("503") ||
                errorMessage.includes("502") ||
                errorMessage.includes("504")
              );
            },
          },
        ),
      fallbackTrends,
    );

    stream.next({
      status: "saving",
      progress: 85,
      currentStep: "Saving analysis results...",
    });

    // Cache successful results for 30 minutes
    await setCachedContent(cacheKey, JSON.stringify(trendingResult));

    // Store the results in the database for later retrieval
    await storeTrendingAnalysisResult({
      currentUserId,
      result: trendingResult,
      sanitizedRegion,
      sanitizedCategory,
      timeframe,
    });

    console.log(
      `Successfully detected ${trendingResult.trendingTopics?.length || 0} trending topics`,
    );

    stream.next({
      status: "completed",
      progress: 100,
      currentStep: `Successfully analyzed ${trendingResult.trendingTopics?.length || 0} trending topics!`,
      result: trendingResult,
    });

    return stream.end();
  } catch (error) {
    console.error("Error detecting real-time trending topics:", error);

    // Store error in database with more context
    await db.trendAnalysis.create({
      data: {
        userId: currentUserId,
        rawTrends: JSON.stringify({
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          errorType:
            error instanceof Error ? error.constructor.name : "UnknownError",
          timestamp: new Date().toISOString(),
          region: sanitizedRegion,
          category: sanitizedCategory,
          timeframe: timeframe,
        }),
        brandAnalysis: JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          errorType:
            error instanceof Error ? error.constructor.name : "UnknownError",
          timestamp: new Date().toISOString(),
          region: sanitizedRegion,
          category: sanitizedCategory,
          timeframe: timeframe,
        }),
        brandContext: "Real-time trending topics (error)",
        industry: sanitizedCategory,
        targetAudience: sanitizedRegion,
        contentGoals: null,
        avoidTopics: null,
      },
    });

    stream.next({
      status: "error",
      progress: 0,
      currentStep: "Error occurred during analysis",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });

    throw error; // Re-throw to mark as failed
  }
}

export async function getTrendingTopicsResults() {
  // Get cached trends for the current user
  const auth = await getAuth();
  const currentUserId =
    auth.status === "authenticated" ? auth.userId : "system";

  const trendAnalysis = await db.trendAnalysis.findFirst({
    where: { userId: currentUserId },
    orderBy: { createdAt: "desc" },
  });

  if (!trendAnalysis) {
    return {
      success: false,
      message: "No cached trends found. Click refresh to generate new trends.",
      data: null,
      lastUpdated: null,
      cached: false,
    };
  }

  try {
    const brandAnalysis = JSON.parse(trendAnalysis.brandAnalysis) as any;
    return {
      success: brandAnalysis.success || true,
      data: brandAnalysis.data || brandAnalysis,
      message: brandAnalysis.message || "Cached trends loaded successfully",
      lastUpdated: trendAnalysis.createdAt.toISOString(),
      cached: true,
    };
  } catch (error) {
    console.error("Error parsing trend analysis:", error);
    return {
      success: false,
      message:
        "Error loading cached trends. Click refresh to generate new trends.",
      data: null,
      lastUpdated: null,
      cached: false,
    };
  }
}

export async function getBrandFilteredTrendingTopics() {
  const { userId } = await getAuth({ required: true });

  try {
    // Get brand context for audience insights
    const brandContext = await getBrandContext();

    // Get the latest trending topics
    const trendingTopics = await getTrendingTopicsResults();

    if (!trendingTopics || !trendingTopics.success || !trendingTopics.data) {
      return trendingTopics;
    }

    // If no brand context, return original trends
    if (!brandContext) {
      return trendingTopics;
    }

    // Extract trending topics from the data structure
    const rawTopics = trendingTopics.data.trendingTopics || trendingTopics.data;
    if (!rawTopics || !Array.isArray(rawTopics)) {
      return trendingTopics;
    }

    // Filter and enhance trends with brand context and audience insights
    const brandFilteredResult = await requestMultimodalModel({
      system: `You are an expert brand strategist specializing in audience-driven trend analysis. Your task is to filter and enhance trending topics based on specific brand context and audience insights.

Focus on:
1. Audience alignment - how well each trend matches the target audience's interests, demographics, and behaviors
2. Brand relevance - how each trend aligns with brand values, personality, and content themes
3. Content opportunity - how the brand can authentically engage with each trend
4. Risk assessment - potential brand safety concerns or audience misalignment
5. Prioritization - ranking trends by their strategic value for this specific brand and audience

Only include trends that have strong audience alignment and brand relevance (minimum score 7/10). Enhance each trend with audience-specific insights and strategic recommendations.`,
      messages: [
        {
          role: "user",
          content: `Filter and enhance these trending topics for maximum brand and audience relevance:

BRAND CONTEXT:
Industry: ${brandContext.industry || "Not specified"}
Niche: ${brandContext.niche || "Not specified"}
Target Audience: ${JSON.stringify(brandContext.targetAudience) || "Not specified"}
Brand Personality: ${JSON.stringify(brandContext.brandPersonality) || "Not specified"}
Brand Values: ${JSON.stringify(brandContext.brandValues) || "Not specified"}
Content Themes: ${JSON.stringify(brandContext.contentThemes) || "Not specified"}
Risk Tolerance: ${brandContext.riskTolerance}
Trend Adoption Speed: ${brandContext.trendAdoptionSpeed}

RAW TRENDING TOPICS:
${JSON.stringify(rawTopics, null, 2)}

For each relevant trend (minimum relevance score 7/10), provide enhanced data with audience context.`,
        },
      ],
      returnType: z.object({
        trendingTopics: z.array(
          z.object({
            id: z.string(),
            topic: z.string(),
            audienceRelevanceScore: z.number().min(1).max(10),
            brandAlignmentScore: z.number().min(1).max(10),
            relevanceScore: z.number().min(1).max(10),
            executiveSummary: z.string(),
            audienceAlignment: z.object({
              demographicMatch: z.string(),
              interestAlignment: z.string(),
              behavioralFit: z.string(),
              engagementPrediction: z.string(),
            }),
            strategicAngle: z.string(),
            exampleHook: z.string(),
            samplePost: z.string(),
            contentFormatSuggestions: z.array(z.string()),
            audienceSpecificInsights: z.string(),
            riskAssessment: z.string(),
            timingRecommendations: z.string(),
            platforms: z.array(z.string()),
            sentiment: z.string(),
            historicalData: z.string(),
            sources: z
              .array(
                z.object({
                  title: z.string(),
                  url: z.string(),
                }),
              )
              .optional(),
          }),
        ),
        audienceInsights: z.object({
          overallTrendLandscape: z.string(),
          audienceOpportunities: z.array(z.string()),
          contentGaps: z.array(z.string()),
          strategicRecommendations: z.array(z.string()),
        }),
      }),
      model: "medium",
      temperature: 0.3,
    });

    // Store the enhanced analysis
    await db.trendAnalysis.create({
      data: {
        userId,
        rawTrends: JSON.stringify(trendingTopics),
        brandAnalysis: JSON.stringify({
          success: true,
          data: brandFilteredResult,
          message: "Brand-filtered trends generated successfully",
          brandFiltered: true,
        }),
        brandContext: JSON.stringify(brandContext),
        industry: brandContext.industry,
        targetAudience: JSON.stringify(brandContext.targetAudience),
        contentGoals: JSON.stringify(brandContext.contentThemes),
        avoidTopics: null,
      },
    });

    return {
      success: true,
      data: brandFilteredResult,
      message: "Brand-filtered trends loaded successfully",
      lastUpdated: new Date().toISOString(),
      cached: false,
      brandFiltered: true,
    };
  } catch (error) {
    console.error("Error getting brand filtered trending topics:", error);
    // Fallback to regular trending topics if brand filtering fails
    return await getTrendingTopicsResults();
  }
}

export async function getTikTokInstagramTrendsResults(taskId: string) {
  const trendAnalysis = await db.trendAnalysis.findUnique({
    where: { id: taskId },
  });

  if (!trendAnalysis) {
    return null;
  }

  try {
    const analysis = JSON.parse(trendAnalysis.brandAnalysis);
    return analysis;
  } catch (error) {
    console.error("Error parsing TikTok/Instagram trend analysis:", error);
    return null;
  }
}

export async function getTikTokInstagramBrandAnalysisResults(
  analysisId: string,
) {
  const trendAnalysis = await db.trendAnalysis.findUnique({
    where: { id: analysisId },
  });

  if (!trendAnalysis) {
    return null;
  }

  try {
    const analysis = JSON.parse(trendAnalysis.brandAnalysis);
    return analysis;
  } catch (error) {
    console.error("Error parsing TikTok/Instagram brand analysis:", error);
    return null;
  }
}

// Enhanced brand-context aware trending topics analysis
// Enhanced brand-specific trend analysis with TikTok/Instagram focus
export async function detectTikTokInstagramTrends(input: {
  region?: string;
  niche?: string;
  timeframe?: "1h" | "24h" | "7d";
}) {
  // Validate and sanitize input
  const validatedInput = validateTikTokInstagramInput(input);
  const { region, niche, timeframe } = validatedInput;
  const { userId } = await getAuth({ required: true });

  const task = await queueTask(async () => {
    try {
      // Use AI to search for TikTok and Instagram specific trends with circuit breaker protection
      const trendsResult = await executeWithCircuitBreaker(
        "tiktok-instagram-trends",
        async () =>
          await requestMultimodalModel({
            system: `You are a TikTok and Instagram trend detection specialist with deep knowledge of both platforms' algorithms, content formats, and viral mechanics. Your task is to identify the most current trending topics, hashtags, sounds, challenges, and content formats specifically on TikTok and Instagram.`,
            messages: [
              {
                role: "user",
                content: `Search for and identify the top trending content on TikTok and Instagram right now:

REGION: ${region}
NICHE: ${niche}
TIMEFRAME: ${timeframe}

For TikTok, focus on:
- Trending hashtags and challenges
- Viral sounds and music
- Popular content formats (dances, transitions, tutorials)
- Emerging creators and viral videos
- Platform-specific features being used

For Instagram, focus on:
- Trending hashtags and topics
- Popular Reels formats and trends
- Story trends and interactive features
- IGTV and video content trends
- Shopping and product trends
- Influencer collaborations

For each trend, provide:
1. Platform (TikTok, Instagram, or both)
2. Trend name/hashtag
3. Content format/type
4. Engagement metrics estimate
5. Viral potential score (1-10)
6. Target demographics
7. Brand safety level (high/medium/low)
8. Difficulty to execute (easy/medium/hard)
9. Time sensitivity
10. Related hashtags/sounds
11. Content examples or references
12. Cross-platform adaptation potential

Also identify trends that work well across both platforms.`,
              },
            ],
            returnType: z.object({
              tiktokTrends: z.array(
                z.object({
                  trendName: z.string(),
                  hashtags: z.array(z.string()),
                  contentFormat: z.string(),
                  viralSounds: z.array(z.string()).optional(),
                  engagementEstimate: z.string(),
                  viralPotentialScore: z.number().min(1).max(10),
                  demographics: z.string(),
                  brandSafety: z.enum(["high", "medium", "low"]),
                  executionDifficulty: z.enum(["easy", "medium", "hard"]),
                  timeSensitivity: z.string(),
                  contentExamples: z.array(z.string()),
                  crossPlatformPotential: z.number().min(1).max(10),
                }),
              ),
              instagramTrends: z.array(
                z.object({
                  trendName: z.string(),
                  hashtags: z.array(z.string()),
                  contentFormat: z.string(),
                  platform: z.enum([
                    "reels",
                    "stories",
                    "posts",
                    "igtv",
                    "shopping",
                  ]),
                  engagementEstimate: z.string(),
                  viralPotentialScore: z.number().min(1).max(10),
                  demographics: z.string(),
                  brandSafety: z.enum(["high", "medium", "low"]),
                  executionDifficulty: z.enum(["easy", "medium", "hard"]),
                  timeSensitivity: z.string(),
                  contentExamples: z.array(z.string()),
                  crossPlatformPotential: z.number().min(1).max(10),
                  shoppingIntegration: z.boolean().optional(),
                }),
              ),
              crossPlatformTrends: z.array(
                z.object({
                  trendName: z.string(),
                  platforms: z.array(z.string()),
                  adaptationStrategy: z.string(),
                  viralPotentialScore: z.number().min(1).max(10),
                  contentFormats: z.object({
                    tiktok: z.string(),
                    instagram: z.string(),
                  }),
                  hashtags: z.object({
                    tiktok: z.array(z.string()),
                    instagram: z.array(z.string()),
                  }),
                  demographics: z.string(),
                  brandSafety: z.enum(["high", "medium", "low"]),
                  timeSensitivity: z.string(),
                }),
              ),
              summary: z.string(),
              lastUpdated: z.string(),
              platformInsights: z.object({
                tiktok: z.object({
                  algorithmTips: z.array(z.string()),
                  bestPostingTimes: z.array(z.string()),
                  contentLengthRecommendations: z.string(),
                  engagementTactics: z.array(z.string()),
                }),
                instagram: z.object({
                  algorithmTips: z.array(z.string()),
                  bestPostingTimes: z.array(z.string()),
                  contentLengthRecommendations: z.string(),
                  engagementTactics: z.array(z.string()),
                  storyFeatures: z.array(z.string()),
                  shoppingFeatures: z.array(z.string()),
                }),
              }),
            }),
            model: "medium",
          }),
        // Fallback function for when circuit breaker is open
        async () => {
          console.log(
            "Circuit breaker open for TikTok/Instagram trends, using fallback data",
          );
          return {
            tiktokTrends: [
              {
                trendName: "General TikTok Trends",
                hashtags: ["#fyp", "#trending", "#viral"],
                contentFormat: "Short-form video",
                viralSounds: ["trending audio"],
                engagementEstimate: "High",
                viralPotentialScore: 7,
                demographics: "Gen Z, Millennials",
                brandSafety: "medium" as const,
                executionDifficulty: "easy" as const,
                timeSensitivity: "Current",
                contentExamples: ["Dance trends", "Comedy skits"],
                crossPlatformPotential: 8,
              },
            ],
            instagramTrends: [
              {
                trendName: "Instagram Reels Trends",
                hashtags: ["#reels", "#instagram", "#trending"],
                contentFormat: "Reels",
                platform: "reels" as const,
                engagementEstimate: "High",
                viralPotentialScore: 7,
                demographics: "Millennials, Gen Z",
                brandSafety: "high" as const,
                executionDifficulty: "easy" as const,
                timeSensitivity: "Current",
                contentExamples: ["Behind-the-scenes", "Tutorials"],
                crossPlatformPotential: 8,
                shoppingIntegration: false,
              },
            ],
            crossPlatformTrends: [
              {
                trendName: "Cross-Platform Content",
                platforms: ["TikTok", "Instagram"],
                adaptationStrategy: "Adapt content format for each platform",
                viralPotentialScore: 8,
                contentFormats: {
                  tiktok: "Short vertical video",
                  instagram: "Reels format",
                },
                hashtags: {
                  tiktok: ["#fyp", "#trending"],
                  instagram: ["#reels", "#trending"],
                },
                demographics: "Gen Z, Millennials",
                brandSafety: "high" as const,
                timeSensitivity: "Current",
              },
            ],
            summary:
              "Trends analysis temporarily unavailable. Using fallback data with general trending patterns.",
            lastUpdated: new Date().toISOString(),
            platformInsights: {
              tiktok: {
                algorithmTips: [
                  "Post consistently",
                  "Use trending sounds",
                  "Engage with comments",
                ],
                bestPostingTimes: ["6-10 AM", "7-9 PM"],
                contentLengthRecommendations: "15-60 seconds",
                engagementTactics: [
                  "Use trending hashtags",
                  "Create engaging hooks",
                ],
              },
              instagram: {
                algorithmTips: [
                  "Use relevant hashtags",
                  "Post at optimal times",
                  "Create engaging content",
                ],
                bestPostingTimes: ["11 AM-1 PM", "7-9 PM"],
                contentLengthRecommendations: "15-30 seconds for Reels",
                engagementTactics: [
                  "Use Instagram features",
                  "Engage with audience",
                ],
                storyFeatures: ["Polls", "Questions", "Stickers"],
                shoppingFeatures: ["Product tags", "Shopping stickers"],
              },
            },
          };
        },
      );

      // Store the results in the database
      await db.trendAnalysis.create({
        data: {
          userId,
          rawTrends: JSON.stringify(trendsResult),
          brandAnalysis: JSON.stringify({
            taskId: task.id,
            type: "tiktok_instagram_trends",
            timestamp: new Date().toISOString(),
          }),
          brandContext: `Region: ${region}, Niche: ${niche}, Timeframe: ${timeframe}`,
          industry: niche !== "all" ? niche : undefined,
        },
      });

      // Results are stored in database, no return needed
    } catch (error) {
      console.error("Error detecting TikTok/Instagram trends:", error);

      // Categorize error types for better handling
      let errorType = "UNKNOWN_ERROR";
      let shouldRetry = false;

      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          errorType = "RATE_LIMIT";
          shouldRetry = true;
        } else if (error.message.includes("timeout")) {
          errorType = "TIMEOUT";
          shouldRetry = true;
        } else if (
          error.message.includes("network") ||
          error.message.includes("connection")
        ) {
          errorType = "NETWORK_ERROR";
          shouldRetry = true;
        } else if (
          error.message.includes("capacity") ||
          error.message.includes("overloaded")
        ) {
          errorType = "SERVICE_OVERLOAD";
          shouldRetry = true;
        } else if (
          error.message.includes("validation") ||
          error.message.includes("invalid")
        ) {
          errorType = "VALIDATION_ERROR";
          shouldRetry = false;
        }
      }

      // Store the error in the database with enhanced metadata
      try {
        await db.trendAnalysis.create({
          data: {
            userId,
            rawTrends: JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
              errorType,
              shouldRetry,
              region,
              niche,
              timeframe,
            }),
            brandAnalysis: JSON.stringify({
              type: "tiktok_instagram_trends",
              status: "failed",
              timestamp: new Date().toISOString(),
              errorType,
              shouldRetry,
            }),
            brandContext: `Region: ${region}, Niche: ${niche}, Timeframe: ${timeframe}`,
            industry: niche !== "all" ? niche : undefined,
          },
        });
      } catch (dbError) {
        console.error("Failed to store error in database:", dbError);
      }

      // Error is stored in database, no need to throw
    }
  });

  return task;
}

export async function analyzeTikTokInstagramTrendsForBrand(input: {
  brandContext?: string;
  industry?: string;
  targetAudience?: string;
  contentGoals?: string[];
  avoidTopics?: string[];
  focusPlatform?: "tiktok" | "instagram" | "both";
  brandPersonality?: string;
  riskTolerance?: "low" | "medium" | "high";
}) {
  // Validate input parameters and get user ID
  const { userId } = await getAuth({ required: true });
  const validatedInput = validateBrandAnalysisInput(input);

  try {
    console.log(
      `Starting TikTok/Instagram trend analysis for brand, user: ${userId}`,
    );

    // Get brand context if not provided
    let brandContextData = validatedInput.brandContext;
    if (!brandContextData) {
      try {
        const brandContext = await getBrandContext();
        if (brandContext) {
          brandContextData = `Industry: ${brandContext.industry || "Not specified"}\nNiche: ${brandContext.niche || "Not specified"}\nTarget Audience: ${JSON.stringify(brandContext.targetAudience) || "Not specified"}\nBrand Personality: ${JSON.stringify(brandContext.brandPersonality) || "Not specified"}\nBrand Values: ${JSON.stringify(brandContext.brandValues) || "Not specified"}\nContent Themes: ${JSON.stringify(brandContext.contentThemes) || "Not specified"}\nRisk Tolerance: ${brandContext.riskTolerance}\nTrend Adoption Speed: ${brandContext.trendAdoptionSpeed}`;
        } else {
          brandContextData = "No brand context available";
          console.log("No brand context found, using default empty context");
        }
      } catch (contextError) {
        console.error("Error fetching brand context:", contextError);
        brandContextData =
          "Error fetching brand context, using default empty context";
      }
    }

    // Get platform-specific trends with enhanced retry
    console.log(
      `Detecting TikTok/Instagram trends for industry: ${input.industry || "all"}`,
    );

    let trendsTask;
    try {
      trendsTask = await withRetry(
        async () => {
          return await detectTikTokInstagramTrends({
            region: "US",
            niche: input.industry || "all",
            timeframe: "24h",
          });
        },
        {
          maxAttempts: 5, // Increased from 3
          baseDelay: 2000,
          backoffMultiplier: 2,
          retryableErrors: (error) => {
            // Enhanced error detection logic
            const defaultRetryCheck =
              DEFAULT_RETRY_OPTIONS.retryableErrors(error);

            // Also retry on specific LLM-related errors
            if (error?.message?.includes("rate limit")) return true;
            if (error?.message?.includes("timeout")) return true;
            if (error?.message?.includes("capacity")) return true;
            if (error?.message?.includes("overloaded")) return true;
            if (error?.message?.includes("temporary")) return true;

            return defaultRetryCheck;
          },
        },
      );

      console.log(
        `Successfully initiated trends detection task: ${trendsTask.id}`,
      );
    } catch (trendsError) {
      console.error(
        "Failed to initiate trends detection after multiple retries:",
        trendsError,
      );
      return {
        success: false,
        error: `Failed to initiate trends detection: ${trendsError instanceof Error ? trendsError.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Wait for the task to complete with enhanced error handling and progress tracking
    let trendsResult;
    let attempts = 0;
    const maxAttempts = 90; // Wait up to 7.5 minutes (increased from 5 minutes)
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5; // Increased from 3
    let lastStatusUpdate = 0;

    // Setup exponential backoff with jitter for polling
    const calculateBackoff = (attempt: number, baseMs = 5000, cap = 30000) => {
      // Exponential backoff with 25% jitter
      const expBackoff = Math.min(baseMs * Math.pow(1.5, attempt), cap);
      const jitter = expBackoff * 0.25 * Math.random();
      return Math.floor(expBackoff + jitter);
    };

    // Try to get cached results first (if available)
    try {
      const cachedResult = await getTikTokInstagramTrendsResults(trendsTask.id);
      if (cachedResult) {
        console.log(
          `Retrieved cached results results for task: ${trendsTask.id}`,
        );
        trendsResult = cachedResult;
      }
    } catch {
      // Silently handle cache miss
      console.log(`No cached results available for task: ${trendsTask.id}`);
    }

    // If we don't have results yet, poll for them
    while (!trendsResult && attempts < maxAttempts) {
      try {
        const taskStatus = await getTaskStatusInternal(trendsTask.id);
        consecutiveErrors = 0; // Reset error count on successful status check

        // Log status updates every 30 seconds to avoid excessive logging
        const now = Date.now();
        if (now - lastStatusUpdate > 30000) {
          console.log(
            `Task ${trendsTask.id} status: ${taskStatus.status} (attempt ${attempts + 1}/${maxAttempts})`,
          );
          lastStatusUpdate = now;
        }

        if (taskStatus.status === "COMPLETED") {
          console.log(
            `Task ${trendsTask.id} completed successfully, retrieving results`,
          );
          trendsResult = await getTikTokInstagramTrendsResults(trendsTask.id);

          if (!trendsResult) {
            console.error(
              `Task completed but no results found for task: ${trendsTask.id}`,
            );
            throw new Error("Task completed but no results found");
          }

          break;
        } else if (taskStatus.status === "FAILED") {
          console.error(
            `Task ${trendsTask.id} failed with error: ${taskStatus.error}`,
          );
          throw new Error(
            taskStatus.error || "Failed to fetch TikTok/Instagram trends",
          );
        } else if (taskStatus.status === "UNKNOWN") {
          console.error(`Task ${trendsTask.id} not found or expired`);
          throw new Error("Task not found or expired");
        }

        // Use exponential backoff with jitter for polling
        const waitTime = calculateBackoff(attempts);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        attempts++;
      } catch (error) {
        consecutiveErrors++;
        console.error(
          `Error checking task status (attempt ${consecutiveErrors}/${maxConsecutiveErrors}):`,
          error,
        );

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(
            `Exceeded maximum consecutive errors (${maxConsecutiveErrors})`,
          );
          throw new Error(
            `Failed to check task status after ${maxConsecutiveErrors} consecutive attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }

        // Wait longer before retrying after an error, with exponential backoff
        const waitTime = calculateBackoff(consecutiveErrors, 10000, 60000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        attempts++;
      }
    }

    // Handle timeout case
    if (attempts >= maxAttempts && !trendsResult) {
      console.error(
        `Timed out waiting for trends task ${trendsTask.id} to complete after ${maxAttempts} attempts`,
      );
      throw new Error(
        "Timed out waiting for TikTok/Instagram trends analysis to complete",
      );
    }

    // Validate results
    if (!trendsResult || !trendsResult.success) {
      console.error(
        `Invalid or unsuccessful trends result for task ${trendsTask.id}:`,
        trendsResult,
      );
      throw new Error(
        "Failed to fetch TikTok/Instagram trends - received invalid or unsuccessful result",
      );
    }

    // Check if we have the expected data structure
    if (
      !trendsResult.data ||
      !trendsResult.data.trendingTopics ||
      !Array.isArray(trendsResult.data.trendingTopics)
    ) {
      console.error(
        `Missing expected data structure in trends result for task ${trendsTask.id}:`,
        trendsResult,
      );
      throw new Error(
        "Failed to fetch TikTok/Instagram trends - missing expected data structure",
      );
    }

    console.log(
      `Successfully retrieved trends data with ${trendsResult.data.trendingTopics.length} trending topics`,
    );

    // Analyze trends specifically for this brand with platform focus
    console.log(
      `Starting brand analysis for trends with focus platform: ${input.focusPlatform || "both"}`,
    );

    let brandAnalysisResult;
    try {
      brandAnalysisResult = await withRetry(
        async () => {
          return await intelligentRequestMultimodalModel({
            system: `You are an expert TikTok and Instagram strategist specializing in viral content creation and platform-specific trend adaptation. Your expertise includes understanding platform algorithms, content formats, viral mechanics, and brand safety considerations for both platforms.`,
            taskType: "brand_analysis",
            messages: [
              {
                role: "user",
                content: `Analyze these TikTok and Instagram trends for brand relevance and create a comprehensive strategy:

BRAND CONTEXT:
${brandContextData}

INDUSTRY: ${validatedInput.industry || "Not specified"}
TARGET AUDIENCE: ${validatedInput.targetAudience || "Not specified"}
CONTENT GOALS: ${validatedInput.contentGoals.join(", ") || "Not specified"}
TOPICS TO AVOID: ${validatedInput.avoidTopics.join(", ") || "None specified"}
FOCUS PLATFORM: ${input.focusPlatform || "both"}
BRAND PERSONALITY: ${input.brandPersonality || "Not specified"}
RISK TOLERANCE: ${input.riskTolerance || "medium"}

TIKTOK TRENDS:
${JSON.stringify(
  trendsResult.data.trendingTopics.filter((t: any) =>
    t.platforms.includes("TikTok"),
  ),
  null,
  2,
)}

INSTAGRAM TRENDS:
${JSON.stringify(
  trendsResult.data.trendingTopics.filter((t: any) =>
    t.platforms.includes("Instagram"),
  ),
  null,
  2,
)}

CROSS-PLATFORM TRENDS:
${JSON.stringify(
  trendsResult.data.trendingTopics.filter((t: any) => t.platforms.length > 1),
  null,
  2,
)}

For each relevant trend, provide:
1. Platform-specific relevance score (1-10)
2. Adaptation strategy for the brand
3. Content format recommendations
4. Hashtag strategy
5. Timing and posting schedule
6. Creative execution ideas
7. Risk assessment and brand safety
8. Expected performance metrics
9. Budget considerations
10. Influencer collaboration opportunities
11. User-generated content potential
12. Cross-platform amplification strategy

Only include trends that score 6+ on relevance for the brand.`,
              },
            ],
            returnType: z.object({
              tiktokStrategy: z.object({
                relevantTrends: z.array(
                  z.object({
                    trendName: z.string(),
                    relevanceScore: z.number().min(1).max(10),
                    adaptationStrategy: z.string(),
                    contentFormats: z.array(z.string()),
                    hashtagStrategy: z.array(z.string()),
                    timingRecommendations: z.string(),
                    creativeIdeas: z.array(z.string()),
                    riskAssessment: z.string(),
                    expectedMetrics: z.string(),
                    budgetConsiderations: z.string(),
                    influencerOpportunities: z.array(z.string()),
                    ugcPotential: z.string(),
                  }),
                ),
                overallStrategy: z.string(),
                algorithmOptimization: z.string(),
                contentCalendar: z.string(),
              }),
              instagramStrategy: z.object({
                relevantTrends: z.array(
                  z.object({
                    trendName: z.string(),
                    relevanceScore: z.number().min(1).max(10),
                    adaptationStrategy: z.string(),
                    contentFormats: z.array(z.string()),
                    hashtagStrategy: z.array(z.string()),
                    timingRecommendations: z.string(),
                    creativeIdeas: z.array(z.string()),
                    riskAssessment: z.string(),
                    expectedMetrics: z.string(),
                    budgetConsiderations: z.string(),
                    influencerOpportunities: z.array(z.string()),
                    ugcPotential: z.string(),
                    storyIntegration: z.string(),
                    shoppingIntegration: z.string().optional(),
                  }),
                ),
                overallStrategy: z.string(),
                algorithmOptimization: z.string(),
                contentCalendar: z.string(),
              }),
              crossPlatformStrategy: z.object({
                synergies: z.array(z.string()),
                adaptationPlan: z.string(),
                amplificationStrategy: z.string(),
                resourceAllocation: z.string(),
              }),
              actionPlan: z.object({
                immediateActions: z.array(z.string()),
                weeklyPlan: z.array(z.string()),
                monthlyGoals: z.array(z.string()),
                kpis: z.array(z.string()),
                riskMitigation: z.array(z.string()),
              }),
            }),
            model: "medium",
          });
        },
        {
          maxAttempts: 5, // Increased from 3
          baseDelay: 2000,
          backoffMultiplier: 2,
          maxDelay: 60000, // Cap at 1 minute
          retryableErrors: (error) => {
            // Enhanced error detection logic
            const defaultRetryCheck =
              DEFAULT_RETRY_OPTIONS.retryableErrors(error);

            // Also retry on specific AI-related errors
            if (error?.message?.includes("rate limit")) return true;
            if (error?.message?.includes("timeout")) return true;
            if (error?.message?.includes("capacity")) return true;
            if (error?.message?.includes("overloaded")) return true;
            if (error?.message?.includes("temporary")) return true;
            if (error?.message?.includes("retry")) return true;

            return defaultRetryCheck;
          },
        },
      );

      console.log("Successfully completed brand analysis");
    } catch (analysisError) {
      console.error(
        "Failed to complete brand analysis after multiple retries:",
        analysisError,
      );

      // Try to return partial results if trends data is available
      if (trendsResult && trendsResult.success) {
        return {
          success: false,
          error: `Brand analysis failed but trends data is available: ${analysisError instanceof Error ? analysisError.message : "Unknown error"}`,
          rawTrends: trendsResult,
          timestamp: new Date().toISOString(),
        };
      }

      throw analysisError;
    }

    // Store the analysis with error handling
    const analysisId = nanoid();

    try {
      await db.trendAnalysis.create({
        data: {
          id: analysisId,
          userId: userId,
          rawTrends: JSON.stringify(trendsResult),
          brandAnalysis: JSON.stringify(brandAnalysisResult),
          brandContext: brandContextData,
          industry: input.industry,
          targetAudience: input.targetAudience,
          contentGoals: input.contentGoals?.join(","),
          avoidTopics: input.avoidTopics?.join(","),
          createdAt: new Date(),
        },
      });

      console.log(`Successfully stored trend analysis with ID: ${analysisId}`);
    } catch (dbError) {
      console.error(`Failed to store trend analysis in database:`, dbError);
      // Continue execution - we can still return results even if DB storage fails
    }

    return {
      success: true,
      analysisId,
      rawTrends: trendsResult,
      brandAnalysis: brandAnalysisResult,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error analyzing TikTok/Instagram trends for brand:", error);

    // Check if this is a timeout error
    const isTimeout =
      error instanceof Error &&
      (error.message.includes("timeout") ||
        error.message.includes("timed out"));

    // Detailed error response with specific error type
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      errorType: isTimeout ? "TIMEOUT" : "PROCESSING_ERROR",
      timestamp: new Date().toISOString(),
      // Include any partial results if available
      partialResults: false,
    };
  }
}

// Intelligent trend-to-brand matching algorithm
export async function intelligentTrendBrandMatcher(input: {
  trends: any[];
  brandContext: any;
  industry?: string;
  targetAudience?: string;
  contentGoals?: string[];
  avoidTopics?: string[];
  riskTolerance?: "low" | "medium" | "high";
  trendAdoptionSpeed?: "early" | "mainstream" | "late";
  competitorAnalysis?: boolean;
}) {
  const {
    trends,
    brandContext,
    industry,
    targetAudience,
    contentGoals = [],
    avoidTopics = [],
    riskTolerance = "medium",
    trendAdoptionSpeed = "mainstream",
    competitorAnalysis = false,
  } = input;

  try {
    // Advanced brand-trend matching using AI with intelligent model selection
    const matchingResult = await intelligentRequestMultimodalModel({
      system: `You are an advanced AI brand strategist with expertise in trend analysis, consumer psychology, and viral marketing. Your task is to create sophisticated matches between trending topics and brands using multi-dimensional analysis.

Your analysis should consider:
1. Brand DNA alignment (values, personality, voice)
2. Audience psychographics and behaviors
3. Content format optimization
4. Timing and lifecycle analysis
5. Risk-reward assessment
6. Competitive landscape positioning
7. Cross-platform amplification potential
8. Long-term brand equity impact
9. ROI prediction
10. Viral mechanics and shareability factors`,
      messages: [
        {
          role: "user",
          content: `Perform advanced trend-to-brand matching analysis:

BRAND CONTEXT:
${JSON.stringify(brandContext, null, 2)}

BRAND PARAMETERS:
Industry: ${industry || "Not specified"}
Target Audience: ${targetAudience || "Not specified"}
Content Goals: ${contentGoals.join(", ") || "Not specified"}
Topics to Avoid: ${avoidTopics.join(", ") || "None"}
Risk Tolerance: ${riskTolerance}
Trend Adoption Speed: ${trendAdoptionSpeed}
Competitor Analysis: ${competitorAnalysis ? "Enabled" : "Disabled"}

TRENDING TOPICS:
${JSON.stringify(trends, null, 2)}

For each trend, provide a comprehensive analysis including:

1. BRAND ALIGNMENT SCORE (1-10)
   - Brand values alignment
   - Voice and personality fit
   - Audience overlap
   - Content theme compatibility

2. OPPORTUNITY ASSESSMENT
   - Market gap identification
   - Competitive advantage potential
   - Audience engagement prediction
   - Viral amplification factors

3. EXECUTION STRATEGY
   - Content format recommendations
   - Platform-specific adaptations
   - Timing and frequency
   - Creative execution angles

4. RISK ANALYSIS
   - Brand safety assessment
   - Potential backlash scenarios
   - Mitigation strategies
   - Exit strategies

5. SUCCESS METRICS
   - KPI predictions
   - ROI estimates
   - Engagement forecasts
   - Brand impact assessment

6. COMPETITIVE INTELLIGENCE
   - Competitor activity analysis
   - Differentiation opportunities
   - Market positioning advantages
   - First-mover benefits

Only include trends with alignment scores of 6+ and provide actionable insights.`,
        },
      ],
      returnType: z
        .object({
          matchedTrends: z.array(
            z.object({
              trendId: z.string(),
              trendName: z.string(),
              brandAlignmentScore: z.number().min(1).max(10),
              brandAlignment: z.object({
                valuesAlignment: z.number().min(1).max(10),
                voicePersonalityFit: z.number().min(1).max(10),
                audienceOverlap: z.number().min(1).max(10),
                contentThemeCompatibility: z.number().min(1).max(10),
              }),
              opportunityAssessment: z.object({
                marketGap: z.string(),
                competitiveAdvantage: z.string(),
                engagementPrediction: z.string(),
                viralAmplificationFactors: z.array(z.string()),
              }),
              executionStrategy: z.object({
                contentFormats: z.array(z.string()),
                platformAdaptations: z.object({
                  instagram: z.string().optional(),
                  tiktok: z.string().optional(),
                  twitter: z.string().optional(),
                  facebook: z.string().optional(),
                  linkedin: z.string().optional(),
                  youtube: z.string().optional(),
                }),
                timingFrequency: z.string(),
                creativeAngles: z.array(z.string()),
              }),
              riskAnalysis: z.object({
                brandSafetyScore: z.number().min(1).max(10),
                potentialBacklash: z.array(z.string()),
                mitigationStrategies: z.array(z.string()),
                exitStrategies: z.array(z.string()),
              }),
              successMetrics: z.object({
                kpiPredictions: z.array(z.string()),
                roiEstimate: z.string(),
                engagementForecast: z.string(),
                brandImpactAssessment: z.string(),
              }),
              competitiveIntelligence: z.object({
                competitorActivity: z.string(),
                differentiationOpportunities: z.array(z.string()),
                marketPositioningAdvantages: z.array(z.string()),
                firstMoverBenefits: z.string(),
              }),
              priority: z.enum(["high", "medium", "low"]),
              timeToMarket: z.string(),
              resourceRequirements: z.string(),
            }),
          ),
          overallStrategy: z.object({
            priorityMatrix: z.array(
              z.object({
                trendName: z.string(),
                priority: z.enum(["high", "medium", "low"]),
                reasoning: z.string(),
              }),
            ),
            resourceAllocation: z.string(),
            timelineRecommendations: z.string(),
            crossTrendSynergies: z.array(z.string()),
            longTermBrandStrategy: z.string(),
          }),
          actionPlan: z.object({
            immediate: z.array(z.string()),
            shortTerm: z.array(z.string()),
            longTerm: z.array(z.string()),
            contingencyPlans: z.array(z.string()),
          }),
          insights: z.object({
            trendLandscapeAnalysis: z.string(),
            brandPositioningOpportunities: z.array(z.string()),
            audienceEvolutionPredictions: z.string(),
            emergingOpportunities: z.array(z.string()),
          }),
        })
        .describe("A comprehensive brand-trend matching analysis result."),
      // Model selection is now handled intelligently by intelligentRequestMultimodalModel
    });

    return {
      success: true,
      data: matchingResult,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in intelligent trend-brand matching:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };
  }
}

export async function analyzeRealTimeTrendsForBrand(input: {
  brandContext?: string;
  industry?: string;
  targetAudience?: string;
  contentGoals?: string[];
  avoidTopics?: string[];
}) {
  // Validate and sanitize all input parameters
  const validatedInput = validateBrandAnalysisInput(input);
  const { userId } = await getAuth({ required: true });

  try {
    // Get brand context if not provided
    let brandContextData = validatedInput.brandContext;
    if (!brandContextData) {
      const brandContext = await getBrandContext();
      if (brandContext) {
        // Create a summary of the brand context
        brandContextData = `Industry: ${brandContext.industry || "Not specified"}\nNiche: ${brandContext.niche || "Not specified"}\nTarget Audience: ${JSON.stringify(brandContext.targetAudience) || "Not specified"}\nBrand Personality: ${JSON.stringify(brandContext.brandPersonality) || "Not specified"}\nBrand Values: ${JSON.stringify(brandContext.brandValues) || "Not specified"}\nContent Themes: ${JSON.stringify(brandContext.contentThemes) || "Not specified"}\nRisk Tolerance: ${brandContext.riskTolerance}\nTrend Adoption Speed: ${brandContext.trendAdoptionSpeed}`;
      } else {
        brandContextData = "No brand context available";
      }
    }

    // Get real-time trends
    const trendsResult = await detectRealTimeTrendingTopics();

    if (trendsResult.status !== "COMPLETED") {
      throw new Error("Failed to fetch trending topics");
    }

    // Get the stored results
    const storedResults = await getTrendingTopicsResults();
    if (!storedResults) {
      throw new Error("No trending topics data found");
    }

    // Analyze trends specifically for this brand
    const brandAnalysisResult = await requestMultimodalModel({
      system: `You are an expert brand strategist specializing in trend analysis and viral content strategy. Your task is to analyze current trending topics and identify the best opportunities for a specific brand to leverage these trends.`,
      messages: [
        {
          role: "user",
          content: `Analyze these real-time trending topics for brand relevance and opportunity:

BRAND CONTEXT:
${brandContextData}

INDUSTRY: ${input.industry || "Not specified"}
TARGET AUDIENCE: ${input.targetAudience || "Not specified"}
CONTENT GOALS: ${input.contentGoals?.join(", ") || "Not specified"}
TOPICS TO AVOID: ${input.avoidTopics?.join(", ") || "None specified"}

TRENDING TOPICS:
${JSON.stringify(storedResults, null, 2)}

For each relevant trending topic, provide:
1. Relevance score for this brand (1-10)
2. Strategic approach for the brand to engage with this trend
3. Specific content ideas that align with brand voice
4. Timing recommendations (when to post)
5. Platform-specific strategies
6. Risk assessment (potential downsides)
7. Expected engagement potential
8. Call-to-action suggestions

Only include trends that score 6+ on relevance.`,
        },
      ],
      returnType: z.object({
        brandRelevantTrends: z.array(
          z.object({
            originalTopic: z.string(),
            relevanceScore: z.number().min(1).max(10),
            strategicApproach: z.string(),
            contentIdeas: z.array(z.string()),
            timingRecommendations: z.string(),
            platformStrategies: z.object({
              instagram: z.string().optional(),
              tiktok: z.string().optional(),
              twitter: z.string().optional(),
              facebook: z.string().optional(),
              linkedin: z.string().optional(),
            }),
            riskAssessment: z.string(),
            engagementPotential: z.string(),
            callToActionSuggestions: z.array(z.string()),
          }),
        ),
        overallStrategy: z.string(),
        priorityActions: z.array(z.string()),
        timelineRecommendations: z.string(),
      }),
      model: "medium",
    });

    // Store the analysis for future reference
    const analysisId = nanoid();
    await db.trendAnalysis.create({
      data: {
        id: analysisId,
        userId,
        rawTrends: JSON.stringify(trendsResult),
        brandAnalysis: JSON.stringify(brandAnalysisResult),
        brandContext: brandContextData,
        industry: validatedInput.industry,
        targetAudience: validatedInput.targetAudience,
        contentGoals: validatedInput.contentGoals.join(","),
        avoidTopics: validatedInput.avoidTopics.join(","),
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      analysisId,
      rawTrends: JSON.stringify(trendsResult),
      brandAnalysis: brandAnalysisResult,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error analyzing real-time trends for brand:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };
  }
}

// Get stored trend analyses
export async function getTrendAnalysisHistory(input?: {
  limit?: number;
  offset?: number;
}) {
  const { userId } = await getAuth({ required: true });
  const { limit = 10, offset = 0 } = input || {};

  const analyses = await db.trendAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      industry: true,
      targetAudience: true,
      contentGoals: true,
      createdAt: true,
      brandAnalysis: true,
    },
  });

  return analyses.map((analysis) => ({
    ...analysis,
    brandAnalysis: analysis.brandAnalysis
      ? JSON.parse(analysis.brandAnalysis)
      : null,
  }));
}

export async function _analyzeExistingComments() {
  const { userId } = await getAuth({ required: true });

  const commentsToAnalyze = await db.comment.findMany({
    where: {
      userId,
      aiAnalyzed: false,
    },
    take: 50, // Process in batches to avoid timeouts
  });

  if (commentsToAnalyze.length === 0) {
    return { message: "No unanalyzed comments found." };
  }

  let analyzedCount = 0;
  const batchSize = 10; // Increased batch size since we're using optimized batch analysis

  for (let i = 0; i < commentsToAnalyze.length; i += batchSize) {
    const batch = commentsToAnalyze.slice(i, i + batchSize);

    try {
      // Use optimized batch analysis
      const batchAnalyses = await analyzeSentimentBatch(
        batch.map((comment) => ({ id: comment.id, text: comment.text })),
      );

      // Update all comments in the batch
      const updatePromises = batch.map(async (comment) => {
        const analysis = batchAnalyses[comment.id];
        if (analysis) {
          try {
            await db.comment.update({
              where: { id: comment.id },
              data: {
                sentiment: analysis.sentiment,
                topics: JSON.stringify(analysis.topics),
                priority: analysis.priority,
                aiAnalyzed: true,
                aiAnalyzedAt: new Date(),
              },
            });
            analyzedCount++;
          } catch (error) {
            console.error(`Failed to update comment ${comment.id}:`, error);
          }
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error(`Failed to analyze batch starting at index ${i}:`, error);

      // Fallback to individual analysis for this batch
      for (const comment of batch) {
        try {
          const analysis = await analyzeSentiment(comment.text);
          await db.comment.update({
            where: { id: comment.id },
            data: {
              sentiment: analysis.sentiment,
              topics: JSON.stringify(analysis.topics),
              priority: analysis.priority,
              aiAnalyzed: true,
              aiAnalyzedAt: new Date(),
            },
          });
          analyzedCount++;
        } catch (individualError) {
          console.error(
            `Failed to analyze comment ${comment.id}:`,
            individualError,
          );
        }
      }
    }

    // Optional: add a small delay between batches to be nice to the API
    if (i + batchSize < commentsToAnalyze.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced delay since batching is more efficient
    }
  }

  return {
    message: `Successfully analyzed ${analyzedCount} out of ${commentsToAnalyze.length} comments. Run again to process more if any remain.`,
  };
}

// User authentication
export async function getCurrentUser() {
  const auth = await getAuth();
  if (auth.status !== "authenticated") {
    return null;
  }

  let user = await db.user.findUnique({
    where: { id: auth.userId },
    include: {
      accounts: true,
    },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        id: auth.userId,
      },
      include: {
        accounts: true,
      },
    });
  }

  return user;
}

export async function checkSuperAdminStatus() {
  const { userId } = await getAuth({ required: true });

  // Get user from database to check email
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  const isSuperAdminEmail = userRecord?.email === "metamarketers23@gmail.com";

  if (isSuperAdminEmail) {
    // Update user to superadmin if not already
    await db.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userRecord?.email || "",
        name: userRecord?.name || "",
        handle: userRecord?.handle || "",
        isSuperAdmin: true,
      },
      update: {
        email: userRecord?.email || "",
        name: userRecord?.name || "",
        handle: userRecord?.handle || "",
        isSuperAdmin: true,
      },
    });
    return true;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  return user?.isSuperAdmin || false;
}

// OAuth Configuration
export async function getFacebookOAuthUrl(input: {
  platform: "facebook" | "instagram";
}) {
  const { userId } = await getAuth({ required: true });

  // Generate a state parameter to prevent CSRF attacks
  const state = nanoid();

  // Store the state in the database to verify it when the user is redirected back
  await db.oAuthState.create({
    data: {
      userId,
      state,
      platform: input.platform,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes
    },
  });

  // Get your Facebook App credentials from environment variables
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    // Instead of throwing an error, return a specific response that the UI can handle
    return {
      missingCredentials: true,
      message: "Facebook App ID is not configured",
    };
  }

  // Construct the redirect URI - using a route that exists in our app
  const redirectUri = `${getBaseUrl()}/settings?platform=${input.platform}`;

  // Construct the Facebook OAuth URL
  const url = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  url.searchParams.append("client_id", appId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);

  let scope =
    "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata";
  if (input.platform === "instagram") {
    scope += ",instagram_basic,instagram_manage_comments";
  }

  url.searchParams.append("scope", scope);

  return { url: url.toString() };
}

// Twitter OAuth Configuration
export async function getTwitterOAuthUrl() {
  const { userId } = await getAuth({ required: true });

  // Generate a state parameter to prevent CSRF attacks
  const state = nanoid();

  // Store the state in the database to verify it when the user is redirected back
  await db.oAuthState.create({
    data: {
      userId,
      state,
      platform: "twitter",
      expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes
    },
  });

  // Get Twitter API credentials from environment variables
  const apiKey = process.env.TWITTER_API_KEY;
  const redirectUri = `${getBaseUrl()}/settings?platform=twitter`;

  if (!apiKey) {
    // Return a specific response that the UI can handle
    return {
      missingCredentials: true,
      message: "Twitter API Key is not configured",
    };
  }

  // Construct the Twitter OAuth URL (Twitter OAuth 2.0)
  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", apiKey);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", "tweet.read users.read tweet.write");
  url.searchParams.append("state", state);
  url.searchParams.append("code_challenge", "challenge"); // In a real app, generate a proper code challenge
  url.searchParams.append("code_challenge_method", "plain");

  return { url: url.toString() };
}

// YouTube OAuth Configuration
export async function getYouTubeOAuthUrl() {
  const { userId } = await getAuth({ required: true });

  // Generate a state parameter to prevent CSRF attacks
  const state = nanoid();

  // Store the state in the database to verify it when the user is redirected back
  await db.oAuthState.create({
    data: {
      userId,
      state,
      platform: "youtube",
      expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes
    },
  });

  // Get YouTube/Google API credentials from environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${getBaseUrl()}/settings?platform=youtube`;

  if (!clientId) {
    // Return a specific response that the UI can handle
    return {
      missingCredentials: true,
      message: "Google Client ID is not configured",
    };
  }

  // Construct the Google OAuth URL for YouTube API access
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("response_type", "code");
  url.searchParams.append(
    "scope",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  );
  url.searchParams.append("access_type", "offline");
  url.searchParams.append("state", state);
  url.searchParams.append("include_granted_scopes", "true");
  url.searchParams.append("prompt", "consent"); // Force consent screen to ensure we get a refresh token

  return { url: url.toString() };
}

export async function handleTwitterOAuthCallback(input: {
  code: string;
  state: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Verify the state parameter to prevent CSRF attacks
  const storedState = await db.oAuthState.findFirst({
    where: {
      userId,
      state: input.state,
      platform: "twitter",
      expiresAt: { gt: new Date() },
    },
  });

  if (!storedState) {
    throw new Error("Invalid or expired OAuth state");
  }

  // Clean up the used state
  await db.oAuthState.delete({
    where: { id: storedState.id },
  });

  // Get Twitter API credentials from environment variables
  const apiKey = process.env.TWITTER_API_KEY;
  const apiKeySecret = process.env.TWITTER_API_KEY_SECRET;

  if (!apiKey || !apiKeySecret) {
    return {
      missingCredentials: true,
      message: "Twitter API credentials are not configured",
    };
  }

  // Construct the redirect URI (must match the one used in the authorization request)
  const redirectUri = `${getBaseUrl()}/settings?platform=twitter`;

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      new URLSearchParams({
        code: input.code,
        grant_type: "authorization_code",
        client_id: apiKey,
        redirect_uri: redirectUri,
        code_verifier: "challenge", // In a real app, this should match the code_challenge
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiKeySecret}`).toString("base64")}`,
        },
      },
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user info from Twitter
    const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const { data: userData } = userResponse.data;
    const { id: accountId, name } = userData;

    // Create or update the account
    const account = await db.account.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: "twitter",
          accountId,
        },
      },
      update: {
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        userId,
        platform: "twitter",
        accountId,
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    return { success: true, account };
  } catch (error) {
    console.error("Error handling Twitter OAuth callback:", error);

    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(
        `Twitter API error: ${JSON.stringify(error.response.data)}`,
      );
    }

    throw new Error("Failed to connect Twitter account. Please try again.");
  }
}

export async function handleYouTubeOAuthCallback(input: {
  code: string;
  state: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Verify the state parameter to prevent CSRF attacks
  const storedState = await db.oAuthState.findFirst({
    where: {
      userId,
      state: input.state,
      platform: "youtube",
      expiresAt: { gt: new Date() },
    },
  });

  if (!storedState) {
    throw new Error("Invalid or expired OAuth state");
  }

  // Clean up the used state
  await db.oAuthState.delete({
    where: { id: storedState.id },
  });

  // Get Google API credentials from environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      missingCredentials: true,
      message: "Google API credentials are not configured",
    };
  }

  // Construct the redirect URI (must match the one used in the authorization request)
  const redirectUri = `${getBaseUrl()}/settings?platform=youtube`;

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code: input.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user info from YouTube/Google
    const userResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        params: {
          part: "snippet",
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    if (!userResponse.data.items || userResponse.data.items.length === 0) {
      throw new Error("Could not retrieve YouTube channel information");
    }

    const channel = userResponse.data.items[0];
    const accountId = channel.id;
    const name = channel.snippet.title;

    // Create or update the account
    const account = await db.account.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: "youtube",
          accountId,
        },
      },
      update: {
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        userId,
        platform: "youtube",
        accountId,
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    return { success: true, account };
  } catch (error) {
    console.error("Error handling YouTube OAuth callback:", error);

    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(
        `Google API error: ${JSON.stringify(error.response.data.error || error.response.data)}`,
      );
    }

    throw new Error("Failed to connect YouTube account. Please try again.");
  }
}

export async function handleFacebookOAuthCallback(input: {
  code: string;
  state: string;
  selectedPageIds?: string[];
  platform: "facebook" | "instagram";
}) {
  const { userId } = await getAuth({ required: true });

  // Verify the state parameter to prevent CSRF attacks
  const storedState = await db.oAuthState.findFirst({
    where: {
      userId,
      state: input.state,
      platform: input.platform,
      expiresAt: { gt: new Date() },
    },
  });

  if (!storedState) {
    throw new Error("Invalid or expired OAuth state");
  }

  // Clean up the used state
  await db.oAuthState.delete({
    where: { id: storedState.id },
  });

  // Get your Facebook App credentials from environment variables
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Facebook App credentials are not configured");
  }

  // Construct the redirect URI (must match the one used in the authorization request)
  const redirectUri = `${getBaseUrl()}/settings?platform=${input.platform}`;

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: input.code,
        },
      },
    );

    // Extract access token and optional expires_in from the response
    const { access_token } = tokenResponse.data;
    const expires_in = tokenResponse.data.expires_in || null;

    // Use the access token to get user info
    const userResponse = await axios.get(
      "https://graph.facebook.com/v18.0/me",
      {
        params: {
          fields: "id,name",
          access_token,
        },
      },
    );

    const { id: accountId, name } = userResponse.data;

    // Get pages the user manages
    const pagesResponse = await axios.get(
      "https://graph.facebook.com/v18.0/me/accounts",
      {
        params: {
          access_token,
        },
      },
    );

    const pages = pagesResponse.data.data || [];

    // Create or update the Facebook account
    const account = await db.account.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: input.platform,
          accountId,
        },
      },
      update: {
        name,
        accessToken: access_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        // Keep legacy fields for backward compatibility
        pageId: pages.length > 0 ? pages[0].id : null,
        pageToken: pages.length > 0 ? pages[0].access_token : null,
      },
      create: {
        userId,
        platform: input.platform,
        accountId,
        name,
        accessToken: access_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        // Set legacy fields for backward compatibility
        pageId: pages.length > 0 ? pages[0].id : null,
        pageToken: pages.length > 0 ? pages[0].access_token : null,
      },
    });

    // If no pages found
    if (pages.length === 0) {
      return {
        success: true,
        account,
        warning:
          "No Facebook pages found. Some features may be limited. Please create a Facebook page to use all features.",
      };
    }

    // If pages found but no selectedPageIds provided, return available pages for selection
    if (!input.selectedPageIds || input.selectedPageIds.length === 0) {
      return {
        success: true,
        account,
        availablePages: pages.map((page) => ({
          id: page.id,
          name: page.name,
        })),
        needsPageSelection: true,
      };
    }

    // If selectedPageIds provided, connect those pages
    // Filter pages based on selectedPageIds
    const selectedPages = pages.filter((page) =>
      input.selectedPageIds?.includes(page.id),
    );

    if (selectedPages.length === 0) {
      return {
        warning: "None of the selected pages were found. Please try again.",
      };
    }

    // Clear existing pages first to avoid duplicates
    await db.page.deleteMany({
      where: { accountId: account.id },
    });

    // Add selected pages to the database
    for (const page of selectedPages) {
      await db.page.create({
        data: {
          accountId: account.id,
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token,
        },
      });
    }

    return {
      success: true,
      account,
      pagesCount: selectedPages.length,
    };
  } catch (error) {
    console.error("Error handling Facebook OAuth callback:", error);

    if (axios.isAxiosError(error)) {
      console.error("Facebook OAuth error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });

      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new Error(`Facebook API error: ${fbError.message}`);
      }
    }

    throw new Error("Failed to connect Facebook account. Please try again.");
  }
}

// Account Management
export async function getConnectedAccounts() {
  const { userId } = await getAuth({ required: true });

  try {
    const accounts = await db.account.findMany({
      where: { userId },
      include: {
        pages: true,
      },
    });

    return accounts;
  } catch (error) {
    console.error("Error fetching connected accounts:", error);
    throw new Error(
      "Could not fetch connected accounts. Please try again later.",
    );
  }
}

export async function connectFacebookAccount(input: {
  accessToken: string;
  platform: "facebook" | "instagram";
  selectedPageIds?: string[]; // Parameter for selected Pages
}) {
  const { userId } = await getAuth({ required: true });

  try {
    // Basic validation for empty/invalid tokens
    if (
      !input.accessToken ||
      typeof input.accessToken !== "string" ||
      input.accessToken.trim() === ""
    ) {
      throw new Error("Please enter a Facebook access token");
    }

    // Basic length check - Facebook tokens are typically long
    if (input.accessToken.trim().length < 50) {
      throw new Error(
        "The token you entered appears to be too short. Facebook tokens are typically much longer.",
      );
    }

    // Define token types and store token information
    type TokenType = "user" | "page" | "app" | "unknown";
    let tokenType: TokenType = "unknown";
    const tokenInfo: {
      id?: string;
      name?: string;
      canManagePages?: boolean;
      appId?: string;
    } = {};
    let pages: Array<{ id: string; name: string; access_token: string }> = [];

    // STEP 1: Basic validation - fetch /me to see if token is valid at all
    try {
      console.log(`Step 1: Validating token with /me endpoint`);
      const meResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me`,
        {
          params: {
            fields: "id,name",
            access_token: input.accessToken,
          },
        },
      );

      // Token is valid for some entity (user, page, or app)
      tokenInfo.id = meResponse.data.id;
      tokenInfo.name = meResponse.data.name;

      // STEP 2: Try to access /me/accounts to check if it's a User token
      try {
        const accountsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/me/accounts`,
          {
            params: {
              access_token: input.accessToken,
            },
          },
        );

        // If we can access /me/accounts, it's a User token
        tokenType = "user";
        tokenInfo.canManagePages = true;
        pages = (accountsResponse.data.data || []) as Array<{
          id: string;
          name: string;
          access_token: string;
        }>;
      } catch {
        // accountsError is unused
        // If we can't access /me/accounts, try to identify if it's a Page token
        try {
          const pageCheckResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${meResponse.data.id}`,
            {
              params: {
                fields: "is_published,name,id",
                access_token: input.accessToken,
              },
            },
          );

          // If it has page-specific fields, it's a Page token
          if (pageCheckResponse.data.is_published !== undefined) {
            tokenType = "page";
          } else {
            // Try to check if it's an App token
            try {
              const appCheckResponse = await axios.get(
                `https://graph.facebook.com/v18.0/app`,
                {
                  params: {
                    fields: "id,name",
                    access_token: input.accessToken,
                  },
                },
              );

              if (appCheckResponse.data.id) {
                tokenType = "app";
                tokenInfo.appId = appCheckResponse.data.id;
              }
            } catch {
              // appCheckError is unused
              // If we can't determine the token type but it passed /me validation,
              // it's probably a user token with limited permissions
              tokenType = "user";
              tokenInfo.canManagePages = false;
            }
          }
        } catch {
          // pageCheckError is unused
          // If both checks fail but /me worked, assume it's a user token with limited permissions
          tokenType = "user";
          tokenInfo.canManagePages = false;
        }
      }
    } catch (error) {
      // Log the error details for debugging
      // removed unused variable 'err' in catch block, replaced with generic error handling
      if (axios.isAxiosError(error) && error.response) {
        console.error("Facebook token validation error:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });

        // Provide a user-friendly error message based on the API error
        if (error.response.status === 400) {
          throw new Error(
            "The token format appears to be incorrect. Please check and try again.",
          );
        } else if (
          error.response.status === 401 ||
          error.response.status === 403
        ) {
          throw new Error(
            "This token doesn't have the required permissions or has expired. Please generate a new token.",
          );
        } else {
          throw new Error(
            `Facebook API error: ${error.response.data?.error?.message || "Unknown error"}`,
          );
        }
      } else {
        console.error("Facebook token validation error:", error);
        throw new Error(
          "We couldn't validate your Facebook token. Please check your internet connection and try again.",
        );
      }
    }

    // Handle each token type appropriately
    if (tokenType === "user" && tokenInfo.canManagePages) {
      // STEP 2a: User token with page management permissions
      if (pages.length === 0) {
        return {
          warning:
            "No Facebook pages found for this account. You need at least one Facebook page to manage comments.",
          tokenType: "user",
          userName: tokenInfo.name,
        };
      }

      // If no selectedPageIds provided, return the list of pages for selection
      if (!input.selectedPageIds || input.selectedPageIds.length === 0) {
        return {
          success: true,
          tokenType: "user",
          userName: tokenInfo.name,
          availablePages: pages.map((page) => ({
            id: page.id,
            name: page.name,
          })),
          needsPageSelection: true,
        };
      }

      // Filter pages based on selectedPageIds
      const selectedPages = pages.filter((page) =>
        input.selectedPageIds?.includes(page.id),
      );

      if (selectedPages.length === 0) {
        return {
          warning: "None of the selected pages were found. Please try again.",
        };
      }

      // Save each selected page as a Page + Account
      for (const page of selectedPages) {
        // Create or update the account for each Page
        const account = await db.account.upsert({
          where: {
            userId_platform_accountId: {
              userId,
              platform: input.platform,
              accountId: page.id,
            },
          },
          update: {
            name: page.name,
            accessToken: input.accessToken, // Save the user token for future refresh
            pageId: page.id,
            pageToken: page.access_token,
          },
          create: {
            userId,
            platform: input.platform,
            accountId: page.id,
            name: page.name,
            accessToken: input.accessToken,
            pageId: page.id,
            pageToken: page.access_token,
          },
        });

        // Add the page to the Page table
        await db.page.upsert({
          where: {
            accountId_pageId: { accountId: account.id, pageId: page.id },
          },
          update: {
            pageName: page.name,
            pageToken: page.access_token,
          },
          create: {
            accountId: account.id,
            pageId: page.id,
            pageName: page.name,
            pageToken: page.access_token,
          },
        });
      }

      return {
        success: true,
        tokenType: "user",
        userName: tokenInfo.name,
        pagesCount: selectedPages.length,
      };
    } else if (tokenType === "user" && !tokenInfo.canManagePages) {
      // User token without page management permissions
      return {
        warning:
          "This user token doesn't have permissions to manage pages. Please generate a token with 'pages_show_list' and 'pages_read_engagement' permissions.",
        tokenType: "user",
        userName: tokenInfo.name,
        missingPermissions: true,
      };
    } else if (tokenType === "page" && tokenInfo.id && tokenInfo.name) {
      // STEP 2b: Page token - save directly
      try {
        const pageId = tokenInfo.id;
        // Save as account
        const account = await db.account.upsert({
          where: {
            userId_platform_accountId: {
              userId,
              platform: input.platform,
              accountId: pageId,
            },
          },
          update: {
            name: tokenInfo.name,
            accessToken: input.accessToken,
            pageId,
            pageToken: input.accessToken,
          },
          create: {
            userId,
            platform: input.platform,
            accountId: pageId,
            name: tokenInfo.name,
            accessToken: input.accessToken,
            pageId,
            pageToken: input.accessToken,
          },
        });

        // Add the page to the Page table
        await db.page.upsert({
          where: { accountId_pageId: { accountId: account.id, pageId } },
          update: {
            pageName: tokenInfo.name,
            pageToken: input.accessToken,
          },
          create: {
            accountId: account.id,
            pageId,
            pageName: tokenInfo.name,
            pageToken: input.accessToken,
          },
        });

        return {
          success: true,
          tokenType: "page",
          pageName: tokenInfo.name,
        };
      } catch {
        throw new Error(
          "Failed to save Facebook Page. Make sure your Page token is valid and has the required permissions.",
        );
      }
    } else if (tokenType === "app") {
      // App tokens aren't suitable for user-facing social media management
      return {
        warning:
          "You've provided an App token. For social media management, please use a User token or Page token instead.",
        tokenType: "app",
        appId: tokenInfo.appId,
      };
    }

    // If we reach here, something unexpected happened
    return {
      success: false,
      tokenType,
      message:
        "We couldn't properly identify your token type. Please try using a different token.",
    };
  } catch (error: any) {
    console.error("Error connecting Facebook account:", error);
    // Use the error message if it's already been processed, otherwise use a generic message
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to connect Facebook account. Please try again.";
    throw new Error(errorMessage);
  }
}

export async function connectManualAccount(input: {
  platform: string;
  name: string;
  accountId: string;
  accessToken: string;
  pageId?: string;
  pageToken?: string;
}) {
  const { userId } = await getAuth({ required: true });

  try {
    const account = await db.account.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: input.platform,
          accountId: input.accountId,
        },
      },
      update: {
        name: input.name,
        accessToken: input.accessToken,
        pageId: input.pageId,
        pageToken: input.pageToken,
      },
      create: {
        userId,
        platform: input.platform,
        accountId: input.accountId,
        name: input.name,
        accessToken: input.accessToken,
        pageId: input.pageId,
        pageToken: input.pageToken,
      },
    });

    return account;
  } catch (error) {
    console.error("Error connecting manual account:", error);
    throw new Error("Failed to connect account. Please try again.");
  }
}

export async function disconnectAccount(input: { accountId: string }) {
  const { userId } = await getAuth({ required: true });

  try {
    await db.account.delete({
      where: {
        id: input.accountId,
        userId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error disconnecting account:", error);
    throw new Error("Failed to disconnect account. Please try again.");
  }
}

// Comment management
// Helper function to validate and normalize Facebook post IDs
function validateFacebookPostId(postId: string): {
  isValid: boolean;
  normalizedId?: string;
} {
  if (!postId || typeof postId !== "string") {
    return { isValid: false };
  }

  // Trim any whitespace
  const trimmedId = postId.trim();

  // Basic format check - most common format is pageId_postId
  const basicFormatRegex = /^[\w.]+_[\w.]+$/;
  if (basicFormatRegex.test(trimmedId)) {
    return { isValid: true, normalizedId: trimmedId };
  }

  // Some post IDs are simple numeric IDs
  const numericIdRegex = /^\d+$/;
  if (numericIdRegex.test(trimmedId)) {
    // For simple numeric IDs, we can't make assumptions about their validity
    // Facebook API will validate them during the actual request
    return { isValid: true, normalizedId: trimmedId };
  }

  // Handle photo post IDs which might have a different format
  // Facebook photo IDs often have a structure like: photoId_albumId
  const photoIdRegex = /^(photo\.)?\d+(_\d+)?$/;
  if (photoIdRegex.test(trimmedId)) {
    return { isValid: true, normalizedId: trimmedId };
  }

  // If none of our known formats match, consider it invalid
  return { isValid: false };
}

async function fetchInstagramPageComments({
  pageId,
  pageToken,
  userId,
  accountId,
  pageDbId,
}: {
  pageId: string;
  pageToken: string;
  userId: string;
  accountId: string;
  pageDbId?: string;
}) {
  let commentsCount = 0;
  try {
    // 1. Get the Instagram Business Account ID linked to the Facebook Page
    const pageInfoResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}`,
      {
        params: {
          fields: "instagram_business_account",
          access_token: pageToken,
        },
      },
    );

    const instagramAccountId =
      pageInfoResponse.data.instagram_business_account?.id;

    if (!instagramAccountId) {
      console.log(
        `No Instagram Business Account linked to Facebook Page ${pageId}`,
      );
      return { commentsCount: 0, problematicIds: [] };
    }

    // 2. Fetch recent media from the Instagram account
    const mediaResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      {
        params: {
          fields: "id,caption,comments_count,like_count,timestamp,media_type",
          access_token: pageToken,
          limit: 10, // Fetch up to 10 recent media items
        },
      },
    );

    const mediaItems = mediaResponse.data.data || [];
    console.log(
      `Found ${mediaItems.length} media items for Instagram account ${instagramAccountId}`,
    );

    // 3. For each media item, fetch its comments
    for (const media of mediaItems) {
      if (media.comments_count === 0) {
        continue;
      }

      const commentsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${media.id}/comments`,
        {
          params: {
            fields:
              "id,text,timestamp,from,like_count,replies.limit(10){id,text,timestamp,from,like_count}",
            access_token: pageToken,
            limit: 50, // Fetch up to 50 comments per media item
          },
        },
      );

      const comments = commentsResponse.data.data || [];
      console.log(
        `Processing ${comments.length} comments for media ${media.id}`,
      );

      for (const comment of comments) {
        try {
          // Check if the main comment exists
          const existingComment = await db.comment.findUnique({
            where: {
              platform_commentId: {
                platform: "instagram",
                commentId: comment.id,
              },
            },
          });

          if (!existingComment) {
            await db.comment.create({
              data: {
                platform: "instagram",
                commentId: comment.id,
                postId: media.id,
                text: comment.text || "",
                authorName: comment.from?.username || "Instagram User",
                authorId: comment.from?.id || "unknown",
                createdAt: new Date(comment.timestamp),
                likeCount: comment.like_count || 0,
                userId,
                accountId,
                pageId: pageDbId,
              },
            });
            commentsCount++;
          }

          // Process replies
          const replies = comment.replies ? comment.replies.data : [];
          for (const reply of replies) {
            const existingReply = await db.comment.findUnique({
              where: {
                platform_commentId: {
                  platform: "instagram",
                  commentId: reply.id,
                },
              },
            });

            if (!existingReply) {
              await db.comment.create({
                data: {
                  platform: "instagram",
                  commentId: reply.id,
                  postId: media.id,
                  parentId: comment.id, // Link to the parent comment
                  text: reply.text || "",
                  authorName: reply.from?.username || "Instagram User",
                  authorId: reply.from?.id || "unknown",
                  createdAt: new Date(reply.timestamp),
                  likeCount: reply.like_count || 0,
                  userId,
                  accountId,
                  pageId: pageDbId,
                  isMainComment: false,
                },
              });
              commentsCount++;
            }
          }
        } catch (commentProcessError) {
          console.error(
            `Error processing Instagram comment ${comment.id} for media ${media.id}:`,
            commentProcessError,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `Error fetching Instagram comments for page ${pageId}:`,
      error,
    );
    if (axios.isAxiosError(error) && error.response) {
      console.error("Instagram API Error Response:", error.response.data);
    }
  }

  return { commentsCount, problematicIds: [] };
}

// Helper function to fetch comments from a Facebook page
// Enhanced: Accept a callback to inform about skipped/problematic IDs
async function fetchFacebookPageComments({
  pageId,
  pageToken,
  userId,
  accountId,
  platform,
  pageDbId,
}: {
  pageId: string;
  pageToken: string;
  userId: string;
  accountId: string;
  platform: string;
  pageDbId?: string;
}) {
  let commentsCount = 0;
  try {
    // Use the /posts endpoint to get content published BY the page.
    // This is more reliable than /feed, which includes posts by others on the page.
    // We also use field expansion to get comments directly with the posts, which is more efficient.
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/posts`,
      {
        params: {
          fields:
            "id,message,created_time,from,full_picture,permalink_url,comments{id,message,from,created_time,like_count,comment_count,reactions.summary(true)}",
          access_token: pageToken,
          limit: 25, // Fetch up to 25 recent posts
        },
      },
    );

    const posts = postsResponse.data.data || [];
    console.log(`Found ${posts.length} posts for page ${pageId}`);

    for (const post of posts) {
      const comments = post.comments ? post.comments.data : [];
      if (comments.length === 0) {
        continue;
      }

      console.log(`Processing ${comments.length} comments for post ${post.id}`);

      for (const comment of comments) {
        try {
          const existingComment = await db.comment.findUnique({
            where: {
              platform_commentId: {
                platform,
                commentId: comment.id,
              },
            },
          });

          const realAuthorName = comment.from?.name || "Unknown Author";
          const realAuthorId = comment.from?.id || "unknown";
          const realCreatedAt = comment.created_time
            ? new Date(comment.created_time)
            : new Date();

          const likeCount = comment.like_count || 0;
          const replyCount = comment.comment_count || 0;
          const reactionsData =
            comment.reactions && comment.reactions.summary
              ? JSON.stringify(comment.reactions.summary)
              : null;

          if (!existingComment) {
            await db.comment.create({
              data: {
                platform,
                commentId: comment.id,
                postId: post.id,
                text: comment.message || "",
                authorName: realAuthorName,
                authorId: realAuthorId,
                createdAt: realCreatedAt,
                userId,
                accountId,
                pageId: pageDbId,
                likeCount,
                replyCount,
                reactionsData,
              },
            });
            commentsCount++;
          } else {
            await db.comment.update({
              where: { id: existingComment.id },
              data: {
                likeCount,
                replyCount,
                reactionsData,
                authorName:
                  existingComment.authorName === "Unknown Author"
                    ? realAuthorName
                    : existingComment.authorName,
                authorId:
                  existingComment.authorId === "unknown"
                    ? realAuthorId
                    : existingComment.authorId,
                createdAt: realCreatedAt,
              },
            });
          }
        } catch (commentProcessError) {
          console.error(
            `Error processing comment ${comment.id} for post ${post.id}:`,
            commentProcessError,
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching Facebook posts for page ${pageId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Facebook API Error Response:", error.response.data);
    }
  }

  // Return the count of new comments added
  return { commentsCount, problematicIds: [] }; // problematicIds is now empty as we are not iterating over problematic IDs
}

export async function fetchComments() {
  try {
    const { userId } = await getAuth({ required: true });

    // Get all connected accounts
    // Remove unnecessary try/catch for basic account fetching
    const accounts = await db.account.findMany({
      where: { userId },
      include: { pages: true },
    });
    let newCommentsCount = 0;
    const allProblematicIds: string[] = [];

    // Get user settings for email alerts (catch and default only on error)
    let userSettings: Awaited<
      ReturnType<typeof db.userSettings.findUnique>
    > | null = null;
    try {
      userSettings = await db.userSettings.findUnique({ where: { userId } });
    } catch {
      userSettings = null;
    }

    const emailAlertsEnabled = userSettings?.emailAlertsEnabled ?? false;
    const priorityThreshold = userSettings?.emailAlertsPriorityThreshold ?? 8;
    const lastAlertSentAt = userSettings?.lastAlertSentAt;

    // Don't send alerts more than once per hour
    const canSendAlerts =
      !lastAlertSentAt ||
      new Date().getTime() - lastAlertSentAt.getTime() > 60 * 60 * 1000;

    // Fetch comments from each account
    for (const account of accounts as any[]) {
      if (account.platform === "facebook") {
        try {
          // Get all pages for this account
          const pages = await db.page.findMany({
            where: { accountId: account.id },
          });

          // If no pages found in the new model, try using the legacy fields
          if (pages.length === 0 && account.pageId && account.pageToken) {
            // Find or create a Page record for this legacy connection to ensure comments are linked
            let pageRecord = await db.page.findFirst({
              where: {
                pageId: account.pageId,
                account: {
                  userId: userId,
                },
              },
            });

            if (!pageRecord) {
              let pageName = "Unknown Page";
              try {
                const pageInfo = await axios.get(
                  `https://graph.facebook.com/v18.0/${account.pageId}?fields=name&access_token=${account.pageToken}`,
                );
                if (pageInfo.data.name) {
                  pageName = pageInfo.data.name;
                }
              } catch (e: any) {
                console.error(
                  `Could not fetch page name for legacy page ${account.pageId}:`,
                  (e as Error).message,
                );
              }

              pageRecord = await db.page.create({
                data: {
                  accountId: account.id,
                  pageId: account.pageId,
                  pageName: pageName,
                  pageToken: account.pageToken,
                },
              });
            }

            // Use legacy fields but with the found/created pageDbId
            const res = await fetchFacebookPageComments({
              pageId: account.pageId,
              pageToken: account.pageToken,
              userId,
              accountId: account.id,
              platform: account.platform,
              pageDbId: pageRecord.id,
            });
            newCommentsCount += res.commentsCount;
            allProblematicIds.push(...(res.problematicIds || []));
          } else {
            // Process each page
            for (const page of pages) {
              const res = await fetchFacebookPageComments({
                pageId: page.pageId,
                pageToken: page.pageToken,
                userId,
                accountId: account.id,
                platform: account.platform,
                pageDbId: page.id, // Pass the database ID of the page
              });
              newCommentsCount += res.commentsCount;
              allProblematicIds.push(...(res.problematicIds || []));
            }
          }
        } catch (error) {
          console.error("Error fetching Facebook comments:", error);
        }
      }

      // Instagram implementation
      if (account.platform === "instagram") {
        try {
          const pages = await db.page.findMany({
            where: { accountId: account.id },
          });

          for (const page of pages) {
            if (page.pageToken) {
              const res = await fetchInstagramPageComments({
                pageId: page.pageId,
                pageToken: page.pageToken,
                userId,
                accountId: account.id,
                pageDbId: page.id,
              });
              newCommentsCount += res.commentsCount;
              allProblematicIds.push(...(res.problematicIds || []));
            }
          }
        } catch (error) {
          console.error("Error fetching Instagram comments:", error);
        }
      }

      // Twitter/X implementation
      if (account.platform === "twitter" && account.accessToken) {
        try {
          // Get mentions for the user
          const tweetsResponse = await axios.get(
            `https://api.twitter.com/2/users/${account.accountId}/mentions`,
            {
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
              },
              params: {
                expansions: "author_id",
                "user.fields": "name",
                "tweet.fields": "created_at,conversation_id",
                max_results: 10,
              },
            },
          );

          const tweets = tweetsResponse.data.data || [];
          const users = tweetsResponse.data.includes?.users || [];

          // Create a map of user IDs to user objects for easier lookup
          const userMap = users.reduce(
            (acc, user) => {
              acc[user.id] = user;
              return acc;
            },
            {} as Record<string, any>,
          );

          // Save each tweet to the database
          for (const tweet of tweets) {
            const existingComment = await db.comment.findUnique({
              where: {
                platform_commentId: {
                  platform: account.platform,
                  commentId: tweet.id,
                },
              },
            });

            if (!existingComment) {
              const authorUser = userMap[tweet.author_id];

              await db.comment.create({
                data: {
                  platform: account.platform,
                  commentId: tweet.id,
                  postId: tweet.conversation_id,
                  text: tweet.text,
                  authorName: authorUser ? authorUser.name : "Twitter User",
                  authorId: tweet.author_id,
                  createdAt: new Date(tweet.created_at),
                  userId,
                  accountId: account.id,
                },
              });

              newCommentsCount++;
            }
          }
        } catch (error) {
          console.error("Error fetching Twitter mentions:", error);
        }
      }

      // YouTube implementation
      if (account.platform === "youtube" && account.accessToken) {
        try {
          // Refresh token if needed
          let accessToken = account.accessToken;
          if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
            if (account.refreshToken) {
              try {
                const refreshResponse = await axios.post(
                  "https://oauth2.googleapis.com/token",
                  {
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    refresh_token: account.refreshToken,
                    grant_type: "refresh_token",
                  },
                  {
                    headers: {
                      "Content-Type": "application/json",
                    },
                  },
                );

                accessToken = refreshResponse.data.access_token;
                const expiresIn = refreshResponse.data.expires_in;

                // Update the account with the new access token and expiry
                await db.account.update({
                  where: { id: account.id },
                  data: {
                    accessToken,
                    expiresAt: new Date(Date.now() + expiresIn * 1000),
                  },
                });
              } catch (refreshError) {
                console.error("Error refreshing YouTube token:", refreshError);
                continue; // Skip this account and move to the next one
              }
            } else {
              console.error(
                "YouTube token expired and no refresh token available",
              );
              continue; // Skip this account and move to the next one
            }
          }

          // Get videos from the channel
          const videosResponse = await axios.get(
            "https://www.googleapis.com/youtube/v3/search",
            {
              params: {
                part: "snippet",
                forMine: true,
                maxResults: 10,
                type: "video",
                order: "date",
              },
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          const videos = videosResponse.data.items || [];

          // For each video, get comments
          for (const video of videos) {
            const videoId = video.id.videoId;

            const commentsResponse = await axios.get(
              "https://www.googleapis.com/youtube/v3/commentThreads",
              {
                params: {
                  part: "snippet",
                  videoId,
                  maxResults: 20,
                },
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );

            const comments = commentsResponse.data.items || [];

            // Save each comment to the database
            for (const thread of comments) {
              const comment = thread.snippet.topLevelComment.snippet;
              const commentId = thread.id;

              const existingComment = await db.comment.findUnique({
                where: {
                  platform_commentId: {
                    platform: account.platform,
                    commentId,
                  },
                },
              });

              if (!existingComment) {
                await db.comment.create({
                  data: {
                    platform: account.platform,
                    commentId,
                    postId: videoId,
                    text: comment.textDisplay,
                    authorName: comment.authorDisplayName,
                    authorId:
                      comment.authorChannelId?.value ||
                      comment.authorChannelUrl,
                    authorImage: comment.authorProfileImageUrl,
                    createdAt: new Date(comment.publishedAt),
                    userId,
                    accountId: account.id,
                  },
                });

                newCommentsCount++;
              }
            }
          }
        } catch (error) {
          console.error("Error fetching YouTube comments:", error);
        }
      }
    }

    // Check for high-priority comments and send email alerts if enabled
    if (emailAlertsEnabled && canSendAlerts && newCommentsCount > 0) {
      try {
        // Find high priority comments
        const highPriorityComments = await db.comment.findMany({
          where: {
            userId,
            responded: false,
            createdAt: { gte: lastAlertSentAt || new Date(0) }, // Only get comments since last alert
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        if (highPriorityComments.length > 0) {
          // Analyze comments to find high priority ones
          const analyzedComments = await Promise.all(
            highPriorityComments.map(async (comment) => {
              const analysis = await analyzeSentiment(comment.text);
              return { ...comment, priority: analysis.priority };
            }),
          );

          const highPriorityAnalyzed = analyzedComments.filter(
            (c) => c.priority >= priorityThreshold,
          );

          if (highPriorityAnalyzed.length > 0) {
            // Send email alert
            await sendEmail({
              toUserId: userId,
              subject: `🚨 ${highPriorityAnalyzed.length} High-Priority Comments Need Attention`,
              markdown: `
## High-Priority Comments Alert

You have ${highPriorityAnalyzed.length} high-priority comments that need your attention:

${highPriorityAnalyzed
  .map(
    (
      comment,
      i,
    ) => `${i + 1}. From **${comment.authorName}** on ${comment.platform} (Priority: ${comment.priority}/10):
   > ${comment.text.substring(0, 100)}${comment.text.length > 100 ? "..." : ""}
`,
  )
  .join("\n")}

[View and Respond to Comments](${getBaseUrl()}/)
            `,
            });

            // Update last alert sent timestamp
            await db.userSettings.update({
              where: { userId },
              data: { lastAlertSentAt: new Date() },
            });
          }
        }
      } catch (error) {
        console.error("Error sending priority comment alerts:", error);
      }
    }

    // Return problematic IDs for UI notification
    return { newCommentsCount, problematicIds: allProblematicIds };
  } catch (error) {
    console.error("Error in fetchComments:", error);
    return {
      newCommentsCount: 0,
      problematicIds: [],
      error: "Failed to fetch comments",
    };
  }
}

export async function getPages(input?: { accountId?: string }) {
  const { userId } = await getAuth({ required: true });

  const where: any = { account: { userId } };

  if (input?.accountId) {
    where.accountId = input.accountId;
  }

  const pages = await db.page.findMany({
    where,
    orderBy: { pageName: "asc" },
  });

  return pages;
}

// Advanced sentiment and topic analysis of a comment text
// Optimized batch sentiment analysis for multiple comments
async function analyzeSentimentBatch(
  comments: { id: string; text: string }[],
): Promise<{
  [commentId: string]: {
    sentiment: "positive" | "neutral" | "negative";
    topics: string[];
    priority: number;
  };
}> {
  const results: { [commentId: string]: any } = {};
  const uncachedComments: { id: string; text: string; cacheKey: string }[] = [];

  // First, check cache for all comments
  for (const comment of comments) {
    const cacheKey = `sentiment_v2_${Buffer.from(comment.text).toString("base64").substring(0, 40)}`;

    const cachedResult = await db.aIRequestLog.findFirst({
      where: {
        cacheKey,
        success: true,
        responseData: { not: null },
        timestamp: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) }, // 24 hour cache
      },
      orderBy: { timestamp: "desc" },
    });

    if (cachedResult?.responseData) {
      try {
        const parsedResponse = JSON.parse(cachedResult.responseData) as {
          sentiment: "positive" | "neutral" | "negative";
          topics: string[];
          priority: number;
        };
        results[comment.id] = {
          sentiment: parsedResponse.sentiment,
          topics: parsedResponse.topics,
          priority: parsedResponse.priority,
        };
      } catch (parseError) {
        console.error("Error parsing cached response:", parseError);
        uncachedComments.push({ ...comment, cacheKey });
      }
    } else {
      uncachedComments.push({ ...comment, cacheKey });
    }
  }

  // If all comments are cached, return results
  if (uncachedComments.length === 0) {
    return results;
  }

  // Batch analyze uncached comments
  try {
    const batchRequestLog = await db.aIRequestLog.create({
      data: {
        userId: "system",
        endpoint: "analyzeSentimentBatch",
        operation: "sentiment_analysis_batch",
        cacheKey: `batch_${Date.now()}`,
      },
    });

    const commentsText = uncachedComments
      .map((c, i) => `Comment ${i + 1}: "${c.text}"`)
      .join("\n\n");

    const batchResult = await batchAwareRequestMultimodalModel<{
      analyses: {
        sentiment: "positive" | "neutral" | "negative";
        topics: string[];
        priority: number;
      }[];
    }>(
      "sentiment_analysis",
      { comments: uncachedComments },
      {
        system:
          "You are a social media content analyst. Analyze the following comments and extract key information for each.\n- **Sentiment**: Classify as 'positive', 'neutral', or 'negative'.\n- **Topics**: Identify 1-3 main topics or keywords. These should be concise.\n- **Priority**: Assign a response priority from 1 (low) to 10 (high).\n\nReturn results as an array where each element corresponds to the comment at the same index.",
        messages: [
          {
            role: "user",
            content: `Analyze these ${uncachedComments.length} comments:\n\n${commentsText}`,
          },
        ],
        returnType: z.object({
          analyses: z.array(
            z.object({
              sentiment: z.enum(["positive", "neutral", "negative"]),
              topics: z.array(z.string()),
              priority: z.number().min(1).max(10),
            }),
          ),
        }),
        model: "small",
      },
    );

    // Update the batch log with success
    await db.aIRequestLog.update({
      where: { id: batchRequestLog.id },
      data: {
        success: true,
        responseData: JSON.stringify(batchResult),
      },
    });

    // Cache individual results and add to results
    for (let i = 0; i < uncachedComments.length; i++) {
      const comment = uncachedComments[i];
      const analysis = batchResult.analyses[i];

      if (analysis && comment) {
        results[comment.id] = {
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          priority: analysis.priority,
        };

        // Cache individual result for future use
        try {
          await db.aIRequestLog.create({
            data: {
              userId: "system",
              endpoint: "analyzeSentiment",
              operation: "sentiment_analysis",
              cacheKey: comment.cacheKey,
              success: true,
              responseData: JSON.stringify(analysis),
            },
          });
        } catch (cacheError) {
          console.error("Failed to cache individual result:", cacheError);
        }
      } else if (comment) {
        // Fallback for missing analysis
        results[comment.id] = {
          sentiment: "neutral",
          topics: ["general"],
          priority: 5,
        };
      }
    }

    return results;
  } catch (error) {
    console.error("Error in batch sentiment analysis:", error);

    // Log the error
    try {
      await db.aIRequestLog.create({
        data: {
          userId: "system",
          endpoint: "analyzeSentimentBatch",
          operation: "sentiment_analysis_batch",
          success: false,
          errorMsg: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (logError) {
      console.error("Failed to log batch AI request error:", logError);
    }

    // Fallback: provide default values for uncached comments
    for (const comment of uncachedComments) {
      results[comment.id] = {
        sentiment: "neutral",
        topics: ["general"],
        priority: 5,
      };
    }

    return results;
  }
}

// Original single comment analysis function (now uses batch internally for efficiency)
async function analyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
  priority: number;
}> {
  const tempId = `temp_${Date.now()}_${Math.random()}`;
  const batchResults = await analyzeSentimentBatch([{ id: tempId, text }]);
  return (
    batchResults[tempId] || {
      sentiment: "neutral",
      topics: ["general"],
      priority: 5,
    }
  );
}

export async function getComments(input?: {
  platform?: string;
  responded?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  pageId?: string; // Add support for filtering by specific Facebook page
  startDate?: string; // Filter comments from this date (inclusive)
  endDate?: string; // Filter comments until this date (inclusive)
  topic?: string; // Filter by AI-detected topic
  priority?: number; // Filter by AI-assigned priority level
}) {
  try {
    const { userId } = await getAuth({ required: true });

    const where: any = { userId };

    if (input?.platform) {
      where.platform = input.platform;
    }

    // Add filter for pageId if provided
    if (input?.pageId && input.pageId.trim() !== "") {
      where.pageId = input.pageId;
    }

    if (input?.responded !== undefined) {
      where.responded = input.responded;
    }

    if (input?.search) {
      where.OR = [
        { text: { contains: input.search, mode: "insensitive" } },
        { authorName: { contains: input.search, mode: "insensitive" } },
      ];
    }

    // Date range filtering
    if (input?.startDate || input?.endDate) {
      where.createdAt = {};

      if (input?.startDate) {
        where.createdAt.gte = new Date(input.startDate);
      }

      if (input?.endDate) {
        // Set to end of day for the end date
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Calculate pagination parameters
    const page = input?.page || 0;
    const limit = input?.limit || 10;
    const skip = page * limit;

    let totalCount = 0;
    for (let i = 0; i < 3; i++) {
      try {
        totalCount = await db.comment.count({ where });
        break; // Success
      } catch (dbError: any) {
        const isRetryable =
          dbError.code === "P1001" ||
          (dbError.message && dbError.message.includes("SERVER_ERROR"));
        if (i < 2 && isRetryable) {
          await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
          continue;
        }
        console.error("Error fetching comment count:", dbError);
        totalCount = 0; // default to 0 on failure
        break;
      }
    }

    let comments: any[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        comments = await db.comment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            account: {
              select: {
                name: true,
                platform: true,
              },
            },
          },
        });
        break; // Success
      } catch (dbError: any) {
        const isRetryable =
          dbError.code === "P1001" ||
          (dbError.message && dbError.message.includes("SERVER_ERROR"));
        if (i < 2 && isRetryable) {
          await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
          continue;
        }
        console.error("Error fetching comments:", dbError);
        comments = []; // default to empty array on failure
        break;
      }
    }

    // Analyze comments if not already analyzed, then process
    const processedComments = comments.map((comment) => {
      // Add original post URL
      const originalPostUrl = getOriginalPostUrl(
        comment.platform,
        comment.postId,
      );
      // Use cached values if present, otherwise mark as pending/default
      const sentiment = comment.sentiment || "neutral";
      let topics: string[] = [];
      try {
        const parsed = comment.topics ? JSON.parse(comment.topics) : [];
        topics =
          Array.isArray(parsed) && parsed.every((x) => typeof x === "string")
            ? parsed
            : [];
      } catch {
        topics = [];
      }
      const priority =
        typeof comment.priority === "number" ? comment.priority : 5;
      return {
        ...comment,
        originalPostUrl,
        sentiment,
        topics,
        priority,
      };
    });

    return {
      comments: processedComments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: (page + 1) * limit < totalCount,
      },
    };
  } catch (error) {
    console.error("Error in getComments:", error);
    // Return empty result with proper structure to avoid UI errors
    return {
      comments: [],
      pagination: {
        page: input?.page || 0,
        limit: input?.limit || 10,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  }
}

// Fetch original post content
export async function getOriginalPostContent(input: {
  platform: string;
  postId: string;
  accountId: string;
}) {
  try {
    let permalinkUrl: string | undefined = undefined;
    const account = await db.account.findUnique({
      where: { id: input.accountId },
      include: {
        pages: true,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Check if account token is expired based on the expiresAt field
    if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
      console.log(
        `Token for account ${account.id} has expired on ${account.expiresAt}`,
      );
      return {
        content: "",
        author: "",
        date: null,
        imageUrl: null,
        error: {
          code: "TOKEN_EXPIRED",
          message: `Your ${input.platform} access token has expired. Please reconnect your account in Settings.`,
          accountId: account.id,
          platform: input.platform,
        },
      };
    }

    let postContent = "";
    let postAuthor = "";
    let postDate: Date | null = null;
    let postImageUrl: string | null = null;
    const error: {
      code: string;
      message: string;
      accountId?: string;
      platform?: string;
    } | null = null;
    let postEngagement: {
      likeCount: number;
      commentCount: number;
      shareCount: number;
    } | null = null;

    // Get post content based on platform
    if (input.platform === "facebook") {
      // For Facebook, we need to find the right page token
      let pageToken = "";

      // Check if we have a page with this post
      if (account.pages && account.pages.length > 0) {
        // Try to find the specific page for this post
        const page = account.pages.find(
          (p) => p.pageId && input.postId.includes(p.pageId),
        );
        if (page) {
          pageToken = page.pageToken;
        } else if (account.pages[0]?.pageToken) {
          // Fallback to the first page if it exists and has a token
          pageToken = account.pages[0].pageToken;
        }
      } else if (account.pageToken) {
        // Fallback to legacy page token
        pageToken = account.pageToken;
      } else {
        // Fallback to account token
        pageToken = account.accessToken;
      }

      try {
        // Validate and normalize the post ID before making API calls
        const validationResult = validateFacebookPostId(input.postId);
        const postId = validationResult.isValid
          ? validationResult.normalizedId || input.postId
          : input.postId; // Use original even if invalid as last resort

        // 1. First, detect node type using metadata=1
        let nodeType = "post";
        try {
          const metaRes = await axios.get(
            `https://graph.facebook.com/v18.0/${postId}`,
            {
              params: {
                metadata: 1,
                access_token: pageToken,
              },
            },
          );
          nodeType =
            metaRes.data?.metadata?.type || metaRes.data?.type || "post";
        } catch (metaErr) {
          console.warn(
            "Could not detect Facebook node type, defaulting to post",
            metaErr,
          );
        }

        // 2. Determine fields to use based on node type
        let fields =
          "message,story,created_time,from,permalink_url,full_picture"; // default
        if (nodeType === "photo") {
          fields = "caption,name,created_time,from,permalink_url,source,images";
        } else if (nodeType === "video") {
          fields =
            "description,title,created_time,from,permalink_url,source,thumbnails";
        } else if (nodeType === "album") {
          fields =
            "name,description,link,photo_count,created_time,from,cover_photo";
        } else if (nodeType === "event") {
          fields = "name,description,start_time,place,permalink_url";
        } else if (nodeType === "status" || nodeType === "post") {
          fields = "message,story,created_time,from,permalink_url,full_picture";
        } // fallback to default for other types

        // 3. Fetch the node with the selected fields
        const response = await axios.get(
          `https://graph.facebook.com/v18.0/${postId}`,
          {
            params: {
              fields,
              access_token: pageToken,
            },
          },
        );

        // 4. Collect content fields for the detected node type
        let contentFields: string[] = [];
        if (nodeType === "photo") {
          contentFields = [response.data.caption, response.data.name].filter(
            Boolean,
          ) as string[];
        } else if (nodeType === "video") {
          contentFields = [
            response.data.title,
            response.data.description,
          ].filter(Boolean) as string[];
        } else if (nodeType === "album") {
          contentFields = [
            response.data.name,
            response.data.description,
          ].filter(Boolean) as string[];
        } else if (nodeType === "event") {
          contentFields = [
            response.data.name,
            response.data.description,
          ].filter(Boolean) as string[];
        } else {
          // status/post/default
          contentFields = [response.data.message, response.data.story].filter(
            Boolean,
          ) as string[];
        }
        if (response.data.link) {
          contentFields.push(response.data.link as string);
        }
        postContent = [...new Set(contentFields)].join("\n").trim();

        // Facebook returns a 'content not available' string as the message when the post is gone or private
        const fbUnavailablePatterns = [
          "This content isn't available",
          "This Facebook post is no longer available",
          "The link you followed may have expired",
          "When this happens, it's usually because the owner only shared it",
          "You must log in to continue.",
          "Go back to the previous page",
          "Go back to News Feed",
        ];
        // removed unused variable: isUnavailable
        if (
          !postContent ||
          fbUnavailablePatterns.some(
            (p) => postContent && postContent.includes(p),
          )
        ) {
          postContent = "";
        }

        // Store the permalink_url if available for better embedding
        permalinkUrl = response.data.permalink_url;
        postAuthor = response.data.from?.name || "Facebook User";
        if (response.data.created_time) {
          postDate = new Date(response.data.created_time);
        }

        // No engagement metrics (likes/comments/shares) in minimal field mode
        postEngagement = null;

        // Try to show main image
        if (nodeType === "photo") {
          // For photo posts, use source or first image from images array
          if (response.data.source) {
            postImageUrl = response.data.source;
          } else if (response.data.images && response.data.images.length > 0) {
            // Get the largest image from the images array
            const largestImage = response.data.images.reduce(
              (prev, current) => {
                return prev.width > current.width ? prev : current;
              },
              response.data.images[0],
            );
            postImageUrl = largestImage.source;
          }
        } else if (nodeType === "video") {
          // For video, try to use thumbnails or source
          if (
            response.data.thumbnails &&
            response.data.thumbnails.data &&
            response.data.thumbnails.data.length > 0
          ) {
            postImageUrl = response.data.thumbnails.data[0].uri;
          } else if (response.data.source) {
            postImageUrl = response.data.source;
          }
        } else if (nodeType === "album") {
          // For albums, try to use cover_photo
          if (response.data.cover_photo && response.data.cover_photo.picture) {
            postImageUrl = response.data.cover_photo.picture;
          }
        } else if (response.data.full_picture) {
          // For regular posts, use full_picture
          postImageUrl = response.data.full_picture;
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Error fetching Facebook post content:", error);
          console.error("Facebook API error details:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            params: error.config?.params,
          });

          // Check for token expiration error
          if (error.response?.data?.error?.code === 190) {
            // Mark the account token as expired in our database
            try {
              await db.account.update({
                where: { id: account.id },
                data: { expiresAt: new Date() }, // Set to current time to mark as expired
              });
            } catch (dbError) {
              console.error(
                "Error updating account expiration status:",
                dbError,
              );
            }

            return {
              content: "",
              author: "",
              date: null,
              imageUrl: null,
              error: {
                code: "TOKEN_EXPIRED",
                message:
                  "Your Facebook access token has expired. Please reconnect your account in Settings.",
                accountId: account.id,
                platform: input.platform,
              },
            };
          }
        } else {
          console.error(
            "Non-Axios error fetching Facebook post content:",
            error,
          );
        }

        // Try an alternative approach with the original post ID
        try {
          const altResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${input.postId}`,
            {
              params: {
                fields: "message,story,created_time,from",
                access_token: pageToken,
              },
            },
          );

          postContent =
            altResponse.data.message || altResponse.data.story || "";
          postAuthor = altResponse.data.from?.name || "Facebook User";
          if (altResponse.data.created_time) {
            postDate = new Date(altResponse.data.created_time);
          }

          // No engagement metrics in simplified call to avoid deprecated fields
          postEngagement = null;
        } catch (altError) {
          console.error("Alternative approach also failed:", altError);

          // Check if this is a node type error (trying to access wrong fields)
          if (
            axios.isAxiosError(altError) &&
            altError.response?.data?.error?.message?.includes(
              "nonexisting field",
            ) &&
            altError.response?.data?.error?.message?.includes("node type")
          ) {
            // Try once more with the opposite field set
            try {
              const isPhotoPost =
                altError.response?.data?.error?.message?.includes("Photo");
              const fallbackFields = isPhotoPost
                ? "caption,name,created_time,from,permalink_url,source,images"
                : "message,story,created_time,from,permalink_url,full_picture";

              const finalResponse = await axios.get(
                `https://graph.facebook.com/v18.0/${input.postId}`,
                {
                  params: {
                    fields: fallbackFields,
                    access_token: pageToken,
                  },
                },
              );

              // Process response based on detected node type
              if (isPhotoPost) {
                postContent = [
                  finalResponse.data.caption,
                  finalResponse.data.name,
                ]
                  .filter(Boolean)
                  .join("\n")
                  .trim();
                postAuthor = finalResponse.data.from?.name || "Facebook User";
                if (finalResponse.data.created_time) {
                  postDate = new Date(finalResponse.data.created_time);
                }

                // Get image URL
                if (finalResponse.data.source) {
                  postImageUrl = finalResponse.data.source;
                } else if (
                  finalResponse.data.images &&
                  finalResponse.data.images.length > 0
                ) {
                  const largestImage = finalResponse.data.images.reduce(
                    (prev, current) =>
                      prev.width > current.width ? prev : current,
                    finalResponse.data.images[0],
                  );
                  postImageUrl = largestImage.source;
                }

                permalinkUrl = finalResponse.data.permalink_url;
              } else {
                // Regular post processing
                const contentFields = [
                  finalResponse.data.message,
                  finalResponse.data.story,
                ].filter(Boolean);

                postContent = [...new Set(contentFields)].join("\n").trim();
                postAuthor = finalResponse.data.from?.name || "Facebook User";
                if (finalResponse.data.created_time) {
                  postDate = new Date(finalResponse.data.created_time);
                }

                if (finalResponse.data.full_picture) {
                  postImageUrl = finalResponse.data.full_picture;
                }

                permalinkUrl = finalResponse.data.permalink_url;
              }

              // Successfully recovered
              error = null;
            } catch (finalError) {
              console.error("Final attempt also failed:", finalError);
              // Set a specific error for node type issues
              error = {
                code: "NODE_TYPE_ERROR",
                message:
                  "This content type is not fully supported yet. We're working on it!",
                accountId: account.id,
                platform: input.platform,
              };
            }
          } else if (
            axios.isAxiosError(altError) &&
            altError.response?.data?.error?.code === 190
          ) {
            // Mark the account token as expired in our database
            try {
              await db.account.update({
                where: { id: account.id },
                data: { expiresAt: new Date() }, // Set to current time to mark as expired
              });
            } catch (dbError) {
              console.error(
                "Error updating account expiration status:",
                dbError,
              );
            }

            return {
              content: "",
              author: "",
              date: null,
              imageUrl: null,
              error: {
                code: "TOKEN_EXPIRED",
                message:
                  "Your Facebook access token has expired. Please reconnect your account in Settings.",
                accountId: account.id,
                platform: input.platform,
              },
            };
          } else {
            // Set a generic error message for other failures
            error = {
              code: "FETCH_ERROR",
              message:
                "Unable to fetch post content from Facebook. Please try again later.",
              accountId: account.id,
              platform: input.platform,
            };
          }
        }
      }
    } else if (input.platform === "twitter") {
      try {
        const response = await axios.get(
          `https://api.twitter.com/2/tweets/${input.postId}`,
          {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
            },
            params: {
              expansions: "author_id,attachments.media_keys",
              "user.fields": "name,profile_image_url",
              "tweet.fields": "created_at,text",
              "media.fields": "url,preview_image_url",
            },
          },
        );

        if (response.data.data) {
          postContent = response.data.data.text || "";
          if (response.data.data.created_at) {
            postDate = new Date(response.data.data.created_at);
          }

          // Get author info
          if (
            response.data.includes?.users &&
            response.data.includes.users.length > 0
          ) {
            const author = response.data.includes.users.find(
              (u: any) => u.id === response.data.data.author_id,
            );
            if (author) {
              postAuthor = author.name || "Twitter User";
            }
          }

          // Get media
          if (
            response.data.includes?.media &&
            response.data.includes.media.length > 0 &&
            response.data.data.attachments?.media_keys
          ) {
            const mediaKey = response.data.data.attachments.media_keys[0];
            const media = response.data.includes.media.find(
              (m: any) => m.media_key === mediaKey,
            );
            if (media) {
              postImageUrl = media.url || media.preview_image_url;
            }
          }
        }
      } catch (error) {
        console.error("Error fetching Twitter post content:", error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Mark the account token as expired in our database
          try {
            await db.account.update({
              where: { id: account.id },
              data: { expiresAt: new Date() }, // Set to current time to mark as expired
            });
          } catch (dbError) {
            console.error("Error updating account expiration status:", dbError);
          }

          return {
            content: "",
            author: "",
            date: null,
            imageUrl: null,
            error: {
              code: "TOKEN_EXPIRED",
              message:
                "Your Twitter access token has expired. Please reconnect your account in Settings.",
              accountId: account.id,
              platform: input.platform,
            },
          };
        }

        // Set a generic error message for other failures
        error = {
          code: "FETCH_ERROR",
          message:
            "Unable to fetch post content from Twitter. Please try again later.",
          accountId: account.id,
          platform: input.platform,
        };
      }
    } else if (input.platform === "youtube") {
      try {
        const response = await axios.get(
          "https://www.googleapis.com/youtube/v3/videos",
          {
            params: {
              part: "snippet,statistics",
              id: input.postId,
              key: process.env.YOUTUBE_API_KEY || account.accessToken,
            },
          },
        );

        if (response.data.items && response.data.items.length > 0) {
          const video = response.data.items[0];
          postContent =
            video.snippet.title + "\n" + (video.snippet.description || "");
          postAuthor = video.snippet.channelTitle || "YouTube Channel";
          if (video.snippet.publishedAt) {
            postDate = new Date(video.snippet.publishedAt);
          }
          postImageUrl =
            video.snippet.thumbnails?.high?.url ||
            video.snippet.thumbnails?.default?.url;
        }
      } catch (error) {
        console.error("Error fetching YouTube video content:", error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Mark the account token as expired in our database
          try {
            await db.account.update({
              where: { id: account.id },
              data: { expiresAt: new Date() }, // Set to current time to mark as expired
            });
          } catch (dbError) {
            console.error("Error updating account expiration status:", dbError);
          }

          return {
            content: "",
            author: "",
            date: null,
            imageUrl: null,
            error: {
              code: "TOKEN_EXPIRED",
              message:
                "Your YouTube access token has expired. Please reconnect your account in Settings.",
              accountId: account.id,
              platform: input.platform,
            },
          };
        }

        // Set a generic error message for other failures
        error = {
          code: "FETCH_ERROR",
          message:
            "Unable to fetch post content from YouTube. Please try again later.",
          accountId: account.id,
          platform: input.platform,
        };
      }
    }

    return {
      content: postContent,
      author: postAuthor,
      date: postDate,
      imageUrl: postImageUrl,
      engagement: postEngagement,
      error,
      permalinkUrl,
    };
  } catch (error) {
    console.error("Error in getOriginalPostContent:", error);
    return {
      content: "",
      author: "",
      date: null,
      imageUrl: null,
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred while fetching post content.",
      },
    };
  }
}

// Analyze comment and determine if response is needed, with suggestions
export async function analyzeCommentForResponse(input: { commentId: string }) {
  const { userId } = await getAuth({ required: true });

  // Fetch the selected comment with account and page info
  const comment = await db.comment.findFirst({
    where: {
      id: input.commentId,
      userId,
    },
    include: {
      account: true,
      page: true,
    },
  });
  if (!comment) throw new Error("Comment not found");

  // Fetch the original post content (if available)
  let originalPostContent = "";
  if (
    comment.platform === "facebook" &&
    comment.account &&
    comment.account.pageToken &&
    comment.postId
  ) {
    try {
      // Validate post ID before making API call
      const validationResult = validateFacebookPostId(comment.postId);
      const postId = validationResult.isValid
        ? validationResult.normalizedId || comment.postId
        : comment.postId; // Use original even if invalid as last resort

      // Try to get the post's message/content
      const postRes = await axios.get(
        `https://graph.facebook.com/v18.0/${postId}`,
        {
          params: {
            fields: "message,story",
            access_token: comment.account.pageToken,
          },
        },
      );
      originalPostContent = postRes.data.message || postRes.data.story || "";
    } catch {
      originalPostContent = "";
    }
  }

  // Fetch other comments in the same thread (excluding this one)
  const threadComments = await db.comment.findMany({
    where: {
      platform: comment.platform,
      postId: comment.postId,
      id: { not: comment.id },
      userId,
    },
    orderBy: { createdAt: "asc" },
    select: {
      authorName: true,
      text: true,
      createdAt: true,
    },
    take: 15,
  });

  // Analyze thread tone (simple heuristic: concatenate all)
  const threadContext = threadComments
    .map((c) => `${c.authorName}: ${c.text}`)
    .join("\n");

  // Get brand guidelines
  const brandGuidelines = await db.brandGuidelines.findUnique({
    where: { userId },
  });

  // NEW: Get user's past response behavior and preferences
  const userPref = await db.userResponsePreference.findUnique({
    where: { userId },
  });

  // Fetch brand signals to personalize further
  const brandSignals = await db.brandSignal.findUnique({ where: { userId } });

  // NEW: Check if the user has previously dismissed similar comments
  // Find similar comments based on content similarity and check their status
  let dismissalPattern: string | null = null;
  try {
    // Look for comments with similar content that were dismissed
    const similarComments = await db.comment.findMany({
      where: {
        userId,
        status: "dismissed",
        // We can't do direct text similarity in the query, so we'll fetch recent ones
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (similarComments.length > 0) {
      // Use LLM to check if the current comment is similar to previously dismissed ones
      const dismissalAnalysis = await requestMultimodalModel({
        system:
          "You are an expert at analyzing text similarity and patterns in user behavior.",
        messages: [
          {
            role: "user",
            content: `Current comment: "${comment.text}"

Previously dismissed comments:
${similarComments.map((c) => `- "${c.text}"`).join("\n")}

Analyze if the current comment is similar in content, tone, or intent to any of the previously dismissed comments. If there's a pattern of dismissal for this type of comment, describe it.`,
          },
        ],
        returnType: z.object({
          isSimilar: z.boolean(),
          pattern: z.string(),
          confidence: z.number().min(0).max(1),
        }),
        model: "medium",
      });

      if (
        dismissalAnalysis.isSimilar &&
        dismissalAnalysis.confidence > 0.7 &&
        dismissalAnalysis.pattern
      ) {
        dismissalPattern = dismissalAnalysis.pattern;
      }
    }
  } catch (error) {
    console.error("Error analyzing dismissal patterns:", error);
    // Continue even if this fails
  }

  let systemPrompt = `You are an expert social media manager with experience in customer engagement strategy. Your task is to analyze a social media comment and determine:
1. Whether a response is necessary (priority level from 1-10, where 10 is highest priority)
2. Provide 2-3 appropriate response options that sound natural and on-brand
3. Suggest 2-3 emoji reactions that would be appropriate for this comment if a full text response isn't needed

Consider factors like:
- Comment sentiment and tone
- Whether it's a question or requires assistance
- Customer relationship value
- Public relations impact
- Brand voice consistency`;

  if (brandGuidelines) {
    systemPrompt += `\n\nBrand Voice: ${brandGuidelines.brandVoice}\n`;
    try {
      const tonePriorities = JSON.parse(
        brandGuidelines.tonePriorities || "[]",
      ) as string[];
      if (tonePriorities.length > 0)
        systemPrompt += `Tone Priorities: ${tonePriorities.join(", ")}\n`;
      const phrasesToUse = JSON.parse(
        brandGuidelines.phrasesToUse || "[]",
      ) as string[];
      if (phrasesToUse.length > 0)
        systemPrompt += `Phrases to Use: ${phrasesToUse.join(", ")}\n`;
      const phrasesToAvoid = JSON.parse(
        brandGuidelines.phrasesToAvoid || "[]",
      ) as string[];
      if (phrasesToAvoid.length > 0)
        systemPrompt += `Phrases to Avoid: ${phrasesToAvoid.join(", ")}\n`;
      if (brandGuidelines.additionalNotes)
        systemPrompt += `Additional Notes: ${brandGuidelines.additionalNotes}\n`;
      const exampleResponses = JSON.parse(
        brandGuidelines.exampleResponses || "[]",
      ) as string[];
      if (exampleResponses.length > 0)
        systemPrompt += `\nExample Responses in the brand's voice:\n${exampleResponses.map((ex, i) => `${i + 1}. ${ex}`).join("\n")}`;
    } catch {}
  }

  // Add user preference data if available
  if (userPref) {
    systemPrompt += `\n\n[USER RESPONSE HISTORY]\n`;
    systemPrompt += `Preferred Tone: ${userPref.tone || "Not enough data"}\n`;
    systemPrompt += `Typical Length: ${userPref.length || "Not enough data"}\n`;

    if (typeof userPref.positivity === "number") {
      systemPrompt += `Positivity Level: ${userPref.positivity.toFixed(2)} (scale -1 to 1)\n`;
    }

    if (typeof userPref.directness === "number") {
      systemPrompt += `Directness Level: ${userPref.directness.toFixed(2)} (scale 0 to 1)\n`;
    }

    if (userPref.keywords) {
      try {
        const keywords = JSON.parse(userPref.keywords) as string[];
        if (Array.isArray(keywords) && keywords.length > 0) {
          systemPrompt += `Frequently Used Keywords: ${keywords.slice(0, 8).join(", ")}\n`;
        }
      } catch {}
    }

    // Add dismissal pattern information if found
    if (dismissalPattern) {
      systemPrompt += `\n[IMPORTANT BEHAVIORAL INSIGHT]\nUser has previously dismissed similar comments. Pattern: ${dismissalPattern}\nFor this type of comment, consider suggesting the 'Dismissed' action rather than a text response.\n`;
    }

    if (brandSignals) {
      const preferredTones = (
        JSON.parse(brandSignals.preferredTones || "[]") as string[]
      ).join(", ");
      const commonKeywords = (
        JSON.parse(brandSignals.commonKeywords || "[]") as string[]
      ).join(", ");
      const contentPillars = (
        JSON.parse(brandSignals.contentPillars || "[]") as string[]
      ).join(", ");
      const brandSignalsContext = `\n\n[LEARNED BRAND SIGNALS]\n- Preferred Tones: ${preferredTones || "not set"}\n- Common Keywords: ${commonKeywords || "not set"}\n- Content Pillars: ${contentPillars || "not set"}\nUse these learned preferences to tailor your response suggestions.`;
      systemPrompt += brandSignalsContext;
    }
  }

  // Compose the context for AI
  let userPrompt = `\n- Original Post: ${originalPostContent || "[not available]"}\n- Selected Comment by ${comment.authorName}: ${comment.text}\n`;
  if (threadComments.length > 0) {
    userPrompt += `- Other Comments in Thread:\n${threadContext}\n`;
  }
  userPrompt += `\nAnalyze this comment and provide your recommendations. Format as JSON with these fields: 
1. responseNeeded (boolean)
2. priorityLevel (number 1-10)
3. reasoning (string explaining why response is/isn't needed)
4. textResponses (array of 2-3 suggested text responses)
5. emojiSuggestions (array of 2-3 appropriate emoji reactions with explanations)
6. responseStrategy (brief strategy for handling this comment)`;

  try {
    const result = await requestMultimodalModel({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      returnType: z.object({
        responseNeeded: z.boolean(),
        priorityLevel: z.number().min(1).max(10),
        reasoning: z.string(),
        textResponses: z.array(z.string()).min(1),
        emojiSuggestions: z
          .array(
            z.object({
              emoji: z.string(),
              explanation: z.string(),
            }),
          )
          .min(1),
        responseStrategy: z.string(),
      }),
      model: "medium", // Balance between speed and quality
    });
    return result;
  } catch (error) {
    console.error("Error analyzing comment for response:", error);
    throw new Error("Failed to analyze comment. Please try again.");
  }
}

// Generate two high-quality, intentional, non-robotic AI responses with context
export async function generateResponseVariations(input: { commentId: string }) {
  const { userId } = await getAuth({ required: true });

  // Fetch the selected comment with account and page info
  const comment = await db.comment.findFirst({
    where: {
      id: input.commentId,
      userId,
    },
    include: {
      account: true,
      page: true,
    },
  });
  if (!comment) throw new Error("Comment not found");

  // 1. Fetch full context of the original post (text + image)
  let originalPostText = "";
  let originalPostImage: string | undefined = undefined;
  let originalPostSentiment = "neutral";
  let originalPostImageDesc = "";

  // Try to get the post content and image for all platforms
  if (
    comment.platform === "facebook" &&
    comment.account &&
    comment.account.pageToken &&
    comment.postId
  ) {
    try {
      const postRes = await axios.get(
        `https://graph.facebook.com/v18.0/${comment.postId}`,
        {
          params: {
            fields: "message,story,full_picture",
            access_token: comment.account.pageToken,
          },
        },
      );
      originalPostText = postRes.data.message || postRes.data.story || "";
      if (postRes.data.full_picture) {
        originalPostImage = postRes.data.full_picture;
      }
    } catch {
      originalPostText = "";
      originalPostImage = undefined;
    }
  } else if (
    comment.platform === "twitter" &&
    comment.account &&
    comment.account.accessToken &&
    comment.postId
  ) {
    try {
      const tweetRes = await axios.get(
        `https://api.twitter.com/2/tweets/${comment.postId}`,
        {
          headers: {
            Authorization: `Bearer ${comment.account.accessToken}`,
          },
          params: {
            expansions: "attachments.media_keys",
            "media.fields": "url,preview_image_url",
            "tweet.fields": "text",
          },
        },
      );
      originalPostText = tweetRes.data.data?.text || "";
      if (tweetRes.data.includes?.media?.length > 0) {
        const media = tweetRes.data.includes.media[0];
        originalPostImage = media.url || media.preview_image_url;
      }
    } catch {
      originalPostText = "";
      originalPostImage = undefined;
    }
  } else if (
    comment.platform === "youtube" &&
    comment.account &&
    comment.account.accessToken &&
    comment.postId
  ) {
    try {
      const videoRes = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos",
        {
          params: {
            part: "snippet",
            id: comment.postId,
            key: process.env.YOUTUBE_API_KEY || comment.account.accessToken,
          },
        },
      );
      if (videoRes.data.items && videoRes.data.items.length > 0) {
        const video = videoRes.data.items[0];
        originalPostText =
          video.snippet.title + "\n" + (video.snippet.description || "");
        originalPostImage =
          video.snippet.thumbnails?.high?.url ||
          video.snippet.thumbnails?.default?.url;
      }
    } catch {
      originalPostText = "";
      originalPostImage = undefined;
    }
  }

  // 2. If there's an image, analyze it for a human-style description
  if (originalPostImage) {
    try {
      const imgAnalysis = await requestMultimodalModel({
        system:
          "You are an expert at describing images for social media context. Provide a 1-sentence natural description of what is shown in the image, focusing on mood and subject, but do NOT mention 'this image' or 'photo' in the answer.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image for a social media manager.",
              },
              { type: "image_url", image_url: { url: originalPostImage } },
            ],
          },
        ],
        returnType: z.object({ description: z.string() }),
      });
      originalPostImageDesc = imgAnalysis.description;
    } catch {
      originalPostImageDesc = "";
    }
  }

  // 3. Analyze the sentiment/context of the original post (optional, fallback neutral)
  if (originalPostText) {
    try {
      const sentiment = await requestMultimodalModel({
        system:
          "You are a social media sentiment analyst. Classify this text as positive, neutral, or negative.",
        messages: [{ role: "user", content: originalPostText }],
        returnType: z.object({
          sentiment: z.enum(["positive", "neutral", "negative"]),
        }),
      });
      originalPostSentiment = sentiment.sentiment;
    } catch {
      originalPostSentiment = "neutral";
    }
  }

  // 4. Analyze the sentiment/context of the comment
  let commentSentiment = "neutral";
  if (comment.text) {
    try {
      const sentiment = await requestMultimodalModel({
        system:
          "You are a social media sentiment analyst. Classify this text as positive, neutral, or negative.",
        messages: [{ role: "user", content: comment.text }],
        returnType: z.object({
          sentiment: z.enum(["positive", "neutral", "negative"]),
        }),
      });
      commentSentiment = sentiment.sentiment;
    } catch {
      commentSentiment = "neutral";
    }
  }

  // 5. Fetch other comments in the same thread (excluding this one)
  const threadComments = await db.comment.findMany({
    where: {
      platform: comment.platform,
      postId: comment.postId,
      id: { not: comment.id },
      userId,
    },
    orderBy: { createdAt: "asc" },
    select: {
      authorName: true,
      text: true,
      createdAt: true,
    },
    take: 15,
  });
  const threadContext = threadComments
    .map((c) => `${c.authorName}: ${c.text}`)
    .join("\n");

  // 6. Brand guidelines
  const brandGuidelines = await db.brandGuidelines.findUnique({
    where: { userId },
  });
  let brandGuidelinesBlurb = "";
  if (brandGuidelines) {
    brandGuidelinesBlurb += `Brand Voice: ${brandGuidelines.brandVoice}\n`;
    try {
      const tonePriorities = JSON.parse(
        brandGuidelines.tonePriorities || "[]",
      ) as string[];
      if (tonePriorities.length > 0)
        brandGuidelinesBlurb += `Tone Priorities: ${tonePriorities.join(", ")}\n`;
      const phrasesToUse = JSON.parse(
        brandGuidelines.phrasesToUse || "[]",
      ) as string[];
      if (phrasesToUse.length > 0)
        brandGuidelinesBlurb += `Phrases to Use: ${phrasesToUse.join(", ")}\n`;
      const phrasesToAvoid = JSON.parse(
        brandGuidelines.phrasesToAvoid || "[]",
      ) as string[];
      if (phrasesToAvoid.length > 0)
        brandGuidelinesBlurb += `Phrases to Avoid: ${phrasesToAvoid.join(", ")}\n`;
      if (brandGuidelines.additionalNotes)
        brandGuidelinesBlurb += `Additional Notes: ${brandGuidelines.additionalNotes}\n`;
      const exampleResponses = JSON.parse(
        brandGuidelines.exampleResponses || "[]",
      ) as string[];
      if (exampleResponses.length > 0)
        brandGuidelinesBlurb += `Example Responses in the brand's voice:\n${exampleResponses.map((ex, i) => `${i + 1}. ${ex}`).join("\n")}\n`;
    } catch {}
  }

  // 6b. User style preference
  const userPref = await db.userResponsePreference.findUnique({
    where: { userId },
  });
  let userPrefBlurb = "";
  if (userPref) {
    userPrefBlurb = `\n\n[USER STYLE INSIGHTS]\nPreferred Tone: ${userPref.tone || "(not enough data)"}\nTypical Length: ${userPref.length || "(not enough data)"}\nPositivity: ${typeof userPref.positivity === "number" ? userPref.positivity : "(n/a)"}\nDirectness: ${typeof userPref.directness === "number" ? userPref.directness : "(n/a)"}`;
    if (userPref.keywords) {
      try {
        const keywords = JSON.parse(userPref.keywords) as string[];
        if (Array.isArray(keywords) && keywords.length > 0) {
          userPrefBlurb += `\nFrequently used keywords: ${keywords.slice(0, 6).join(", ")}`;
        }
      } catch {}
    }
    userPrefBlurb +=
      "\nUse these as a guide to make the suggested replies match the user's real-world response habits as much as possible.";
  }

  // 7. Build a richer prompt for AI
  const systemPrompt = `You are a world-class social media manager. For the selected comment, generate TWO reply options that are:
- Short (1-2 sentences), punchy, and sound like a real person, not AI (no generic phrases, no 'as an AI', never overly formal)
- Incorporate the full context of the original post (text${originalPostImage ? "+image" : ""}), including what is shown visually
- Take into account the sentiment of the post ('${originalPostSentiment}') and the comment ('${commentSentiment}')
- Match the brand guidelines
- If the comment is positive, keep the response warm and enthusiastic; if negative, be empathetic but not defensive; if neutral, be concise and informative
- Avoid robotic or templated language, avoid em dashes, and never repeat back the comment verbatim
- Do NOT use emoji unless the brand guidelines encourage it
- Each response should be unique in style and approach
- If brand guidelines provide example responses, use them as inspiration, but do NOT copy verbatim

${brandGuidelinesBlurb}${userPrefBlurb}`;

  // Compose a single user prompt with all context
  let userPrompt = `\nOriginal Post (text): ${originalPostText || "[not available]"}\n`;
  if (originalPostImageDesc) {
    userPrompt += `Original Post (image): ${originalPostImageDesc}\n`;
  }
  userPrompt += `Selected Comment by ${comment.authorName} (sentiment: ${commentSentiment}): ${comment.text}\n`;
  if (threadContext) {
    userPrompt += `Other Comments in Thread:\n${threadContext}\n`;
  }
  userPrompt += `\nGenerate two distinctly different, human-sounding reply variations. Format as JSON: {\"variations\": [\"response1\", \"response2\"]}`;

  try {
    const result = await requestMultimodalModel({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      returnType: z.object({
        variations: z.array(z.string().min(1)).length(2),
      }),
      model: "medium",
    });

    // Add unique IDs to each variation
    return {
      variations: result.variations.map((text) => ({ id: nanoid(), text })),
    };
  } catch (error) {
    console.error("Error generating response variations:", error);
    throw new Error(
      "Failed to generate response variations. Please try again.",
    );
  }
}

export async function generateResponse(input: { commentId: string }) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for AI response generation (2 credits)
  await _consumeCredits(
    userId,
    "ai_response_generation",
    2,
    `Generated AI response for comment: ${input.commentId}`,
    { commentId: input.commentId },
  );

  const comment = await db.comment.findFirst({
    where: {
      id: input.commentId,
      userId,
    },
    include: {
      account: true,
      page: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Get brand guidelines if available
  const brandGuidelines = await db.brandGuidelines.findUnique({
    where: { userId },
  });

  // Add user style profile
  const userPref = await db.userResponsePreference.findUnique({
    where: { userId },
  });
  let userPrefBlurb = "";
  if (userPref) {
    userPrefBlurb = `\n\n[USER STYLE INSIGHTS]\nPreferred Tone: ${userPref.tone || "(not enough data)"}\nTypical Length: ${userPref.length || "(not enough data)"}\nPositivity: ${typeof userPref.positivity === "number" ? userPref.positivity : "(n/a)"}\nDirectness: ${typeof userPref.directness === "number" ? userPref.directness : "(n/a)"}`;
    if (userPref.keywords) {
      try {
        const keywords = JSON.parse(userPref.keywords) as string[];
        if (Array.isArray(keywords) && keywords.length > 0) {
          userPrefBlurb += `\nFrequently used keywords: ${keywords.slice(0, 6).join(", ")}`;
        }
      } catch {}
    }
    userPrefBlurb +=
      "\nUse these as a guide to make the suggested reply match the user's real-world response habits as much as possible.";
  }

  let systemPrompt =
    "You are a helpful social media manager assistant. Generate a friendly, professional response to the comment. Keep it concise (max 2-3 sentences) and conversational. Avoid generic responses. Make it sound like it's written by a human, not AI.";

  // Enhance prompt with brand guidelines if available
  if (brandGuidelines) {
    systemPrompt += `\n\nBrand Voice: ${brandGuidelines.brandVoice}\n`;

    try {
      const tonePriorities = JSON.parse(
        brandGuidelines.tonePriorities || "[]",
      ) as string[];
      if (tonePriorities.length > 0) {
        systemPrompt += `Tone Priorities: ${tonePriorities.join(", ")}\n`;
      }

      const phrasesToUse = JSON.parse(
        brandGuidelines.phrasesToUse || "[]",
      ) as string[];
      if (phrasesToUse.length > 0) {
        systemPrompt += `Phrases to Use: ${phrasesToUse.join(", ")}\n`;
      }

      const phrasesToAvoid = JSON.parse(
        brandGuidelines.phrasesToAvoid || "[]",
      ) as string[];
      if (phrasesToAvoid.length > 0) {
        systemPrompt += `Phrases to Avoid: ${phrasesToAvoid.join(", ")}\n`;
      }

      if (brandGuidelines.additionalNotes) {
        systemPrompt += `Additional Notes: ${brandGuidelines.additionalNotes}\n`;
      }

      const exampleResponses = JSON.parse(
        brandGuidelines.exampleResponses || "[]",
      ) as string[];
      if (exampleResponses.length > 0) {
        systemPrompt += `\nExample Responses in the brand's voice:\n${exampleResponses.map((ex, i) => `${i + 1}. ${ex}`).join("\n")}`;
      }
    } catch (error) {
      console.error("Error parsing brand guidelines JSON:", error);
      // Continue without the parsed values if there's an error
    }
  }
  systemPrompt += userPrefBlurb;

  try {
    const result = await requestMultimodalModel({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate a response to this ${comment.platform} comment: "${comment.text}" from user ${comment.authorName}. The comment was made on a post from the account "${comment.account.name}".`,
        },
      ],
      returnType: z.object({
        response: z.string(),
        alternativeResponses: z.array(z.string()).optional(),
      }),
      model: "small", // Simple response generation can use small model
    });

    return result;
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error("Failed to generate response. Please try again.");
  }
}

// New: Update comment status (posted/responded, reacted, dismissed)
export async function updateCommentStatus(input: {
  commentId: string;
  status: "responded" | "reacted" | "dismissed";
  responseText?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const comment = await db.comment.findFirst({
    where: {
      id: input.commentId,
      userId,
    },
    include: { account: true },
  });

  if (!comment) throw new Error("Comment not found");

  const data: any = { status: input.status };
  if (input.status === "responded") {
    data.responded = true;
    data.respondedAt = new Date();
    if (input.responseText) data.responseText = input.responseText;
  } else if (input.status === "reacted" || input.status === "dismissed") {
    data.responded = false;
    data.responseText = null;
    data.respondedAt = null;

    // For dismissals, analyze and learn from the comment to improve future recommendations
    if (input.status === "dismissed") {
      try {
        // Analyze the comment to understand why it might have been dismissed
        await requestMultimodalModel({
          system:
            "You are a comment categorization expert. Analyze this comment and classify its type, topic, and likely reason for dismissal.",
          messages: [{ role: "user", content: comment.text }],
          returnType: z.object({
            commentType: z.string(),
            topic: z.string(),
            likelyDismissalReason: z.string(),
            keywords: z.array(z.string()),
          }),
          model: "small",
        });

        // Store this information for future reference
        // We'll just log it for now, but in a real implementation we might store this in a DismissalPattern table
      } catch (error) {
        console.error("Error analyzing dismissed comment:", error);
        // Continue even if analysis fails
      }
    }
  }

  await db.comment.update({
    where: { id: comment.id },
    data,
  });

  return { success: true };
}

// New: Post content to social media
export async function postContent(input: {
  platform: string;
  accountId: string; // The ID of the Account model
  pageId?: string; // The ID of the Page model (for Facebook)
  content: string;
  imageUrl?: string;
  sourceId?: string;
  sourceType?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const account = await db.account.findFirst({
    where: { id: input.accountId, userId },
    include: { pages: true },
  });

  if (!account) {
    throw new Error(
      "Social media account not found or you don't have permission to use it.",
    );
  }

  let postId;
  let postUrl;

  if (input.platform.toLowerCase() === "facebook") {
    if (!input.pageId) {
      throw new Error("A Facebook Page must be selected to post content.");
    }

    const page = account.pages.find((p) => p.id === input.pageId);
    if (!page || !page.pageToken) {
      throw new Error(
        "Facebook Page not found or its access token is missing.",
      );
    }

    try {
      const endpoint = input.imageUrl
        ? `${page.pageId}/photos`
        : `${page.pageId}/feed`;
      const postData = input.imageUrl
        ? { caption: input.content, url: input.imageUrl }
        : { message: input.content };

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${endpoint}`,
        postData,
        { params: { access_token: page.pageToken } },
      );

      postId = response.data.post_id || response.data.id;
      postUrl = `https://facebook.com/${postId}`;
    } catch (error) {
      console.error("Error posting to Facebook:", error);
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        throw new Error(
          `Facebook API Error: ${error.response.data.error.message}`,
        );
      }
      throw new Error("Failed to post to Facebook.");
    }
  } else if (input.platform.toLowerCase() === "twitter") {
    if (input.imageUrl) {
      // Temporarily allowing image posts to Twitter, though it might not be fully supported by the external API
    }

    try {
      const response = await axios.post(
        "https://api.twitter.com/2/tweets",
        { text: input.content },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      postId = response.data.data.id;
      postUrl = `https://twitter.com/anyuser/status/${postId}`;
    } catch (error) {
      console.error("Error posting to Twitter:", error);
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as {
          title: string;
          detail: string;
        };
        throw new Error(
          `Twitter API Error: ${errorData.title}: ${errorData.detail}`,
        );
      }
      throw new Error("Failed to post to Twitter.");
    }
  } else {
    throw new Error(`Posting to ${input.platform} is not supported yet.`);
  }

  if (postId && input.sourceId && input.sourceType === "GENERATED_CONTENT") {
    await db.generatedContent.update({
      where: { id: input.sourceId },
      data: { status: "PUBLISHED" },
    });
  }

  return {
    success: true,
    postId,
    postUrl,
  };
}

async function updateAnalyticsCache({
  userId,
  cacheKey,
  cacheType,
  status,
  data,
  error,
}: {
  userId: string;
  cacheKey: string;
  cacheType: string;
  status: "GENERATING" | "COMPLETED" | "FAILED" | "PENDING";
  data?: any;
  error?: string;
}) {
  const updateData: any = {
    status,
    error: error || null,
  };
  if (data) {
    updateData.data = JSON.stringify(data);
  }
  if (status === "COMPLETED" || status === "FAILED") {
    updateData.completedAt = new Date();
  }

  return db.analyticsCache.upsert({
    where: { cacheKey },
    update: updateData,
    create: {
      userId,
      cacheKey,
      cacheType,
      status,
      startedAt: new Date(),
      data: data ? JSON.stringify(data) : null,
      error: error || null,
    },
  });
}

export async function findOrCreateContentPillar(input: {
  name: string;
  description?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const existingPillar = await db.contentPillar.findFirst({
    where: {
      userId,
      name: {
        equals: input.name,
      },
    },
  });

  if (existingPillar) {
    return existingPillar;
  }

  return await db.contentPillar.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
    },
  });
}

export async function generateContentFromTrendingTopic(input: {
  topic: {
    id: string;
    topic: string;
    sentiment: string;
    relevanceScore: number;
    executiveSummary: string;
    strategicAngle: string;
    exampleHook: string;
    samplePost: string;
    historicalData: string;
    contentFormatSuggestions: string[];
  };
  format: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for content generation (5 credits)
  await _consumeCredits(
    userId,
    "content_generation",
    5,
    `Generated content from trending topic: ${input.topic.topic}`,
    { topic: input.topic.topic, format: input.format },
  );

  // Check for cached content first
  const cacheKey = generateContentCacheKey(
    `trending_topic:${input.topic.topic}:${input.format}`,
    userId,
  );

  const cachedContent = await getCachedContent(cacheKey);
  if (cachedContent) {
    const parsed = JSON.parse(cachedContent) as {
      taskId?: string;
      contentId: string;
    };
    return {
      taskId: parsed.taskId || "cached",
      contentId: parsed.contentId,
      cached: true,
    };
  }

  const pillar = await findOrCreateContentPillar({
    name: input.topic.topic,
    description: input.topic.executiveSummary,
  });

  let contentType: "TEXT" | "IMAGE" | "VIDEO" = "TEXT";
  const formatLower = input.format.toLowerCase();
  if (formatLower.includes("video")) {
    contentType = "VIDEO";
  } else if (
    formatLower.includes("image") ||
    formatLower.includes("infographic") ||
    formatLower.includes("visual")
  ) {
    contentType = "IMAGE";
  }

  const generatedContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: pillar.id,
      title: `Generating: ${input.format} for ${input.topic.topic}`,
      type: contentType,
      content: "Content is being generated...",
      sourceIdea: JSON.stringify({ topic: input.topic, format: input.format }),
      status: "GENERATING",
    },
  });

  const task = await queueTask(async () => {
    try {
      const generationResult = await requestMultimodalModel({
        system: `You are an expert content creator. Generate content based on the user's prompt and requested format. The user is working within the content pillar "${pillar.name}".`,
        messages: [
          {
            role: "user",
            content: `Pillar: ${pillar.name}\nTopic Details: ${JSON.stringify(
              input.topic,
            )}\nRequested Format: ${
              input.format
            }\n\nPlease generate a piece of content that fits this request. For images or videos, provide a detailed generation prompt. For text, provide the full text.`,
          },
        ],
        returnType: z.object({
          title: z.string(),
          content: z
            .string()
            .describe(
              "The generated text, or a prompt for image/video generation.",
            ),
        }),
      });

      let finalContent = generationResult.content;

      if (contentType === "IMAGE") {
        const imageResult = await requestMultimodalModel({
          system: "You are an image generation assistant.",
          messages: [
            {
              role: "user",
              content: `Generate an image for the following prompt: ${generationResult.content}`,
            },
          ],
          returnType: z.object({ imageUrl: z.string() }),
        });
        finalContent = imageResult.imageUrl;
      } else if (contentType === "VIDEO") {
        // Placeholder for video generation logic
        finalContent = "Video generation is not yet implemented.";
      }

      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          title: generationResult.title,
          content: finalContent,
          status: "DRAFT",
        },
      });

      // Cache the successful result
      await setCachedContent(
        cacheKey,
        JSON.stringify({ taskId: task.id, contentId: generatedContent.id }),
        userId,
      );
    } catch (error) {
      console.error(
        `[Task] Failed to generate content from topic ${input.topic.topic}:`,
        error,
      );
      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          status: "FAILED",
          content: error instanceof Error ? error.message : "Generation failed",
        },
      });
    }
  });

  const result = { taskId: task.id, contentId: generatedContent.id };

  // Cache the result
  await setCachedContent(cacheKey, JSON.stringify(result), userId);

  return result;
}

export async function generateContentFromViralPotential(input: {
  post: {
    id: string;
    concept: string;
    viralityScore: number;
    targetPlatforms: string[];
    justification: string;
    hook: string;
    body: string;
    callToAction: string;
    hashtags: string[];
    creativeDirection: string;
    optimizationTips: string;
  };
}) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for viral content generation (5 credits)
  await _consumeCredits(
    userId,
    "viral_content_generation",
    5,
    `Generated content from viral potential: ${input.post.concept}`,
    { concept: input.post.concept },
  );

  const pillar = await findOrCreateContentPillar({
    name: input.post.concept,
    description: input.post.justification,
  });

  let contentType: "TEXT" | "IMAGE" | "VIDEO" = "TEXT";
  const creativeDirectionLower = input.post.creativeDirection.toLowerCase();
  if (creativeDirectionLower.includes("video")) {
    contentType = "VIDEO";
  } else if (
    creativeDirectionLower.includes("image") ||
    creativeDirectionLower.includes("infographic") ||
    creativeDirectionLower.includes("visual")
  ) {
    contentType = "IMAGE";
  }

  const generatedContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: pillar.id,
      title: `Generating: ${input.post.concept}`,
      type: contentType,
      content: "Content is being generated...",
      sourceIdea: JSON.stringify({ post: input.post }),
      status: "GENERATING",
    },
  });

  const task = await queueTask(async () => {
    try {
      const generationResult = await requestMultimodalModel({
        system: `You are an expert content creator. Generate content based on the user's prompt and requested format. The user is working within the content pillar "${pillar.name}".`,
        messages: [
          {
            role: "user",
            content: `Pillar: ${pillar.name}\nViral Potential Details: ${JSON.stringify(
              input.post,
            )}\n\nPlease generate a piece of content that fits this request. For images or videos, provide a detailed generation prompt. For text, provide the full text.`,
          },
        ],
        returnType: z.object({
          title: z.string(),
          content: z
            .string()
            .describe(
              "The generated text, or a prompt for image/video generation.",
            ),
        }),
      });

      let finalContent = generationResult.content;

      if (contentType === "IMAGE") {
        const imageResult = await requestMultimodalModel({
          system: "You are an image generation assistant.",
          messages: [
            {
              role: "user",
              content: `Generate an image for the following prompt: ${generationResult.content}`,
            },
          ],
          returnType: z.object({ imageUrl: z.string() }),
        });
        finalContent = imageResult.imageUrl;
      } else if (contentType === "VIDEO") {
        // Placeholder for video generation logic
        finalContent = "Video generation is not yet implemented.";
      }

      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          title: generationResult.title,
          content: finalContent,
          status: "DRAFT",
        },
      });
    } catch (error) {
      console.error(
        `[Task] Failed to generate content from viral potential ${input.post.concept}:`,
        error,
      );
      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          status: "FAILED",
          content: error instanceof Error ? error.message : "Generation failed",
        },
      });
    }
  });

  return { taskId: task.id, contentId: generatedContent.id };
}

export async function generateContentForPillar(input: {
  pillarId: string;
  prompt: string;
  format: string; // e.g. "Infographics/visual explainers on beach access rules"
}) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for content pillar generation (4 credits)
  await _consumeCredits(
    userId,
    "content_pillar_generation",
    4,
    `Generated content for pillar: ${input.pillarId}`,
    { pillarId: input.pillarId, format: input.format },
  );

  const pillar = await db.contentPillar.findFirst({
    where: { id: input.pillarId, userId },
  });

  if (!pillar) {
    throw new Error("Content pillar not found.");
  }

  let contentType: "TEXT" | "IMAGE" | "VIDEO" = "TEXT";
  if (input.format.toLowerCase().includes("video")) {
    contentType = "VIDEO";
  } else if (
    input.format.toLowerCase().includes("image") ||
    input.format.toLowerCase().includes("infographic") ||
    input.format.toLowerCase().includes("visual")
  ) {
    contentType = "IMAGE";
  }

  const generatedContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: input.pillarId,
      title: `Generating: ${input.format}`,
      type: contentType,
      content: "Content is being generated...",
      sourceIdea: JSON.stringify({
        prompt: input.prompt,
        format: input.format,
      }),
      status: "GENERATING",
    },
  });

  const task = await queueTask(async () => {
    try {
      const generationResult = await requestMultimodalModel({
        system: `You are an expert content creator. Generate content based on the user's prompt and requested format. The user is working within the content pillar "${pillar.name}".`,
        messages: [
          {
            role: "user",
            content: `Pillar: ${pillar.name}\nPrompt: ${input.prompt}\nFormat: ${input.format}\n\nPlease generate a piece of content that fits this request. For images or videos, provide a detailed generation prompt. For text, provide the full text.`,
          },
        ],
        returnType: z.object({
          title: z.string(),
          content: z
            .string()
            .describe(
              "The generated text, or a prompt for image/video generation.",
            ),
        }),
      });

      let finalContent = generationResult.content;

      if (contentType === "IMAGE") {
        const imageResult = await requestMultimodalModel({
          system: "You are an image generation assistant.",
          messages: [
            {
              role: "user",
              content: `Generate an image for the following prompt: ${generationResult.content}`,
            },
          ],
          returnType: z.object({ imageUrl: z.string() }),
        });
        finalContent = imageResult.imageUrl;
      } else if (contentType === "VIDEO") {
        // Placeholder for video generation logic
        finalContent = "Video generation is not yet implemented.";
      }

      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          title: generationResult.title,
          content: finalContent,
          status: "DRAFT",
        },
      });
    } catch (error) {
      console.error(
        `[Task] Failed to generate content for pillar ${input.pillarId}:`,
        error,
      );
      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          status: "FAILED",
          content: error instanceof Error ? error.message : "Generation failed",
        },
      });
    }
  });

  return { taskId: task.id, contentId: generatedContent.id };
}

export async function listContentPillars() {
  const { userId } = await getAuth({ required: true });
  return await db.contentPillar.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function listGeneratedContent(input: { pillarId: string }) {
  const { userId } = await getAuth({ required: true });
  return await db.generatedContent.findMany({
    where: {
      userId,
      pillarId: input.pillarId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function updateGeneratedContent(input: {
  contentId: string;
  title?: string;
  content?: string;
  status?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const contentToUpdate = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
    },
  });

  if (!contentToUpdate) {
    throw new Error(
      "Content not found or you do not have permission to edit it.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contentId, ...dataToUpdate } = input;

  return await db.generatedContent.update({
    where: {
      id: input.contentId,
    },
    data: dataToUpdate,
  });
}

function getAnalyticsCacheKey(
  type: string,
  userId: string,
  input?: { pageId?: string; platform?: string },
) {
  return `${type}_${userId}_${input?.pageId || "all"}_${input?.platform || "all"}`;
}

// Trends API - Get trending content and analytics

export type ActionableContentRecommendation = {
  id: string;
  pillar: string;
  title: string;
  format: string;
  contentBrief: string;
  cta?: string;
  assetPrompt?: string;
  videoScript?: string;
};

export type ContentIdea = z.infer<typeof CalendarPostSchema>;

const CalendarPostSchema = z.object({
  id: z.string(),
  pillar: z.string(),
  title: z.string(),
  format: z.string(),
  contentBrief: z.string(),
  cta: z.string(),
  assetPrompt: z.string().optional(),
  videoScript: z.string().optional(),
  rationale: z.string(),
  viralityScore: z.number().min(0).max(10),
  recommendedTime: z.string(),
  targetPlatforms: z.array(z.string()),
});

const DailyCalendarSchema = z.object({
  date: z.string(), // "YYYY-MM-DD"
  dayOfWeek: z.string(),
  posts: z.array(CalendarPostSchema),
  dailyRationale: z.string(),
});

const ContentStrategyCalendarSchema = z.object({
  strategySummary: z.object({
    keyThemes: z.array(z.string()).describe("3-4 central themes for the week."),
    targetAudience: z
      .string()
      .describe("A brief description of the primary target audience."),
    contentMix: z
      .object({
        Informational: z
          .number()
          .describe("Percentage of informational content."),
        Inspirational: z
          .number()
          .describe("Percentage of inspirational content."),
        Entertaining: z
          .number()
          .describe("Percentage of entertaining content."),
        Promotional: z.number().describe("Percentage of promotional content."),
      })
      .describe("Recommended content type split, summing to 100."),
    kpis: z
      .array(z.string())
      .describe("3 key performance indicators to track."),
  }),
  calendar: z.array(DailyCalendarSchema).length(7),
  engagementTactics: z.array(z.string()),
});

export async function resetContentStrategyStatus() {
  const { userId } = await getAuth({ required: true });

  await db.contentStrategy.upsert({
    where: { userId },
    update: {
      status: "NONE",
      error: "Manually reset by user.",
      strategyData: null,
    },
    create: {
      userId,
      status: "NONE",
      error: "Manually reset by user.",
    },
  });

  return { success: true };
}

export async function refreshContentStrategy(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const updateStatus = async (status: string, error?: string | null) => {
    await db.contentStrategy.upsert({
      where: { userId },
      update: { status, error: error || null },
      create: { userId, status },
    });
  };

  await updateStatus("PENDING");

  const task = await queueTask(async () => {
    try {
      await updateStatus("FETCHING_DATA");
      const comments = await db.comment.findMany({
        where: {
          userId,
          ...(input?.pageId ? { pageId: input.pageId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      });

      const brandGuidelines = await db.brandGuidelines.findUnique({
        where: { userId },
      });

      const feedback = await db.recommendationFeedback.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20, // A sample of recent feedback
      });

      const brandSignals = await db.brandSignal.findUnique({
        where: { userId },
      });
      const brandSignalsContext = brandSignals
        ? `\n\n**Learned Brand Signals (Your Taste Profile):**\n- Your Preferred Tones: ${brandSignals.preferredTones}\n- Your Common Keywords: ${brandSignals.commonKeywords}\n- Your Successful Content Pillars: ${brandSignals.contentPillars}`
        : "";

      const allDocuments = await db.uploadedDocument.findMany({
        where: { userId },
        select: { name: true, url: true, fileType: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      await updateStatus("GENERATING_CALENDAR");

      const contentParts: {
        type: string;
        text?: string;
        pdf_url?: { url: string };
        image_url?: { url: string };
      }[] = [];

      contentParts.push({
        type: "text",
        text: `
    Analyze the following social media comments, brand guidelines, user feedback, and learned brand signals to create a comprehensive content strategy. The learned brand signals are the most important input for personalization - adhere to them closely.

    **Brand Guidelines:**
    - Voice: ${brandGuidelines?.brandVoice || "Not set"}
    - Tone Priorities: ${brandGuidelines?.tonePriorities || "Not set"}
    - Phrases to Use: ${brandGuidelines?.phrasesToUse || "Not set"}
    - Phrases to Avoid: ${brandGuidelines?.phrasesToAvoid || "Not set"}

    **Recent Comments (${comments.length} comments):**
    ${comments
      .slice(0, 10)
      .map((c) => `- "${c.text}"`)
      .join("\n")}
      
        **User Feedback on Past Suggestions:**
    ${feedback
      .map((f) => {
        let tags = "N/A";
        if (f.feedbackTags) {
          try {
            const parsedTags = JSON.parse(f.feedbackTags);
            if (Array.isArray(parsedTags) && parsedTags.length > 0) {
              tags = parsedTags.join(", ");
            }
          } catch {
            // Ignore parsing errors, tags will remain 'N/A'
          }
        }
        return `- Suggestion was rated '${f.feedbackType}'. Recommendation ID: ${f.recommendationId}. Reason: ${tags}. Comment: ${f.feedbackComment || "N/A"}`;
      })
      .join("\n")}
      ${brandSignalsContext}
      `,
      });

      if (allDocuments.length > 0) {
        // Documents are temporarily disabled for performance optimization.
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dates = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(tomorrow);
        date.setDate(tomorrow.getDate() + i);
        return date.toISOString().split("T")[0];
      });

      contentParts.push({
        type: "text",
        text: `
    Based on the provided comments and brand guidelines, create a comprehensive content strategy.

    **Part 1: High-Level Strategy Summary**
    Generate a 'strategySummary' object that includes:
    - 'keyThemes': An array of 3-4 central themes for the upcoming week.
    - 'targetAudience': A brief description of the primary target audience.
    - 'contentMix': An object showing the recommended percentage split (summing to 100) for content types: 'Informational', 'Inspirational', 'Entertaining', 'Promotional'.
    - 'kpis': An array of 3 key performance indicators to track for the week (e.g., "Engagement Rate", "Follower Growth").

    **Part 2: 7-Day Content Calendar**
    Create a 7-day content calendar starting from tomorrow (${dates[0]}).
    For each of the 7 days:
    1. The date MUST be one of these: ${dates.join(", ")}.
    2. Provide a 'dayOfWeek'.
    3. Include a 'dailyRationale' explaining the strategy for that day.
    4. Propose 1 'post'. For each post, include:
        - a unique 'id'
        - 'pillar': The content pillar it belongs to.
        - 'title': A catchy title.
        - 'format': e.g., 'Image Post', 'Video', 'Article', 'Story'.
        - 'contentBrief': A detailed description of the content.
        - 'cta': A clear call to action.
        - 'assetPrompt' (optional): A DALL-E prompt for a visual.
        - 'videoScript' (optional): A short script if the format is video.
        - 'rationale': Why this post is recommended for this day/time.
        - 'viralityScore': A 1-10 score predicting engagement potential.
        - 'recommendedTime': e.g., '9:30 AM PST'.
        - 'targetPlatforms': e.g., ['Instagram', 'Twitter'].
    
    **Part 3: Engagement Tactics**
    Provide a general list of 'engagementTactics'.
  `,
      });

      const result = await requestMultimodalModel({
        system:
          "You are a world-class content strategist. Your goal is to generate a deep, actionable 7-day content calendar based on provided data (comments and brand guidelines). You must follow the requested JSON schema precisely.",
        messages: [{ role: "user", content: contentParts as any[] }],
        returnType: ContentStrategyCalendarSchema,
        model: "small",
      });

      const cleanedResult = {
        ...result,
        calendar: result.calendar.map((day) => ({
          ...day,
          posts: day.posts.map((post) => ({ ...post, id: nanoid() })),
        })),
        engagementTactics: result.engagementTactics.map((tactic) =>
          tactic.replace(/\*\*/g, ""),
        ),
      };

      const strategyJson = JSON.stringify(cleanedResult);

      await db.contentStrategy.upsert({
        where: { userId },
        update: {
          strategyData: strategyJson,
          status: "COMPLETED",
          error: null,
          updatedAt: new Date(),
        },
        create: {
          userId,
          strategyData: strategyJson,
          status: "COMPLETED",
          error: null,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await updateStatus("FAILED", errorMessage);
    }
  });

  return { taskId: task.id };
}

export async function generateContentStrategy() {
  const { userId } = await getAuth({ required: true });

  const cachedStrategy = await db.contentStrategy.findUnique({
    where: { userId },
  });

  if (cachedStrategy && cachedStrategy.strategyData) {
    try {
      const strategyData = ContentStrategyCalendarSchema.parse(
        JSON.parse(cachedStrategy.strategyData),
      );
      return {
        ...strategyData,
        updatedAt: cachedStrategy.updatedAt,
        status: cachedStrategy.status,
      };
    } catch {
      console.warn(
        "Cached content strategy is invalid and will be regenerated. This can happen after an update and is not a critical error.",
      );
      // Invalidate cache by clearing the data and resetting status
      await db.contentStrategy.update({
        where: { id: cachedStrategy.id },
        data: {
          strategyData: null,
          status: "NONE",
          error: "Cached data was invalid and has been cleared.",
        },
      });
      return { status: "NONE" };
    }
  }

  return { status: cachedStrategy?.status || "NONE" };
}

// Content Recommendations Generation (AI-powered)
export async function generateContentRecommendations(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });
  // Gather recent trends, engagement, comments, brand guidelines
  const comments = await db.comment.findMany({
    where: {
      userId,
      ...(input?.pageId ? { pageId: input.pageId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const brandGuidelines = await db.brandGuidelines.findUnique({
    where: { userId },
  });

  const brandSignals = await db.brandSignal.findUnique({ where: { userId } });

  const cacheKey = getAnalyticsCacheKey("advanced_insights", userId, input);
  const trends = await db.analyticsCache.findUnique({
    where: { cacheKey },
  });
  let trendingTopics: any[] = [];
  if (trends?.data && trends.status === "COMPLETED") {
    try {
      trendingTopics = (JSON.parse(trends.data) as any).trendingTopics || [];
    } catch {
      // ignore
    }
  }

  const brandSignalsContext = brandSignals
    ? `\n\nLearned Brand Signals (User's Taste Profile):\n- Preferred Tones: ${brandSignals.preferredTones}\n- Common Keywords: ${brandSignals.commonKeywords}\n- Content Pillars: ${brandSignals.contentPillars}`
    : "";

  // Prompt for content recommendations
  const promptObj = {
    comments: comments.map((c) => ({
      text: c.text,
      platform: c.platform,
      author: c.authorName,
      date: c.createdAt,
    })),
    trendingTopics,
    brandVoice: brandGuidelines?.brandVoice,
    brandGuidelines,
  };
  // LLM call
  const aiResult = await requestMultimodalModel({
    system: `You are an elite social content strategist. Given recent comments, engagement, trending topics, and brand guidelines, generate 6 ready-to-post recommendations for the brand. Each should include: title, caption, suggested format (post/story/video), optionally imageUrl (AI-generated), optionally videoScript, targetPlatforms (e.g. facebook, instagram), and relevantTrends (from provided trending topics). Use the learned brand signals as a strong guide for the tone and topics to pursue. ${brandSignalsContext}`,
    messages: [{ role: "user", content: JSON.stringify(promptObj) }],
    returnType: z.object({
      recommendations: z.array(
        z.object({
          title: z.string(),
          caption: z.string(),
          format: z.string(),
          imageUrl: z.string().optional(),
          videoScript: z.string().optional(),
          targetPlatforms: z.array(z.string()),
          relevantTrends: z.array(z.string()).optional(),
        }),
      ),
    }),
    model: "medium",
  });
  // Optionally: cache in DB, e.g. in TrendsAnalysis table (not implemented here)
  return aiResult.recommendations;
}

async function _internal_generateAllInsights(
  userId: string,
  cacheKey: string,
  pageId?: string,
  platform?: string,
) {
  try {
    // 1. Fetch data
    const allComments = await db.comment.findMany({
      where: {
        userId,
        ...(pageId ? { pageId } : {}),
        ...(platform && platform !== "all" ? { platform } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { text: true, platform: true, authorName: true },
    });

    const allDocuments = await db.uploadedDocument.findMany({
      where: { userId },
      select: { name: true, url: true, fileType: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const brandGuidelines = await db.brandGuidelines.findUnique({
      where: { userId },
    });

    const brandSignals = await db.brandSignal.findUnique({ where: { userId } });

    if (allComments.length < 10 && allDocuments.length === 0) {
      await updateAnalyticsCache({
        userId,
        cacheKey,
        cacheType: "advanced_insights",
        status: "FAILED",
        error: "Not enough comments or documents for analysis.",
      });
      return;
    }

    // NEW STEP: Extract core topics from user data
    let coreTopics: string[] = [];
    if (allComments.length > 0 || allDocuments.length > 0) {
      const topicExtractionContent = `
        Comments: ${JSON.stringify(allComments.map((c) => c.text).slice(0, 20))}
        Documents: ${JSON.stringify(allDocuments.map((d) => d.name))}
      `;

      try {
        const topicResult = await requestMultimodalModel({
          system:
            "You are an expert at identifying key themes and topics from raw text data. Extract the top 3-5 most important topics.",
          messages: [
            {
              role: "user",
              content: `Based on the following comments and document titles, what are the core topics for this user? \n\n${topicExtractionContent}`,
            },
          ],
          returnType: z.object({
            topics: z
              .array(z.string())
              .describe("An array of 3-5 core topics."),
          }),
          model: "small",
        });
        coreTopics = topicResult.topics;
      } catch (topicError) {
        console.error("Failed to extract core topics:", topicError);
        // Continue without topics if this fails
      }
    }

    // NEW STEP: Perform web search for each topic
    let webResearchSummary = "";
    let webResearchSources: { title: string; url: string }[] = [];
    if (coreTopics.length > 0) {
      try {
        const researchResult = await requestMultimodalModel({
          system:
            "You are a research assistant. For each topic provided, perform a web search to find the latest trends, discussions, and relevant articles, prioritizing recent news and developments from the last 24 hours up to a maximum of 7 days. Synthesize the findings into a concise summary for each topic and provide the source URLs.",
          messages: [
            {
              role: "user",
              content: `Please provide a research summary and sources for the following topics, prioritizing recent news and developments from the last 24 hours up to a maximum of 7 days: ${coreTopics.join(
                ", ",
              )}`,
            },
          ],
          returnType: z.object({
            summary: z
              .string()
              .describe(
                "A consolidated summary of the web research for all topics.",
              ),
            sources: z
              .array(z.object({ title: z.string(), url: z.string() }))
              .optional()
              .describe("A list of sources used for the summary."),
          }),
          model: "medium", // Use medium for better synthesis
        });
        webResearchSummary = researchResult.summary;
        if (researchResult.sources) {
          webResearchSources = researchResult.sources;
        }
      } catch (researchError) {
        console.error("Failed to perform web research:", researchError);
        // Continue without research if this fails
      }
    }

    // 2. Construct a single, comprehensive prompt
    const brandGuidelinesContext = brandGuidelines
      ? `\n\nBrand Guidelines:\n- Voice: ${brandGuidelines.brandVoice}\n- Tone: ${brandGuidelines.tonePriorities}\n- Phrases to use: ${brandGuidelines.phrasesToUse}\n- Phrases to avoid: ${brandGuidelines.phrasesToAvoid}`
      : "";

    const brandSignalsContext = brandSignals
      ? `\n\nLearned Brand Signals (User's Taste Profile):\n- Preferred Tones: ${brandSignals.preferredTones}\n- Common Keywords: ${brandSignals.commonKeywords}\n- Content Pillars: ${brandSignals.contentPillars}`
      : "";

    // 2. Construct a multipart message for the AI model
    const contentParts: {
      type: string;
      text?: string;
      pdf_url?: { url: string };
      image_url?: { url: string };
    }[] = [];

    // Add initial prompt text
    contentParts.push({
      type: "text",
      text: `
        You are a master social media strategist with expertise in brand-specific content creation. Your task is to analyze the provided social media comments, brand guidelines, learned brand signals, AND the latest web research to generate highly relevant, brand-contextualized insights.
        
        CRITICAL INSTRUCTIONS:
        - Every insight must be deeply tailored to THIS specific brand's voice, audience, and context
        - Use the brand guidelines and learned signals as the PRIMARY filter for all recommendations
        - Leverage audience insights to ensure content ideas resonate with the specific personas identified
        - Contextualize trending topics to show how they specifically relate to this brand's niche and audience
        - Provide clear justification for why each recommendation is relevant to THIS brand (not generic advice)
        - Focus on actionable insights that align with the brand's established content pillars and communication style

        **Input Data:**
        - **Core Topics Identified:** ${coreTopics.join(", ") || "N/A"}
        - **Web Research Summary:** ${webResearchSummary || "N/A"}
        - **Web Research Sources:** ${JSON.stringify(webResearchSources) || "N/A"}
        - **Comments:** ${JSON.stringify(allComments.map((c) => c.text))}
        ${brandGuidelinesContext}
        ${brandSignalsContext}
      `,
    });

    // Add documents to contentParts with truncation logic
    for (const doc of allDocuments) {
      if (doc.fileType === "application/pdf" && doc.url) {
        try {
          // PDF processing temporarily disabled due to missing library
          console.log(
            `Skipping PDF processing for ${doc.name} - library not available`,
          );
          contentParts.push({
            type: "text",
            text: `[Info: PDF document ${doc.name} available but processing disabled]`,
          });
        } catch (pdfError) {
          console.error(`Failed to process PDF ${doc.name}:`, pdfError);
          contentParts.push({
            type: "text",
            text: `[Info: Failed to process document: ${doc.name}]`,
          });
        }
      } else if (doc.url && doc.fileType.startsWith("image/")) {
        contentParts.push({
          type: "image_url",
          image_url: { url: doc.url },
        });
      }
    }

    // Add the final instruction part
    contentParts.push({
      type: "text",
      text: `
        **Required Output (JSON format):**
        Based on all the provided data (comments and any documents), generate the following insights:

        1.  **Trending Topics:**
            - Consolidate and identify the top 5 most important trending topics that are RELEVANT to this specific brand's niche and audience.
            - CRITICAL: Each topic must be contextualized to show how it specifically relates to this brand's content pillars, audience interests, and business objectives.
            - For each topic, provide a deep analysis including:
              * Executive summary: How this trend specifically impacts this brand's industry/niche
              * Strategic angle: Why this brand should care about this trend (brand-specific reasoning)
              * Brand connection: Explicit explanation of how this trend aligns with the brand's voice, values, and content pillars
              * Audience relevance: How this trend resonates with the identified personas and their motivations
              * Example hook: Written in the brand's specific voice and tone
              * Sample post: Crafted to match the brand's communication style and avoid phrases they want to avoid
              * Historical context: Relevant background that helps this brand understand the trend's significance
              * Content format suggestions: Tailored to the brand's preferred content types and platform strategy
              * Credible sources: YOU MUST USE the provided Web Research Sources for citations. Do not make up URLs.
            - REQUIREMENT: Generic trending topics without clear brand relevance should be excluded. Focus on trends that this specific brand can authentically engage with.

        2.  **Viral Content Potential:**
            - Identify 3-5 content ideas with the highest viral potential that are SPECIFICALLY TAILORED to this brand's voice, audience, and context.
            - CRITICAL: Each idea must be deeply contextualized for this specific brand using the provided brand guidelines, learned brand signals, and audience insights.
            - For each idea, provide a full breakdown including:
              * Concept: A clear, brand-specific content idea
              * Virality score (1-10): Based on trend momentum and brand alignment
              * Target platforms: Specific to where this brand's audience is most active
              * Brand relevance justification: Explain WHY this idea is perfect for THIS specific brand (reference brand voice, tone, content pillars, and audience insights)
              * Audience alignment: How this idea speaks to the identified personas and their motivations
              * Hook: Crafted in the brand's specific voice and tone
              * Body: Written to match the brand's communication style and avoid phrases they want to avoid
              * CTA: Aligned with the brand's typical engagement patterns
              * Hashtags: Mix of trending and brand-relevant tags
              * Creative direction: Specific to the brand's visual style and content preferences
              * Optimization tips: Tailored to this brand's audience behavior and platform preferences
              * Credible sources: YOU MUST USE the provided Web Research Sources for citations. Do not make up URLs.
            - REQUIREMENT: Each content idea must demonstrate clear understanding of the brand's unique positioning and audience needs. Generic ideas will be rejected.

        3.  **Audience Insights:**
            - Consolidate identified personas into a cohesive set of 3-4 primary personas that are SPECIFIC to this brand's actual audience.
            - CRITICAL: Base personas on the actual comments and engagement patterns observed, not generic assumptions.
            - For each persona, provide:
              * Persona name: Descriptive and memorable
              * Description: Based on actual audience behavior and comments
              * Motivations: What drives them to engage with this specific brand
              * Pain points: Real challenges they face that this brand can address
              * Communication tips: How to speak to them using this brand's voice and tone
              * Engagement patterns: When and how they interact with this brand's content
              * Preferred content formats: What types of content they respond to best
              * Channels: Where they're most active and engaged
              * Content preferences: Topics and themes that resonate with them based on observed behavior
            - Also provide an overall sentiment analysis (score, trend, analysis) based on actual comment sentiment
            - Summary of competitive mentions (competitor, sentiment, count) if observed in the data
            - REQUIREMENT: All insights must be grounded in the actual data provided, not generic persona templates.
      `,
    });

    // 3. Call the AI model once
    const result = await requestMultimodalModel({
      system: `You are a master social media strategist specializing in brand-specific content strategy. Your expertise lies in creating highly relevant, contextualized recommendations that leverage deep audience insights and brand understanding. You must provide a comprehensive analysis based on all provided data, including comments, brand guidelines, learned brand signals, web research, and any attached documents. Every recommendation must demonstrate clear understanding of this specific brand's unique positioning, audience needs, and communication style.`,
      messages: [{ role: "user", content: contentParts as any[] }],
      returnType: z.object({
        trendingTopics: AdvancedInsightsSchema.shape.trendingTopics,
        viralContentPotential:
          AdvancedInsightsSchema.shape.viralContentPotential,
        audienceInsights: AdvancedInsightsSchema.shape.audienceInsights,
      }),
      model: "medium", // Use a medium model for this complex task
    });

    // 4. Update cache with the result
    await updateAnalyticsCache({
      userId,
      cacheKey,
      cacheType: "advanced_insights",
      status: "COMPLETED",
      data: result,
    });
  } catch (error) {
    console.error("Error in _internal_generateAllInsights:", error);
    let errorMessage = "An unknown error occurred during insights generation.";
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes("fetch failed")) {
        errorMessage =
          "The request to our AI service failed. This can happen with very large documents or a high volume of comments. We're working on making this more robust. Please try again in a few moments.";
      } else {
        errorMessage = error.message;
      }
    }
    await updateAnalyticsCache({
      userId,
      cacheKey,
      cacheType: "advanced_insights",
      status: "FAILED",
      error: errorMessage,
    });
  }
}

export async function triggerAdvancedInsightsGeneration(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for advanced insights generation (10 credits)
  await _consumeCredits(
    userId,
    "advanced_insights_generation",
    10,
    "Generated comprehensive advanced insights with AI analysis",
    { pageId: input?.pageId, platform: input?.platform },
  );

  const cacheKey = getAnalyticsCacheKey("advanced_insights", userId, input);

  await updateAnalyticsCache({
    userId,
    cacheKey,
    cacheType: "advanced_insights",
    status: "GENERATING",
  });

  const task = await queueTask(async () => {
    await _internal_generateAllInsights(
      userId,
      cacheKey,
      input?.pageId,
      input?.platform,
    );
  });

  return { taskId: task.id, cacheKey };
}

export async function getAdvancedInsights(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });
  const cacheKey = getAnalyticsCacheKey("advanced_insights", userId, input);
  const trends = await db.analyticsCache.findUnique({
    where: { cacheKey },
  });

  if (!trends) {
    return null;
  }

  // Check if cache is expired (6 hours for advanced insights)
  const CACHE_EXPIRY_HOURS = 6;
  const cacheExpiry = new Date(
    trends.startedAt.getTime() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  const isExpired = new Date() > cacheExpiry;

  if (isExpired && trends.status === "COMPLETED") {
    // Cache is expired, delete it and return null to trigger regeneration
    await db.analyticsCache.delete({ where: { cacheKey } });
    return null;
  }

  if (trends.status === "GENERATING" || trends.status === "PENDING") {
    return { status: trends.status, lastUpdated: trends.startedAt };
  }

  if (trends.status === "FAILED" && trends.error) {
    // Delete failed cache and return null to trigger regeneration
    await db.analyticsCache.delete({ where: { cacheKey } });
    return null;
  }

  if (!trends.data) {
    return { status: "NODATA" };
  }

  try {
    const parsed = AdvancedInsightsSchema.parse(JSON.parse(trends.data));
    const trendingTopicsWithIds = parsed.trendingTopics?.map((t) => ({
      ...t,
      id: nanoid(),
    }));
    const viralContentPotentialWithIds = parsed.viralContentPotential?.map(
      (p) => ({ ...p, id: nanoid() }),
    );
    const audienceInsightsWithIds = parsed.audienceInsights
      ? {
          ...parsed.audienceInsights,
          personas: parsed.audienceInsights.personas.map((p) => ({
            ...p,
            id: nanoid(),
          })),
        }
      : undefined;
    return {
      status: "COMPLETED",
      trendingTopics: trendingTopicsWithIds,
      viralContentPotential: viralContentPotentialWithIds,
      audienceInsights: audienceInsightsWithIds,
      lastUpdated: trends.completedAt?.toISOString() || null,
    };
  } catch (e) {
    console.error("Failed to parse advanced insights data", e);
    return {
      status: "FAILED",
      error: "Failed to parse analysis data.",
      lastUpdated: trends.completedAt?.toISOString() || null,
    };
  }
}

export async function getFacebookPageInsights(input: {
  pageId: string;
  metric: string;
  since: string;
  until: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Find the page and ensure the user has access
  const page = await db.page.findFirst({
    where: {
      pageId: input.pageId,
      account: {
        userId,
      },
    },
  });

  if (!page || !page.pageToken) {
    throw new Error("Page not found or access token is missing.");
  }

  const url = `https://graph.facebook.com/v18.0/${input.pageId}/insights`;
  const params = {
    metric: input.metric,
    since: input.since,
    until: input.until,
    access_token: page.pageToken,
  };

  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching Facebook Page Insights:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `Facebook API Error: ${JSON.stringify(error.response.data)}`,
      );
    }
    throw new Error("Failed to fetch Facebook Page Insights.");
  }
}

export async function getPageAnalytics(input: { pageId: string }) {
  const { userId } = await getAuth({ required: true });

  // Ensure the user has access to this page
  const page = await db.page.findFirst({
    where: {
      pageId: input.pageId,
      account: {
        userId: userId,
      },
    },
  });

  if (!page) {
    throw new Error("Page not found or user does not have access.");
  }

  return await db.pageAnalytics.findMany({
    where: {
      pageId: input.pageId,
    },
    orderBy: {
      date: "asc",
    },
  });
}

export async function refreshAnalyticsData(input: { pageId: string }) {
  const { userId } = await getAuth({ required: true });
  const page = await db.page.findFirst({
    where: { pageId: input.pageId, account: { userId } },
    include: { account: true },
  });

  if (!page || !page.pageToken) {
    throw new Error("Page not found or access token is missing.");
  }

  const pageToken = page.pageToken;
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const until = new Date();

  const metrics = [
    "page_impressions",
    "page_reach",
    "page_post_engagements",
    "page_fans",
  ];

  const url = `https://graph.facebook.com/v18.0/${input.pageId}/insights`;
  const params = {
    metric: metrics.join(","),
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(until.getTime() / 1000),
    period: "day",
    access_token: pageToken,
  };

  try {
    const response = await axios.get(url, { params });
    const insightsData = response.data.data;

    const dailyAnalytics = new Map<string, Partial<PageAnalytics>>();

    for (const metricData of insightsData) {
      const metricName = metricData.name;
      for (const valueEntry of metricData.values) {
        const date = new Date(valueEntry.end_time).toISOString().split("T")[0];
        if (!date) continue;

        if (!dailyAnalytics.has(date)) {
          dailyAnalytics.set(date, {
            pageId: input.pageId,
            date: new Date(date),
          });
        }
        const dayData = dailyAnalytics.get(date)!;

        switch (metricName) {
          case "page_impressions":
            dayData.impressions = valueEntry.value;
            break;
          case "page_reach":
            dayData.reach = valueEntry.value;
            break;
          case "page_post_engagements":
            dayData.engagementRate = valueEntry.value;
            break;
          case "page_fans":
            dayData.followerCount = valueEntry.value;
            break;
        }
      }
    }

    for (const [, analytics] of dailyAnalytics) {
      if (analytics.date) {
        await db.pageAnalytics.upsert({
          where: {
            pageId_date: { pageId: analytics.pageId!, date: analytics.date },
          },
          update: {
            impressions: analytics.impressions ?? 0,
            reach: analytics.reach ?? 0,
            engagementRate: analytics.engagementRate ?? 0,
            followerCount: analytics.followerCount ?? 0,
          },
          create: {
            pageId: analytics.pageId!,
            date: analytics.date,
            impressions: analytics.impressions ?? 0,
            reach: analytics.reach ?? 0,
            engagementRate: analytics.engagementRate ?? 0,
            followerCount: analytics.followerCount ?? 0,
          },
        });
      }
    }

    return { success: true, insightsFound: dailyAnalytics.size };
  } catch (error) {
    console.error("Error fetching page analytics:", error);
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const fbError = error.response.data.error;
      if (fbError.code === 10 || fbError.code === 200 || fbError.code === 100) {
        throw new Error(
          "This page does not have permission to access analytics. This can happen for new pages, pages with few fans, or if your connected account's permissions have changed. Please try reconnecting your account in Settings.",
        );
      }
      throw new Error(`Facebook API error: ${fbError.message}`);
    }
    throw error;
  }
}

export async function respondToComment(input: {
  commentId: string;
  responseText: string;
}) {
  const { userId } = await getAuth({ required: true });

  const comment = await db.comment.findFirst({
    where: {
      id: input.commentId,
      userId,
    },
    include: {
      account: true,
      page: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  try {
    // Post the response to the platform
    if (comment.platform === "facebook" || comment.platform === "instagram") {
      try {
        // For both Facebook and Instagram, we need a page token.
        // The comment is linked to a Page model which holds the token.
        const pageToken = comment.page?.pageToken;

        if (!pageToken) {
          throw new Error(
            `No page token available for this ${comment.platform} comment. Please reconnect the associated account.`,
          );
        }

        // Facebook uses 'comments' endpoint, Instagram uses 'replies'
        const endpoint =
          comment.platform === "facebook"
            ? `${comment.commentId}/comments`
            : `${comment.commentId}/replies`;

        await axios.post(
          `https://graph.facebook.com/v18.0/${endpoint}`,
          { message: input.responseText },
          { params: { access_token: pageToken } },
        );
      } catch (error) {
        console.error(`Error posting response to ${comment.platform}:`, error);
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          throw new Error(
            `Facebook API Error: ${error.response.data.error.message}`,
          );
        }
        throw new Error(`Failed to post response to ${comment.platform}.`);
      }
    }

    // Post the response to Twitter
    if (comment.platform === "twitter" && comment.account.accessToken) {
      await axios.post(
        "https://api.twitter.com/2/tweets",
        {
          text: input.responseText,
          reply: {
            in_reply_to_tweet_id: comment.commentId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${comment.account.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Post the response to YouTube
    if (comment.platform === "youtube" && comment.account.accessToken) {
      // For YouTube, we need to create a comment reply
      await axios.post(
        "https://www.googleapis.com/youtube/v3/comments",
        {
          snippet: {
            parentId: comment.commentId,
            textOriginal: input.responseText,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${comment.account.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Update the comment in the database
    await db.comment.update({
      where: { id: comment.id },
      data: {
        responded: true,
        responseText: input.responseText,
        respondedAt: new Date(),
      },
    });

    // === NEW: Learn user style from responseText and store/update UserResponsePreference ===
    try {
      const analysis = await requestMultimodalModel({
        system:
          "You are an expert communication style analyst. For a given text, extract its tone (e.g. friendly, casual, professional), length (short, medium, or long), positivity (-1 to 1), directness (0-1), and keywords used.",
        messages: [{ role: "user", content: input.responseText }],
        returnType: z.object({
          tone: z.string(),
          length: z.enum(["short", "medium", "long"]),
          positivity: z.number().min(-1).max(1),
          directness: z.number().min(0).max(1),
          keywords: z.array(z.string()),
        }),
      });

      // Update or create preference profile
      await db.userResponsePreference.upsert({
        where: { userId },
        update: {
          tone: analysis.tone,
          length: analysis.length,
          positivity: analysis.positivity,
          directness: analysis.directness,
          keywords: JSON.stringify(analysis.keywords),
          lastAnalyzedAt: new Date(),
        },
        create: {
          userId,
          tone: analysis.tone,
          length: analysis.length,
          positivity: analysis.positivity,
          directness: analysis.directness,
          keywords: JSON.stringify(analysis.keywords),
          lastAnalyzedAt: new Date(),
        },
      });
    } catch {
      console.error("Failed to analyze and store user response style:"); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    }

    return { success: true };
  } catch (error) {
    console.error("Error responding to comment:", error);
    throw new Error("Failed to post response. Please try again.");
  }
}

// Get original post URL
export function getOriginalPostUrl(platform: string, postId: string): string {
  switch (platform.toLowerCase()) {
    case "facebook":
      return `https://www.facebook.com/${postId}`;
    case "instagram":
      // Instagram comments are typically on posts, which have a different URL format
      return `https://www.instagram.com/p/${postId}`;
    case "twitter":
      return `https://twitter.com/x/status/${postId}`;
    case "youtube":
      return `https://www.youtube.com/watch?v=${postId}`;
    case "linkedin":
      return `https://www.linkedin.com/feed/update/${postId}`;
    default:
      return "#";
  }
}

export function getFacebookEmbedUrl(
  postId: string,
  permalinkUrl?: string,
): string {
  // Use permalink URL if available, as it's more reliable for embedding
  // Otherwise fall back to constructing from post ID
  const fullUrl = permalinkUrl || `https://www.facebook.com/${postId}`;
  const encodedUrl = encodeURIComponent(fullUrl);

  // Add additional parameters for better compatibility
  // appId parameter helps with rendering posts that require authentication
  // width=500 is standard, height=auto lets Facebook determine the best height
  return `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=true&width=500&height=auto&appId=${process.env.FACEBOOK_APP_ID || ""}`;
}

// Brand Guidelines
export async function getBrandGuidelines() {
  const { userId } = await getAuth({ required: true });

  try {
    const guidelines = await db.brandGuidelines.findUnique({
      where: { userId },
    });

    if (!guidelines) {
      return null;
    }

    // Parse JSON strings back to arrays
    return {
      ...guidelines,
      tonePriorities: JSON.parse(guidelines.tonePriorities || "[]"),
      phrasesToUse: JSON.parse(guidelines.phrasesToUse || "[]"),
      phrasesToAvoid: JSON.parse(guidelines.phrasesToAvoid || "[]"),
      exampleResponses: JSON.parse(guidelines.exampleResponses || "[]"),
    };
  } catch (error) {
    console.error("Error fetching brand guidelines:", error);
    return null;
  }
}

// User Settings
export async function getUserSettings() {
  try {
    const { userId } = await getAuth({ required: true });

    for (let i = 0; i < 3; i++) {
      try {
        const settings = await db.userSettings.findUnique({
          where: { userId },
        });

        if (!settings) {
          // Return default settings
          return {
            fetchFrequency: "manual",
            emailAlertsEnabled: false,
            emailAlertsPriorityThreshold: 8,
          };
        }

        return {
          fetchFrequency: settings.fetchFrequency,
          emailAlertsEnabled: settings.emailAlertsEnabled,
          emailAlertsPriorityThreshold: settings.emailAlertsPriorityThreshold,
        };
      } catch (dbError: any) {
        const isRetryable =
          dbError.code === "P1001" ||
          (dbError.message && dbError.message.includes("SERVER_ERROR"));
        if (i < 2 && isRetryable) {
          await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
          continue;
        }
        console.error("Error fetching user settings:", dbError);
        break;
      }
    }
  } catch (error) {
    console.error("Error in getUserSettings:", error);
  }

  // Fallback if all retries fail or if getAuth fails
  return {
    fetchFrequency: "manual",
    emailAlertsEnabled: false,
    emailAlertsPriorityThreshold: 8,
  };
}

export async function updateUserSettings(input: {
  fetchFrequency: string;
  emailAlertsEnabled?: boolean;
  emailAlertsPriorityThreshold?: number;
}) {
  const { userId } = await getAuth({ required: true });

  const settings = await db.userSettings.upsert({
    where: { userId },
    update: input,
    create: {
      userId,
      ...input,
    },
  });

  return settings;
}

export async function saveBrandGuidelines(input: {
  brandVoice: string;
  tonePriorities: string[];
  phrasesToUse: string[];
  phrasesToAvoid: string[];
  exampleResponses: string[];
  additionalNotes?: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Serialize arrays to JSON strings for storage
  const data = {
    ...input,
    tonePriorities: JSON.stringify(input.tonePriorities),
    phrasesToUse: JSON.stringify(input.phrasesToUse),
    phrasesToAvoid: JSON.stringify(input.phrasesToAvoid),
    exampleResponses: JSON.stringify(input.exampleResponses),
  };

  const guidelines = await db.brandGuidelines.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });

  // Return the parsed data for immediate use
  return {
    ...guidelines,
    tonePriorities: input.tonePriorities,
    phrasesToUse: input.phrasesToUse,
    phrasesToAvoid: input.phrasesToAvoid,
    exampleResponses: input.exampleResponses,
  };
}

// Simulate engagement of a post for each persona
export async function simulatePersonaEngagement(input: {
  post: string;
  personas?: string[];
}) {
  // Use AI if needed, fallback to mock for now
  // If personas provided, predict for each; else return generic
  const personas =
    Array.isArray(input.personas) && input.personas.length > 0
      ? input.personas
      : ["General Audience", "Potential Customer", "Loyal Customer"];
  // TODO: Replace with real AI prediction
  const results = personas.map((p, idx) => ({
    persona: p,
    engagementScore: Math.floor(Math.random() * 6 + 5), // 5-10
    reaction: idx % 3 === 0 ? "👍" : idx % 3 === 1 ? "❤️" : "😮",
    feedback: p.toLowerCase().includes("loyal")
      ? "This group is likely to comment and share."
      : p.toLowerCase().includes("potential")
        ? "May ask questions or follow if interested."
        : "General audience will engage if the post is visually appealing and relevant.",
  }));
  return { results };
}

// Dashboard Stats

export async function submitRecommendationFeedback(input: {
  recommendationId: string;
  source: string;
  feedbackType: "love" | "like" | "neutral" | "dislike";
  feedbackTags?: string[];
  feedbackComment?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const feedback = await db.recommendationFeedback.create({
    data: {
      userId,
      recommendationId: input.recommendationId,
      source: input.source,
      feedbackType: input.feedbackType,
      feedbackTags: input.feedbackTags
        ? JSON.stringify(input.feedbackTags)
        : null,
      feedbackComment: input.feedbackComment,
    },
  });

  // Queue a task to update brand signals based on this feedback
  await queueTask(() => _internal_updateBrandSignals(userId));

  return feedback;
}

export async function submitResponseFeedback(input: {
  commentId: string;
  responseVariationId: string;
  feedbackType: "thumbs_up" | "thumbs_down";
  regenerateAfterFeedback?: boolean;
}) {
  const { userId } = await getAuth({ required: true });

  // Store feedback for the response variation
  const feedback = await db.recommendationFeedback.create({
    data: {
      userId,
      recommendationId: input.responseVariationId,
      source: "response_variations",
      feedbackType: input.feedbackType === "thumbs_up" ? "like" : "dislike",
    },
  });

  // If user wants to regenerate responses after negative feedback
  if (input.regenerateAfterFeedback && input.feedbackType === "thumbs_down") {
    // Get the original comment
    const comment = await db.comment.findUnique({
      where: { id: input.commentId },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Get previous feedback for this comment to learn from
    const previousFeedback = await db.recommendationFeedback.findMany({
      where: {
        userId,
        source: "response_variations",
        feedbackType: "dislike",
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Generate new response variations with feedback context
    const brandGuidelines = await db.brandGuidelines.findUnique({
      where: { userId },
    });

    const feedbackContext =
      previousFeedback.length > 0
        ? `Based on previous feedback, avoid responses that are too ${previousFeedback.length > 3 ? "generic or automated-sounding" : "similar to previously disliked responses"}.`
        : "";

    const result = await intelligentRequestMultimodalModel({
      system: `You are an expert social media manager specializing in authentic, engaging responses.

Brand Voice: ${brandGuidelines?.brandVoice || "professional"}
Tone Priorities: ${brandGuidelines?.tonePriorities ? (JSON.parse(brandGuidelines.tonePriorities) as string[]).join(", ") : "None specified"}
Phrases to Use: ${brandGuidelines?.phrasesToUse ? (JSON.parse(brandGuidelines.phrasesToUse) as string[]).join(", ") : "None specified"}
Phrases to Avoid: ${brandGuidelines?.phrasesToAvoid ? (JSON.parse(brandGuidelines.phrasesToAvoid) as string[]).join(", ") : "None specified"}
Additional Notes: ${brandGuidelines?.additionalNotes || "No specific guidelines provided"}

${feedbackContext}

Generate 3 different response variations that are:
1. Authentic and personalized
2. Appropriate for the comment context
3. Aligned with the brand voice
4. Engaging but not overly promotional
5. Different in tone and approach from each other

Avoid generic, robotic, or overly sales-focused responses.`,
      messages: [
        {
          role: "user",
          content: `Generate response variations for this comment: "${comment.text}"

Comment context:
- Platform: ${comment.platform}
- Author: ${comment.authorName}
- Sentiment: ${comment.sentiment || "neutral"}

Please provide 3 distinct response options with different approaches.`,
        },
      ],
      returnType: z
        .object({
          variations: z
            .array(
              z.object({
                id: z.string().describe("Unique identifier for this variation"),
                text: z.string().describe("The response text"),
                approach: z
                  .string()
                  .describe("Brief description of the approach taken"),
              }),
            )
            .describe("Array of response variations"),
        })
        .describe("Response variations with different approaches"),
      model: "medium",
      temperature: 0.7,
    });

    return {
      feedback,
      newVariations: (result as any).variations,
    };
  }

  return { feedback };
}

async function _internal_updateBrandSignals(userId: string) {
  const recentFeedback = await db.recommendationFeedback.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
      },
    },
    take: 100,
    orderBy: {
      createdAt: "desc",
    },
  });

  const brandGuidelines = await db.brandGuidelines.findUnique({
    where: { userId },
  });

  if (recentFeedback.length < 5) {
    // Not enough data to make significant changes
    console.log(
      `Skipping Brand Signal update for user ${userId}, not enough feedback (${recentFeedback.length})`,
    );
    return;
  }

  const analysis = await requestMultimodalModel({
    system:
      "You are a brand strategy analyst. Based on user feedback on content recommendations and their brand guidelines, update the learned 'Brand Signals'.",
    messages: [
      {
        role: "user",
        content: `
            Analyze the following user feedback and brand guidelines to update the user's Brand Signals.
            
            **Current Brand Guidelines:**
            ${JSON.stringify(brandGuidelines, null, 2)}

            **Recent Feedback on AI Suggestions:**
            ${JSON.stringify(
              recentFeedback.map((f) => ({
                type: f.feedbackType,
                tags: f.feedbackTags,
                comment: f.feedbackComment,
              })),
              null,
              2,
            )}

            Based on this, what are the emerging patterns?
            - What tones are consistently preferred or disliked?
            - What keywords appear frequently in positive feedback?
            - Are there patterns in engagement (e.g., user prefers more questions, shorter CTAs)?
            - What is the overall sentiment profile of the content the user likes?
            - What are the most successful content pillars based on positive feedback?
            `,
      },
    ],
    returnType: z.object({
      preferredTones: z.array(z.string()),
      commonKeywords: z.array(z.string()),
      engagementPatterns: z.record(z.any()), // flexible object
      sentimentProfile: z.record(z.any()),
      contentPillars: z.array(z.string()),
    }),
    model: "small",
  });

  await db.brandSignal.upsert({
    where: { userId },
    create: {
      userId,
      preferredTones: JSON.stringify(analysis.preferredTones),
      commonKeywords: JSON.stringify(analysis.commonKeywords),
      engagementPatterns: JSON.stringify(analysis.engagementPatterns),
      sentimentProfile: JSON.stringify(analysis.sentimentProfile),
      contentPillars: JSON.stringify(analysis.contentPillars),
    },
    update: {
      preferredTones: JSON.stringify(analysis.preferredTones),
      commonKeywords: JSON.stringify(analysis.commonKeywords),
      engagementPatterns: JSON.stringify(analysis.engagementPatterns),
      sentimentProfile: JSON.stringify(analysis.sentimentProfile),
      contentPillars: JSON.stringify(analysis.contentPillars),
    },
  });
}

export async function getBrandSignals() {
  const { userId } = await getAuth({ required: true });
  let signals = await db.brandSignal.findUnique({
    where: { userId },
  });

  if (!signals) {
    // If no signals exist, create a default entry
    signals = await db.brandSignal.create({
      data: {
        userId,
        preferredTones: "[]",
        commonKeywords: "[]",
        engagementPatterns: "{}",
        sentimentProfile: "{}",
        contentPillars: "[]",
      },
    });
  }

  try {
    return {
      ...signals,
      preferredTones: JSON.parse(signals.preferredTones || "[]") as string[],
      commonKeywords: JSON.parse(signals.commonKeywords || "[]") as string[],
      engagementPatterns: JSON.parse(
        signals.engagementPatterns || "{}",
      ) as Record<string, any>,
      sentimentProfile: JSON.parse(signals.sentimentProfile || "{}") as Record<
        string,
        any
      >,
      contentPillars: JSON.parse(signals.contentPillars || "[]") as string[],
    };
  } catch (e) {
    console.error("Error parsing brand signals JSON", e);
    // Return default/empty values if parsing fails
    return {
      ...signals,
      preferredTones: [] as string[],
      commonKeywords: [] as string[],
      engagementPatterns: {} as Record<string, any>,
      sentimentProfile: {} as Record<string, any>,
      contentPillars: [] as string[],
    };
  }
}

export async function getDashboardStats(input: { cacheKey: string }) {
  const { userId } = await getAuth({ required: true });

  const cacheEntry = await db.analyticsCache.findUnique({
    where: { cacheKey: input.cacheKey },
  });

  if (!cacheEntry || cacheEntry.userId !== userId) {
    return { status: "NOTFOUND" };
  }

  if (cacheEntry.status === "COMPLETED" && cacheEntry.data) {
    try {
      const parsedData = JSON.parse(cacheEntry.data) as any;
      return {
        status: "COMPLETED",
        data: parsedData,
        completedAt: cacheEntry.completedAt,
      };
    } catch (e) {
      console.error(
        `[getDashboardStats] FAILED to parse data for key: ${input.cacheKey}. Error:`,
        e,
      );
      return {
        status: "FAILED",
        error:
          "Failed to parse cached analytics data. The data might be corrupted.",
        completedAt: cacheEntry.completedAt,
      };
    }
  }

  return {
    status: cacheEntry.status,
    error: cacheEntry.error,
    completedAt: cacheEntry.completedAt,
  };
}

export async function getPredictiveAnalytics(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for predictive analytics generation (8 credits)
  await _consumeCredits(
    userId,
    "predictive_analytics_generation",
    8,
    "Generated predictive analytics with growth forecast and anomaly detection",
    { pageId: input?.pageId, platform: input?.platform },
  );

  const comments = await db.comment.findMany({
    where: {
      userId,
      ...(input?.pageId && { pageId: input.pageId }),
      ...(input?.platform && { platform: input.platform }),
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  if (comments.length < 10) {
    return {
      growthForecast: null,
      anomalyDetection: null,
      error:
        "Not enough data for predictive analysis. Need at least 10 comments.",
    };
  }

  try {
    const predictiveData = await requestMultimodalModel({
      system: `You are a predictive social analytics and anomaly-detection expert. Given recent comments/engagement, forecast the next week's/month's most likely viral topics, post formats, and best posting times (with confidence and reasoning). Also, detect any significant anomalies in sentiment or volume, explain their likely cause and impact, and suggest actions.`,
      messages: [
        {
          role: "user",
          content: `Recent data:\n\n- Comments: ${JSON.stringify(comments.map((c) => ({ date: c.createdAt, text: c.text, likes: c.likeCount, replies: c.replyCount, sentiment: c.sentiment, postId: c.postId, platform: c.platform })))}`,
        },
      ],
      returnType: z.object({
        growthForecast: z.object({
          timeFrame: z.string(),
          viralTopics: z.array(
            z.object({
              topic: z.string(),
              format: z.string(),
              bestTime: z.string(),
              confidence: z.number().min(0).max(1),
              why: z.string(),
            }),
          ),
          summary: z.string(),
        }),
        anomalyDetection: z.object({
          anomalies: z.array(
            z.object({
              type: z.string(),
              date: z.string(),
              description: z.string(),
              rootCause: z.string(),
              impact: z.string(),
            }),
          ),
          sentimentDrivers: z.array(
            z.object({
              driver: z.string(),
              direction: z.enum(["positive", "negative"]),
              example: z.string(),
              recommendation: z.string(),
            }),
          ),
          summary: z.string(),
        }),
      }),
      model: "large",
    });
    return predictiveData;
  } catch (err) {
    console.error("Predictive/Anomaly AI call failed:", err);
    return {
      growthForecast: null,
      anomalyDetection: null,
      error: "Failed to generate predictive analytics.",
    };
  }
}

export async function generateImageFromPrompt(input: { prompt: string }) {
  const { userId } = await getAuth({ required: true });

  // Consume credits for image generation (3 credits)
  await _consumeCredits(
    userId,
    "image_generation",
    3,
    `Generated image from prompt: ${input.prompt}`,
    { prompt: input.prompt },
  );

  const { imageUrl } = await requestMultimodalModel({
    system:
      "You are a helpful assistant that generates images based on user prompts.",
    messages: [
      {
        role: "user",
        content: input.prompt,
      },
    ],
    returnType: z.object({
      imageUrl: z.string(),
    }),
  });

  // Find or create the pillar for generated images
  const pillar = await db.contentPillar.upsert({
    where: {
      userId_name: {
        userId,
        name: "AI-Generated Images",
      },
    },
    update: {},
    create: {
      userId,
      name: "AI-Generated Images",
      description: "Images generated by the AI assistant.",
    },
  });

  // Create the content record
  const generatedContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: pillar.id,
      title: input.prompt,
      type: "IMAGE",
      content: imageUrl,
      status: "DRAFT",
      sourceIdea: JSON.stringify({ prompt: input.prompt }),
    },
  });

  return generatedContent;
}

export async function getAIForecast(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const comments = await db.comment.findMany({
    where: {
      userId,
      ...(input?.pageId && { pageId: input.pageId }),
      ...(input?.platform && { platform: input.platform }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (comments.length < 5) {
    return {
      nextWeek: null,
      nextMonth: null,
      error: "Not enough data for an AI forecast. Need at least 5 comments.",
    };
  }

  try {
    const forecast = await requestMultimodalModel({
      system: `You are an expert social media analyst who provides concise, actionable forecasts.`,
      messages: [
        {
          role: "user",
          content: `Based on these recent comments, provide a forecast for the next 7 days and the next 30 days. For each period, give a projected engagement change (e.g., "+15%"), an emerging top topic, and a single, concrete recommendation. Comments: ${JSON.stringify(comments.map((c) => c.text))}`,
        },
      ],
      returnType: z.object({
        nextWeek: z.object({
          engagementChange: z.string(),
          topTopic: z.string(),
          recommendation: z.string(),
        }),
        nextMonth: z.object({
          engagementChange: z.string(),
          topTopic: z.string(),
          recommendation: z.string(),
        }),
      }),
      model: "medium",
    });
    return forecast;
  } catch (err) {
    console.error("AI Forecast call failed:", err);
    return {
      nextWeek: null,
      nextMonth: null,
      error: "Failed to generate AI forecast.",
    };
  }
}

async function _internal_runMuseGenerationProcess(
  userId: string,
  videoScript: string,
) {
  // 1. Generate content script in MuseMode
  const contentTask = await generateContentFromSource({
    sourceType: "text",
    sourceContent: videoScript,
    museId: undefined,
  });

  // 2. Poll for content generation status
  let contentStatus;
  const maxAttempts = 24; // 24 * 5s = 2 minutes timeout
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    contentStatus = await getContentGenerationStatus({
      taskId: contentTask.id,
    });
    if (
      contentStatus.status === "COMPLETED" ||
      contentStatus.status === "FAILED"
    ) {
      break;
    }
  }

  if (contentStatus?.status !== "COMPLETED") {
    throw new Error("Content generation in MuseMode failed or timed out.");
  }

  // 3. Find the newly created content to get its ID
  const allContent = await museListContent();
  const newContent = allContent
    .filter((c) => c.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  if (!newContent) {
    throw new Error("Could not find the newly generated content in MuseMode.");
  }

  // 4. Trigger video generation in MuseMode
  const videoTask = await museGenerateVideo({ contentId: newContent.id });

  return {
    museContentId: newContent.id,
    museTaskId: videoTask.id,
  };
}

export async function generateContentFromRecommendation(input: {
  recommendation: ContentIdea;
}) {
  const { userId } = await getAuth({ required: true });
  const { recommendation } = input;

  // Check cache first
  const cacheKey = generateContentCacheKey(
    `recommendation-${recommendation.id || recommendation.title}-${recommendation.pillar}-${recommendation.format}`,
  );
  const cachedResult = await getCachedContent(cacheKey);
  if (cachedResult) {
    return JSON.parse(cachedResult as string);
  }

  // 1. Find or create the content pillar for organization
  const pillar = await db.contentPillar.upsert({
    where: { userId_name: { userId, name: recommendation.pillar } },
    update: {},
    create: {
      userId,
      name: recommendation.pillar,
      description: `Content related to ${recommendation.pillar}`,
    },
  });

  // 2. Determine content type
  let contentType: "TEXT" | "IMAGE" | "VIDEO" = "TEXT";
  const formatLower = recommendation.format.toLowerCase();
  if (formatLower.includes("video")) {
    contentType = "VIDEO";
  } else if (
    formatLower.includes("image") ||
    formatLower.includes("infographic") ||
    formatLower.includes("visual")
  ) {
    contentType = "IMAGE";
  }

  // 3. Create a placeholder content entry first to get an ID
  const generatedContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: pillar.id,
      title: recommendation.title,
      type: contentType,
      content: "Generating...", // Placeholder content
      sourceIdea: JSON.stringify(recommendation),
      status: "GENERATING",
    },
  });

  // 4. Queue the actual generation task
  const task = await queueTask(async () => {
    try {
      if (contentType === "IMAGE") {
        if (!recommendation.assetPrompt && !recommendation.contentBrief) {
          throw new Error(
            "An asset prompt or content brief is required to generate an image.",
          );
        }
        const imageResult = await requestMultimodalModel({
          system: "You are an expert image generation assistant.",
          messages: [
            {
              role: "user",
              content:
                recommendation.assetPrompt ||
                `An image for a post titled "${recommendation.title}" with the brief: ${recommendation.contentBrief}`,
            },
          ],
          returnType: z.object({ imageUrl: z.string() }),
        });
        await db.generatedContent.update({
          where: { id: generatedContent.id },
          data: {
            title: recommendation.title,
            content: imageResult.imageUrl,
            status: "DRAFT",
          },
        });
      } else if (contentType === "VIDEO") {
        const videoScript =
          recommendation.videoScript || recommendation.contentBrief;
        if (!videoScript) {
          throw new Error(
            "A video script or content brief is required to generate a video.",
          );
        }

        const { museContentId, museTaskId } =
          await _internal_runMuseGenerationProcess(userId, videoScript);

        await db.generatedContent.update({
          where: { id: generatedContent.id },
          data: {
            museContentId,
            museTaskId,
            status: "GENERATING",
            title: recommendation.title,
            content: "Video generation in progress...",
          },
        });
      } else {
        // TEXT
        const textResult = await requestMultimodalModel({
          system: `You are a social media content writer. Write a post based on the provided brief, title, and call to action. The tone should be engaging and on-brand. The content pillar is "${pillar.name}".`,
          messages: [
            {
              role: "user",
              content: `Title: ${recommendation.title}\n\nBrief: ${recommendation.contentBrief}\n\nCall to Action: ${recommendation.cta || ""}`,
            },
          ],
          returnType: z.object({
            revisedTitle: z.string(),
            postBody: z.string(),
          }),
        });
        await db.generatedContent.update({
          where: { id: generatedContent.id },
          data: {
            title: textResult.revisedTitle,
            content: textResult.postBody,
            status: "DRAFT",
          },
        });
      }
    } catch (error) {
      console.error(
        `[Task] Failed to generate content from recommendation ${recommendation.id}:`,
        error,
      );
      // Update status to FAILED on error
      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          status: "FAILED",
          content: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  });

  return { taskId: task.id, contentId: generatedContent.id };
}

export async function getGeneratedContentById(input: { contentId: string }) {
  const { userId } = await getAuth({ required: true });
  return await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
    },
  });
}

import {
  generateThreadFromUniversalSource,
  getThreadGenerationStatus,
  listThreads as externalListThreads,
  getThread,
  updateThread,
  repurposeThread,
  getRepurposeResults as externalGetRepurposeResults,
} from "@ac1/viralthrea-3g4sutjk";
import {
  generateContentFromSource,
  getContentGenerationStatus,
  listContent as museListContent,
  generateVideo as museGenerateVideo,
  getVideoGenerationStatus,
  getContent,
  deleteContent as museDeleteContent,
} from "@ac1/musemode-7sxic2xr";

export async function uploadDocument(input: {
  fileName: string;
  fileContent: string; // base64
  fileType: string;
  fileSize: number;
}) {
  const { userId } = await getAuth({ required: true });

  const fileUrl = await upload({
    bufferOrBase64: input.fileContent,
    fileName: `${userId}/${input.fileName}`,
  });

  const document = await db.uploadedDocument.create({
    data: {
      userId,
      name: input.fileName,
      url: fileUrl,
      fileType: input.fileType,
      size: input.fileSize,
    },
  });

  return document;
}

export async function listUploadedDocuments() {
  const { userId } = await getAuth({ required: true });
  return await db.uploadedDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteUploadedDocument(input: { documentId: string }) {
  const { userId } = await getAuth({ required: true });

  const document = await db.uploadedDocument.findFirst({
    where: {
      id: input.documentId,
      userId,
    },
  });

  if (!document) {
    throw new Error(
      "Document not found or you do not have permission to delete it.",
    );
  }

  // Note: Deleting from cloud storage is not implemented here, but in a real app, you would.
  // For this exercise, we'll just delete the DB record.

  await db.uploadedDocument.delete({
    where: { id: input.documentId },
  });

  return { success: true };
}

export async function generateViralThread(input: {
  source: string;
  targetAudience: string;
  contentTone: string;
}) {
  return await generateThreadFromUniversalSource(input);
}

export async function getViralThreadStatus(input: { taskId: string }) {
  return await getThreadGenerationStatus(input);
}
export async function listViralThreads(input?: {
  searchTerm?: string;
  sortBy?: "createdAt" | "engagementScore";
  filterByPattern?: string;
  tagIds?: string[];
}) {
  const { userId } = await getAuth({ required: true });

  const allThreadsResult = await externalListThreads({
    searchTerm: input?.searchTerm,
    sortBy: input?.sortBy,
    filterByPattern: input?.filterByPattern,
  });

  if (Array.isArray(allThreadsResult)) {
  } else if (
    typeof allThreadsResult === "object" &&
    allThreadsResult !== null
  ) {
  } else {
  }

  const allThreads = Array.isArray(allThreadsResult)
    ? allThreadsResult
    : (allThreadsResult as any)?.threads || [];

  if (!Array.isArray(allThreads)) {
    console.error(
      "[SocialWave] Parsed allThreads is not an array:",
      allThreads,
    );
    return { threads: [], updatedAt: new Date() };
  }

  if (allThreads.length > 0) {
  }

  const userThreads = allThreads;

  const hiddenThreads = await db.hiddenThread.findMany({
    where: { userId },
    select: { threadId: true },
  });
  const hiddenThreadIds = new Set(hiddenThreads.map((t) => t.threadId));

  let filteredThreads = userThreads.filter(
    (thread: any) =>
      !hiddenThreadIds.has(thread.id) && thread.status !== "ARCHIVED",
  );

  if (input?.tagIds && input.tagIds.length > 0) {
    const taggedThreadIds = await db.viralThreadTagging.findMany({
      where: {
        tagId: { in: input.tagIds },
        assignedBy: userId,
      },
      select: { threadId: true },
    });
    const threadIdSet = new Set(taggedThreadIds.map((t) => t.threadId));
    filteredThreads = filteredThreads.filter((thread: any) =>
      threadIdSet.has(thread.id),
    );
  }

  const finalThreads = filteredThreads.map((thread: any) => {
    const { content, engagementScore, ...rest } = thread;
    let tweets: { content: string }[] = [];

    if (content && typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item: any) =>
              typeof item === "object" && item !== null && "content" in item,
          )
        ) {
          tweets = parsed;
        } else {
          // Not a valid tweet array, but valid JSON. Treat as a single tweet for preview.
          tweets = [{ content: content }];
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          // Not JSON, treat as a single tweet string.
          tweets = [{ content: content }];
        }
      }
    } else if (content && Array.isArray(content)) {
      tweets = content;
    }

    const calculatedEngagementScore =
      engagementScore ??
      tweets.length * 1.5 + (thread.title?.length || 0) * 0.1;

    return { ...rest, tweets, engagementScore: calculatedEngagementScore };
  });

  return {
    threads: finalThreads,
    updatedAt: (allThreadsResult as any)?.updatedAt || new Date(),
  };
}
export async function getViralThread(input: { threadId: string }) {
  const thread = await getThread(input);

  if (!thread) {
    throw new Error("Thread not found.");
  }

  const tags = await db.viralThreadTagging.findMany({
    where: { threadId: input.threadId },
    include: {
      tag: true,
    },
  });

  let tweets: { content: string }[] = [];
  const content = (thread as any).content;

  if (content && typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) =>
            typeof item === "object" && item !== null && "content" in item,
        )
      ) {
        tweets = parsed;
      } else {
        // It's valid JSON, but not the array of tweets we expect.
        // This is a data format issue, so we should fail gracefully.
        console.warn(
          `[getViralThread] Parsed content for thread ${
            input.threadId
          } is not a valid tweet array.`,
        );
        tweets = [{ content: "Error: Could not display thread content." }];
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // The content is not JSON, so we assume it's a plain string.
        tweets = [{ content: content }];
      } else {
        // Another error occurred during parsing.
        console.error(
          `[getViralThread] Error processing content for thread ${
            input.threadId
          }:`,
          e,
        );
        tweets = [{ content: "Error: Could not display thread content." }];
      }
    }
  } else if (content && Array.isArray(content)) {
    // Handles cases where content might already be an array
    if (
      content.every(
        (item) =>
          typeof item === "object" && item !== null && "content" in item,
      )
    ) {
      tweets = content;
    } else {
      throw new Error("Content array is not in the expected format.");
    }
  }

  // If after all checks, tweets array is empty, it might be an issue. But an empty thread is possible.
  // We will let the frontend decide what to do with an empty tweets array.

  const restOfTheThread = { ...(thread as any) };
  delete restOfTheThread.content;

  const result = {
    ...restOfTheThread,
    tweets,
    tags,
  };

  return result;
}

export { repurposeThread };

export async function getRepurposeResults(input: {
  taskId: string;
  threadId: string;
  platform: string;
}) {
  const result = await externalGetRepurposeResults(input);

  if (result.status === "COMPLETED" && "result" in result && result.result) {
    const { userId } = await getAuth({ required: true });

    const pillar = await db.contentPillar.upsert({
      where: {
        userId_name: {
          userId,
          name: "Repurposed Content",
        },
      },
      update: {},
      create: {
        userId,
        name: "Repurposed Content",
        description:
          "Content repurposed from viral threads for other platforms.",
      },
    });

    const thread = await getThread({ threadId: input.threadId });

    const newContent = await db.generatedContent.create({
      data: {
        userId,
        pillarId: pillar.id,
        title: `Repurposed: ${thread?.title || "Untitled Thread"} for ${input.platform}`,
        type: "TEXT",
        content:
          typeof result.result === "string"
            ? result.result
            : JSON.stringify(result.result),
        status: "DRAFT",
        sourceIdea: JSON.stringify({
          repurpose: true,
          threadId: input.threadId,
          platform: input.platform,
        }),
      },
    });

    return {
      ...result,
      newContentId: newContent.id, // Send back the new content ID
    };
  }

  return result;
}

export async function hideViralThread(input: { threadId: string }) {
  const { userId } = await getAuth({ required: true });
  await db.hiddenThread.upsert({
    where: { threadId: input.threadId },
    update: { userId },
    create: {
      threadId: input.threadId,
      userId,
    },
  });
  return { success: true };
}

export async function bulkHideViralThreads(input: { threadIds: string[] }) {
  const { userId } = await getAuth({ required: true });

  const dataToCreate = input.threadIds.map((threadId) => ({
    threadId,
    userId,
  }));

  await db.hiddenThread.createMany({
    data: dataToCreate,
  });

  return { success: true, count: input.threadIds.length };
}

export async function getAIInsightsForPage(input: { pageId: string }) {
  const { userId } = await getAuth({ required: true });

  const page = await db.page.findFirst({
    where: { pageId: input.pageId, account: { userId } },
  });

  if (!page) {
    throw new Error("Page not found or user does not have access.");
  }

  const comments = await db.comment.findMany({
    where: {
      userId,
      pageId: page.id,
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to 100 comments for analysis to keep it fast
  });

  if (comments.length < 10) {
    return {
      summary:
        "Not enough comments to generate insights. Need at least 10 comments.",
      recommendations: [],
      topTopics: [],
    };
  }

  const result = await requestMultimodalModel({
    system:
      "You are an expert social media analyst. Analyze the provided comments for a Facebook page and generate a concise summary, actionable recommendations, and top topics.",
    messages: [
      {
        role: "user",
        content: `Analyze these comments for page "${page.pageName}": ${JSON.stringify(comments.map((c) => c.text))}`,
      },
    ],
    returnType: z.object({
      summary: z
        .string()
        .describe(
          "A brief summary of the overall sentiment and key discussion points.",
        ),
      recommendations: z
        .array(z.string())
        .describe(
          "3-5 actionable recommendations for content or engagement strategy.",
        ),
      topTopics: z.array(
        z.object({
          topic: z.string(),
          sentiment: z.enum(["positive", "neutral", "negative"]),
          frequency: z
            .number()
            .describe("Percentage of comments mentioning this topic."),
        }),
      ),
    }),
    model: "medium",
  });

  return result;
}

export async function deleteAllViralThreads() {
  const { userId } = await getAuth({ required: true });

  // The `externalListThreads` from the external app returns all threads for all users.
  // We need to filter them for the current user.
  const allThreads = await externalListThreads();
  const userThreads = Array.isArray(allThreads)
    ? allThreads.filter((thread: any) => thread.userId === userId)
    : [];

  if (userThreads.length > 0) {
    const deletePromises = userThreads.map((thread: any) =>
      updateThread({ threadId: thread.id, status: "ARCHIVED" }),
    );
    await Promise.all(deletePromises);
  }

  // Clear our local record of hidden threads for this user.
  await db.hiddenThread.deleteMany({
    where: { userId },
  });

  return { success: true, deletedCount: userThreads.length };
}

export async function getGeneratedContentStatus(input: { contentId: string }) {
  const { userId } = await getAuth({ required: true });

  const content = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
    },
  });

  if (!content) {
    throw new Error("Content not found.");
  }

  // If status is already final, no need to poll
  if (content.status === "DRAFT" || content.status === "FAILED") {
    return content;
  }

  if (content.type !== "VIDEO") {
    return content;
  }

  // If we don't have a task id from muse, we can't check status.
  if (!content.museTaskId) {
    // Fail after 10 minutes to avoid getting stuck in a pending state
    const minutesSinceCreation =
      (new Date().getTime() - content.createdAt.getTime()) / (1000 * 60);
    if (minutesSinceCreation > 10) {
      return await db.generatedContent.update({
        where: { id: content.id },
        data: { status: "FAILED" },
      });
    }
    return content;
  }

  const museStatus = await getVideoGenerationStatus({
    taskId: content.museTaskId,
  });

  if (museStatus.status === "COMPLETED") {
    const museContent = await getContent({ id: content.museContentId! });

    return await db.generatedContent.update({
      where: { id: content.id },
      data: {
        status: "DRAFT", // DRAFT means completed for generated content
        content: museContent?.videoUrl ?? "Error: Video URL not found.",
        thumbnailUrl: museContent?.thumbnailUrl,
      },
    });
  } else if (museStatus.status === "FAILED") {
    return await db.generatedContent.update({
      where: { id: content.id },
      data: { status: "FAILED" },
    });
  }

  return content;
}

export async function deleteGeneratedContent(input: { contentId: string }) {
  const { userId } = await getAuth({ required: true });

  const content = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
    },
  });

  if (!content) {
    throw new Error("Content not found.");
  }

  if (content.type === "VIDEO" && content.museContentId) {
    try {
      await museDeleteContent({ id: content.museContentId });
    } catch (error) {
      console.error(
        `Failed to delete content from MuseMode for content ID ${content.museContentId}:`,
        error,
      );
    }
  }

  await db.generatedContent.delete({
    where: { id: input.contentId },
  });

  return { success: true };
}

export async function retryVideoGeneration(input: { contentId: string }) {
  const { userId } = await getAuth({ required: true });

  const content = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
      type: "VIDEO",
    },
  });

  if (!content) {
    throw new Error("Video content not found.");
  }

  if (!content.sourceIdea) {
    throw new Error(
      "Cannot retry this video generation because the original idea was not saved.",
    );
  }

  const contentIdea = JSON.parse(content.sourceIdea) as ContentIdea;

  await db.generatedContent.update({
    where: { id: content.id },
    data: { status: "PENDING", museTaskId: null },
  });

  const task = await queueTask(async () => {
    try {
      const videoScript = contentIdea.videoScript || contentIdea.contentBrief;
      if (!videoScript) {
        throw new Error(
          "Cannot retry: video script or content brief is missing from the source idea.",
        );
      }
      const { museContentId, museTaskId } =
        await _internal_runMuseGenerationProcess(userId, videoScript);

      await db.generatedContent.update({
        where: { id: content.id },
        data: {
          museContentId,
          museTaskId,
          status: "GENERATING",
          content: "Video is being generated...",
          thumbnailUrl: null,
          customThumbnailUrl: null,
        },
      });
    } catch (error) {
      console.error(
        `[Task] Failed to retry video generation for local ID ${content.id}:`,
        error,
      );
      await db.generatedContent.update({
        where: { id: content.id },
        data: { status: "FAILED" },
      });
    }
  });

  return { success: true, taskId: task.id };
}

export async function generateVideoFromScript(input: {
  script: string;
  title: string;
}) {
  const { userId } = await getAuth({ required: true });

  const pillar = await db.contentPillar.upsert({
    where: {
      userId_name: {
        userId,
        name: "AI-Generated Videos",
      },
    },
    update: {},
    create: {
      userId,
      name: "AI-Generated Videos",
      description: "Videos generated by the AI assistant from a script.",
    },
  });

  const generatedContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: pillar.id,
      title: input.title,
      type: "VIDEO",
      content: "Requesting video generation...",
      sourceIdea: JSON.stringify({
        sourceType: "script",
        script: input.script,
        title: input.title,
      }),
      status: "PENDING",
    },
  });

  const task = await queueTask(async () => {
    try {
      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: { status: "GENERATING" },
      });

      const { museContentId, museTaskId } =
        await _internal_runMuseGenerationProcess(userId, input.script);

      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          museContentId,
          museTaskId,
          content: "Video generation in progress...",
        },
      });
    } catch (error) {
      console.error(
        `[Task] Failed to generate video from script for local ID ${generatedContent.id}:`,
        error,
      );
      await db.generatedContent.update({
        where: { id: generatedContent.id },
        data: {
          status: "FAILED",
          content:
            error instanceof Error ? error.message : "Video generation failed",
        },
      });
    }
  });

  return { taskId: task.id, contentId: generatedContent.id };
}

export async function getVideoContent(input: { contentId: string }) {
  const { userId } = await getAuth({ required: true });

  const content = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
      type: "VIDEO",
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!content) {
    throw new Error("Video content not found.");
  }

  return content;
}

// Content Tagging
export async function createContentTag(input: { name: string }) {
  const { userId } = await getAuth({ required: true });
  const existingTag = await db.contentTag.findFirst({
    where: {
      nameLower: input.name.toLowerCase(),
      userId,
    },
  });

  if (existingTag) {
    throw new Error(`Tag "${input.name}" already exists.`);
  }

  return await db.contentTag.create({
    data: {
      name: input.name,
      nameLower: input.name.toLowerCase(),
      userId,
    },
  });
}

export async function listContentTags() {
  const { userId } = await getAuth({ required: true });
  return await db.contentTag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function addTagToContent(input: {
  contentId: string;
  tagId: string;
}) {
  const { userId } = await getAuth({ required: true });
  // Ensure the user owns the content and the tag
  const content = await db.generatedContent.findFirst({
    where: { id: input.contentId, userId },
  });
  const tag = await db.contentTag.findFirst({
    where: { id: input.tagId, userId },
  });

  if (!content || !tag) {
    throw new Error("Content or Tag not found, or permission denied.");
  }

  return await db.contentTagging.create({
    data: {
      contentId: input.contentId,
      tagId: input.tagId,
      assignedBy: userId,
    },
  });
}

export async function removeTagFromContent(input: {
  contentId: string;
  tagId: string;
}) {
  const { userId } = await getAuth({ required: true });
  // Ensure the user owns the tagging record before deleting
  const tagging = await db.contentTagging.findFirst({
    where: {
      contentId: input.contentId,
      tagId: input.tagId,
      assignedBy: userId,
    },
  });

  if (!tagging) {
    throw new Error("Tag not found on this content or permission denied.");
  }

  await db.contentTagging.delete({
    where: {
      id: tagging.id,
    },
  });

  return { success: true };
}

// Viral Thread Tagging
export async function createViralThreadTag(input: { name: string }) {
  const { userId } = await getAuth({ required: true });
  const existingTag = await db.viralThreadTag.findFirst({
    where: {
      nameLower: input.name.toLowerCase(),
      userId,
    },
  });

  if (existingTag) {
    throw new Error(`Tag "${input.name}" already exists.`);
  }

  return await db.viralThreadTag.create({
    data: {
      name: input.name,
      nameLower: input.name.toLowerCase(),
      userId,
    },
  });
}

export async function listViralThreadTags() {
  const { userId } = await getAuth({ required: true });
  return await db.viralThreadTag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function addTagToViralThread(input: {
  threadId: string;
  tagId: string;
}) {
  const { userId } = await getAuth({ required: true });
  // Ensure the user owns the tag
  const tag = await db.viralThreadTag.findFirst({
    where: { id: input.tagId, userId },
  });

  if (!tag) {
    throw new Error("Tag not found, or permission denied.");
  }

  return await db.viralThreadTagging.create({
    data: {
      threadId: input.threadId,
      tagId: input.tagId,
      assignedBy: userId,
    },
  });
}

export async function removeTagFromViralThread(input: {
  threadId: string;
  tagId: string;
}) {
  const { userId } = await getAuth({ required: true });
  // Ensure the user owns the tagging record before deleting
  const tagging = await db.viralThreadTagging.findFirst({
    where: {
      threadId: input.threadId,
      tagId: input.tagId,
      assignedBy: userId,
    },
  });

  if (!tagging) {
    throw new Error("Tag not found on this thread or permission denied.");
  }

  await db.viralThreadTagging.delete({
    where: {
      id: tagging.id,
    },
  });

  return { success: true };
}

export async function updateContentTitle(input: {
  contentId: string;
  newTitle: string;
}) {
  const { userId } = await getAuth({ required: true });

  const content = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
    },
  });

  if (!content) {
    throw new Error(
      "Content not found or you do not have permission to edit it.",
    );
  }

  return await db.generatedContent.update({
    where: {
      id: input.contentId,
    },
    data: {
      title: input.newTitle,
    },
  });
}

export async function updateViralThread(input: {
  threadId: string;
  title?: string;
  tweets: { content: string }[];
}) {
  return await updateThread({
    threadId: input.threadId,
    title: input.title,
    content: JSON.stringify(input.tweets),
  });
}

export async function setCustomContentThumbnail(input: {
  contentId: string;
  thumbnailBase64: string;
}) {
  const { userId } = await getAuth({ required: true });

  const content = await db.generatedContent.findFirst({
    where: {
      id: input.contentId,
      userId,
    },
  });

  if (!content) {
    throw new Error(
      "Content not found or you do not have permission to edit it.",
    );
  }

  const thumbnailUrl = await upload({
    bufferOrBase64: input.thumbnailBase64,
    fileName: `thumbnails/${input.contentId}_${Date.now()}.png`,
  });

  return await db.generatedContent.update({
    where: {
      id: input.contentId,
    },
    data: {
      customThumbnailUrl: thumbnailUrl,
    },
  });
}

export async function schedulePost(input: {
  content: string;
  platform: string;
  accountId: string;
  pageId?: string;
  scheduledAt: Date;
  sourceType: string;
  sourceId: string;
  imageUrl?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const post = await db.scheduledPost.create({
    data: {
      userId,
      content: input.content,
      platform: input.platform,
      accountId: input.accountId,
      pageId: input.pageId,
      scheduledAt: input.scheduledAt,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      imageUrl: input.imageUrl,
    },
  });

  return post;
}

export async function listScheduledPosts() {
  const { userId } = await getAuth({ required: true });

  const posts = await db.scheduledPost.findMany({
    where: { userId },
    orderBy: { scheduledAt: "asc" },
  });

  return posts;
}

export async function deleteScheduledPost(input: { postId: string }) {
  const { userId } = await getAuth({ required: true });

  const post = await db.scheduledPost.findFirst({
    where: { id: input.postId, userId },
  });

  if (!post) {
    throw new Error(
      "Post not found or you don't have permission to delete it.",
    );
  }

  await db.scheduledPost.delete({
    where: { id: input.postId },
  });

  return { success: true };
}

export async function saveViralThreadAsContent(input: { threadId: string }) {
  const { userId } = await getAuth({ required: true });

  const thread = await getThread({ threadId: input.threadId });
  if (!thread) {
    throw new Error("Thread not found.");
  }

  const pillar = await db.contentPillar.upsert({
    where: {
      userId_name: {
        userId,
        name: "Saved Viral Threads",
      },
    },
    update: {},
    create: {
      userId,
      name: "Saved Viral Threads",
      description:
        "Full threads saved from the Viral Threads library for later use.",
    },
  });

  const content = (thread as any).content;
  let textContent = "";
  if (content && typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item: any) =>
            typeof item === "object" && item !== null && "content" in item,
        )
      ) {
        textContent = parsed.map((t: any) => t.content).join("\n\n---\n\n");
      } else {
        // Handle cases where content is a JSON object but not a tweet array
        textContent = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Not JSON, treat as plain string
      textContent = content;
    }
  } else if (content && Array.isArray(content)) {
    textContent = content.map((t: any) => t.content).join("\n\n---\n\n");
  }

  const newContent = await db.generatedContent.create({
    data: {
      userId,
      pillarId: pillar.id,
      title: (thread as any).title || "Saved Viral Thread",
      type: "TEXT",
      content: textContent,
      status: "DRAFT",
      sourceIdea: JSON.stringify({
        source: "viral-thread",
        threadId: input.threadId,
      }),
    },
  });

  return newContent;
}

export async function getContentHubSummary() {
  const { userId } = await getAuth({ required: true });

  const pillarCount = await db.contentPillar.count({
    where: { userId },
  });

  const contentCount = await db.generatedContent.count({
    where: { userId },
  });

  return { pillarCount, contentCount };
}

export async function _postScheduledContent() {
  const now = new Date();
  const duePosts = await db.scheduledPost.findMany({
    where: {
      status: "PENDING",
      scheduledAt: {
        lte: now,
      },
    },
    include: {
      user: true, // Assuming you need user context for posting
    },
  });

  const postResults = await Promise.allSettled(
    duePosts.map(async (post) => {
      try {
        await postContent({
          platform: post.platform,
          accountId: post.accountId,
          pageId: post.pageId ?? undefined,
          content: post.content,
          imageUrl: post.imageUrl ?? undefined,
        });

        await db.scheduledPost.update({
          where: { id: post.id },
          data: { status: "POSTED" },
        });
        return { id: post.id, status: "fulfilled" };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await db.scheduledPost.update({
          where: { id: post.id },
          data: { status: "FAILED", error: errorMessage },
        });
        return { id: post.id, status: "rejected", reason: errorMessage };
      }
    }),
  );

  return {
    success: true,
    processed: postResults.length,
    fulfilled: postResults.filter((r) => r.status === "fulfilled").length,
    rejected: postResults.filter((r) => r.status === "rejected").length,
  };
}

export type DashboardInsightItem = {
  id: string;
  text: string;
  source: string;
  sourceTab: "topics" | "viral" | "audience" | "engage";
  sourceItemId?: string;
};

export type DashboardSummaryData = {
  // Response Hub
  pendingCommentsCount: number;
  oldestPendingCommentDate: Date | null;
  highPriorityComments: {
    id: string;
    text: string;
    authorName: string;
    platform: string;
  }[];
  pendingNegativeCount: number;
  pendingQuestionCount: number;
  recentNegativeComments: {
    id: string;
    text: string;
    authorName: string;
    platform: string;
  }[];
  recentQuestions: {
    id: string;
    text: string;
    authorName: string;
    platform: string;
  }[];
  // Strategy Hub
  contentIdeasCount: number;
  topRecommendation: any | null;
  topStrategyTheme: string | null;
  quickWinIdea: any | null;
  bigBetIdea: any | null;
  // Content Hub
  scheduledPostsCount: number;
  draftContentCount: number;
  publishedContentCount: number;
  archivedContentCount: number;
  nextScheduledPost: {
    content: string;
    scheduledAt: Date;
    platform: string;
  } | null;
  recentDrafts: {
    id: string;
    title: string;
    type: string;
  }[];
  // General
  engagementChange: number;
  topPost: {
    postId: string;
    platform: string;
    engagement: number;
    contentPreview: string;
  } | null;
  mostActiveUser: {
    authorName: string;
    platform: string;
    commentCount: number;
  } | null;
  actionableRecommendations: DashboardInsightItem[];
  insightNarratives: DashboardInsightItem[];
  trendingTopicsFromViral: DashboardInsightItem[];
};

async function _internal_calculateDashboardData(
  userId: string,
): Promise<DashboardSummaryData> {
  // Response Hub Insights
  const pendingCommentsCount = await db.comment.count({
    where: { userId, responded: false },
  });
  const oldestPendingComment = await db.comment.findFirst({
    where: { userId, responded: false },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const pendingNegativeCount = await db.comment.count({
    where: { userId, responded: false, sentiment: "negative" },
  });

  const recentNegativeComments = await db.comment.findMany({
    where: { userId, responded: false, sentiment: "negative" },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { id: true, text: true, authorName: true, platform: true },
  });

  const pendingQuestionCount = await db.comment.count({
    where: { userId, responded: false, text: { contains: "?" } },
  });

  const recentQuestions = await db.comment.findMany({
    where: { userId, responded: false, text: { contains: "?" } },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { id: true, text: true, authorName: true, platform: true },
  });

  // Strategy Hub Insights
  const contentStrategy = await db.contentStrategy.findUnique({
    where: { userId },
  });
  let topStrategyTheme: string | null = null;
  let contentIdeasCount = 0;
  let topRecommendation: any | null = null;
  let quickWinIdea: any | null = null;
  let bigBetIdea: any | null = null;

  if (contentStrategy?.status === "COMPLETED" && contentStrategy.strategyData) {
    try {
      const strategy = JSON.parse(contentStrategy.strategyData) as {
        strategySummary?: { keyThemes?: string[] };
        calendar?: { posts?: any[] }[];
      };
      if (strategy.strategySummary?.keyThemes?.[0]) {
        topStrategyTheme = strategy.strategySummary.keyThemes[0];
      }

      if (strategy.calendar) {
        contentIdeasCount = strategy.calendar.reduce(
          (acc: number, day: { posts?: any[] }) =>
            acc + (day.posts?.length || 0),
          0,
        );
        for (const day of strategy.calendar) {
          if (day.posts && day.posts.length > 0) {
            topRecommendation = day.posts[0];
            break;
          }
        }

        // Find a quick win (simple text post)
        for (const day of strategy.calendar) {
          if (day.posts) {
            const textPost = day.posts.find(
              (p) =>
                !p.format.toLowerCase().includes("video") &&
                !p.format.toLowerCase().includes("image"),
            );
            if (textPost) {
              quickWinIdea = textPost;
              break;
            }
          }
        }

        // Find a big bet (video or image)
        for (const day of strategy.calendar) {
          if (day.posts) {
            const mediaPost = day.posts.find(
              (p) =>
                p.format.toLowerCase().includes("video") ||
                p.format.toLowerCase().includes("image"),
            );
            if (mediaPost) {
              bigBetIdea = mediaPost;
              break;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Content Hub Insights
  const draftContentCount = await db.generatedContent.count({
    where: { userId, status: "DRAFT" },
  });
  const publishedContentCount = await db.generatedContent.count({
    where: { userId, status: "PUBLISHED" },
  });
  const archivedContentCount = await db.generatedContent.count({
    where: { userId, status: "ARCHIVED" },
  });
  const nextScheduledPost = await db.scheduledPost.findFirst({
    where: { userId, status: "PENDING" },
    orderBy: { scheduledAt: "asc" },
    select: { content: true, scheduledAt: true, platform: true },
  });

  const recentDrafts = await db.generatedContent.findMany({
    where: { userId, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    take: 2,
    select: { id: true, title: true, type: true },
  });

  // Existing high-priority comments and recommendations
  const highPriorityComments = await db.comment.findMany({
    where: {
      userId,
      responded: false,
      priority: {
        gte: 8,
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      text: true,
      authorName: true,
      platform: true,
    },
  });

  const scheduledPostsCount = await db.scheduledPost.count({
    where: {
      userId,
      status: "PENDING",
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentCommentsForAnalysis = await db.comment.findMany({
    where: {
      userId,
      createdAt: { gte: fourteenDaysAgo },
    },
    select: {
      id: true,
      createdAt: true,
      postId: true,
      platform: true,
      likeCount: true,
      replyCount: true,
      text: true,
      authorName: true,
      sentiment: true,
      responded: true,
    },
  });

  const totalComments = recentCommentsForAnalysis.length;
  const respondedComments = recentCommentsForAnalysis.filter(
    (c) => c.responded,
  ).length;
  const responseRate =
    totalComments > 0 ? (respondedComments / totalComments) * 100 : 0;

  const recentCommentsCount = recentCommentsForAnalysis.filter(
    (c) => new Date(c.createdAt) >= sevenDaysAgo,
  ).length;

  const previousCommentsCount =
    recentCommentsForAnalysis.length - recentCommentsCount;

  const engagementChange =
    previousCommentsCount > 0
      ? ((recentCommentsCount - previousCommentsCount) /
          previousCommentsCount) *
        100
      : recentCommentsCount > 0
        ? 100
        : 0;

  const postEngagement: {
    [key: string]: {
      platform: string;
      engagement: number;
      contentPreview: string;
    };
  } = {};
  for (const comment of recentCommentsForAnalysis) {
    if (!comment.postId) continue;
    if (!postEngagement[comment.postId]) {
      postEngagement[comment.postId] = {
        platform: comment.platform,
        engagement: 0,
        contentPreview: comment.text,
      };
    }
    postEngagement[comment.postId]!.engagement +=
      (comment.likeCount ?? 0) + (comment.replyCount ?? 0) + 1;
  }

  const topPostEntry = Object.entries(postEngagement).sort(
    ([, a], [, b]) => b.engagement - a.engagement,
  )[0];

  const topPost = topPostEntry
    ? {
        postId: topPostEntry[0],
        platform: topPostEntry[1].platform,
        engagement: topPostEntry[1].engagement,
        contentPreview: topPostEntry[1].contentPreview.substring(0, 100),
      }
    : null;

  const userActivity: {
    [key: string]: { platform: string; commentCount: number };
  } = {};
  for (const comment of recentCommentsForAnalysis) {
    const key = `${comment.authorName}@${comment.platform}`;
    if (!userActivity[key]) {
      userActivity[key] = {
        platform: comment.platform,
        commentCount: 0,
      };
    }
    userActivity[key]!.commentCount += 1;
  }

  const mostActiveUserEntry = Object.entries(userActivity).sort(
    ([, a], [, b]) => b.commentCount - a.commentCount,
  )[0];

  const mostActiveUser = mostActiveUserEntry
    ? {
        authorName: mostActiveUserEntry[0].split("@")[0]!,
        platform: mostActiveUserEntry[1].platform,
        commentCount: mostActiveUserEntry[1].commentCount,
      }
    : null;

  const actionableRecommendations: DashboardInsightItem[] = [];
  const insightNarratives: DashboardInsightItem[] = [];
  const trendingTopicsFromViral: DashboardInsightItem[] = [];

  try {
    const advancedInsights = await getAdvancedInsights();

    if (advancedInsights && advancedInsights.status === "COMPLETED") {
      if (advancedInsights.trendingTopics?.length) {
        const topic = advancedInsights.trendingTopics[0]!;
        insightNarratives.push({
          id: `narrative-${topic.id}`,
          text: topic.executiveSummary,
          source: `Trending: ${topic.topic}`,
          sourceTab: "topics",
          sourceItemId: topic.id,
        });
        actionableRecommendations.push({
          id: `rec-${topic.id}`,
          text: `Explore the strategic angle for "${topic.topic}": ${topic.strategicAngle}`,
          source: "Trending Topics",
          sourceTab: "topics",
          sourceItemId: topic.id,
        });
      }

      if (advancedInsights.viralContentPotential?.length) {
        const potential = advancedInsights.viralContentPotential[0]!;
        actionableRecommendations.push({
          id: `rec-${potential.id}`,
          text: `Create content for viral idea: "${potential.concept}". Hook: "${potential.hook}"`,
          source: "Viral Potential",
          sourceTab: "viral",
          sourceItemId: potential.id,
        });

        // NEW: Populate trendingTopicsFromViral
        advancedInsights.viralContentPotential.slice(0, 3).forEach((p) => {
          trendingTopicsFromViral.push({
            id: `viral-topic-${p.id}`,
            text: p.concept,
            source: `Virality Score: ${p.viralityScore}/10`,
            sourceTab: "viral",
            sourceItemId: p.id,
          });
        });
      }

      if (advancedInsights.audienceInsights) {
        insightNarratives.push({
          id: "narrative-audience-summary",
          text: advancedInsights.audienceInsights.keyInsightsSummary,
          source: "Audience Insights",
          sourceTab: "audience",
        });
        if (advancedInsights.audienceInsights.personas?.length) {
          const persona = advancedInsights.audienceInsights.personas[0]!;
          actionableRecommendations.push({
            id: `rec-persona-${persona.id}`,
            text: `Engage with the "${persona.personaName}" persona. Tip: ${persona.communicationTips[0] || "Be engaging."}`,
            source: `Audience Persona: ${persona.personaName}`,
            sourceTab: "audience",
            sourceItemId: persona.id,
          });
        }
      }
    }
  } catch (e) {
    console.error("Error fetching advanced insights for dashboard summary:", e);
  }

  // Fallback for Trending Topics if advanced insights (from viral potential) didn't provide any
  if (
    trendingTopicsFromViral.length === 0 &&
    recentCommentsForAnalysis.length > 0
  ) {
    try {
      const fallbackViralPotential = await requestMultimodalModel({
        system:
          "You are a creative social media strategist. Based on the provided comments, generate 3 content ideas with viral potential. For each, provide a concept and a virality score.",
        messages: [
          {
            role: "user",
            content: `Analyze these recent comments and generate 3 viral content ideas from them: ${JSON.stringify(
              recentCommentsForAnalysis.slice(-20).map((c) => c.text),
            )}`,
          },
        ],
        returnType: z.object({
          potential: z.array(
            z.object({
              concept: z.string(),
              viralityScore: z.number().min(1).max(10),
            }),
          ),
        }),
        model: "small",
      });

      fallbackViralPotential.potential.forEach((p) => {
        trendingTopicsFromViral.push({
          id: `fallback-viral-${nanoid()}`,
          text: p.concept,
          source: `Virality Score: ${p.viralityScore.toFixed(1)}/10`,
          sourceTab: "viral",
          sourceItemId: undefined,
        });
      });
    } catch (e) {
      console.error("Error generating fallback viral potential topics:", e);
    }
  }

  // Fallback insights if advanced insights are not available
  if (
    actionableRecommendations.length === 0 &&
    recentCommentsForAnalysis.length > 0
  ) {
    // 1. Prioritize responding to questions
    const firstQuestion = recentCommentsForAnalysis.find((c) =>
      c.text.includes("?"),
    );
    if (firstQuestion) {
      actionableRecommendations.push({
        id: `rec-question-${firstQuestion.id}`,
        text: `Answer a question from ${firstQuestion.authorName} on ${firstQuestion.platform}.`,
        source: "User Questions",
        sourceTab: "engage",
        sourceItemId: firstQuestion.id,
      });
    }

    // 2. Address potentially negative comments
    const negativeKeywords = [
      "disappointed",
      "problem",
      "issue",
      "bad",
      "hate",
      "fix",
    ];
    const firstNegative = recentCommentsForAnalysis.find((c) =>
      negativeKeywords.some((kw) => c.text.toLowerCase().includes(kw)),
    );
    if (firstNegative && firstNegative.id !== firstQuestion?.id) {
      actionableRecommendations.push({
        id: `rec-negative-${firstNegative.id}`,
        text: `Address a potential issue raised by ${firstNegative.authorName}.`,
        source: "Potential Issues",
        sourceTab: "engage",
        sourceItemId: firstNegative.id,
      });
    }

    // 3. Engage with positive comments
    const positiveKeywords = [
      "love",
      "great",
      "amazing",
      "best",
      "thank you",
      "thanks",
    ];
    const firstPositive = recentCommentsForAnalysis.find((c) =>
      positiveKeywords.some((kw) => c.text.toLowerCase().includes(kw)),
    );
    if (
      firstPositive &&
      firstPositive.id !== firstQuestion?.id &&
      firstPositive.id !== firstNegative?.id
    ) {
      actionableRecommendations.push({
        id: `rec-positive-${firstPositive.id}`,
        text: `Engage with positive feedback from ${firstPositive.authorName}.`,
        source: "Positive Feedback",
        sourceTab: "engage",
        sourceItemId: firstPositive.id,
      });
    }
  }

  if (insightNarratives.length === 0 && recentCommentsForAnalysis.length > 0) {
    if (topPost) {
      const topPostComment = recentCommentsForAnalysis.find(
        (c) => c.postId === topPost.postId,
      );
      insightNarratives.push({
        id: `narrative-top-post-${topPost.postId}`,
        text: `Your post on ${topPost.platform} is performing well with ${topPost.engagement} engagements. Double down on this type of content!`,
        source: "Top Performing Post",
        sourceTab: "engage",
        sourceItemId: topPostComment ? topPostComment.id : undefined,
      });
    }

    if (mostActiveUser) {
      insightNarratives.push({
        id: `narrative-active-user-${mostActiveUser.authorName}`,
        text: `${mostActiveUser.authorName} is your most active user with ${mostActiveUser.commentCount} comments. Consider showing them some love!`,
        source: "Most Active User",
        sourceTab: "engage",
      });
    }

    if (responseRate < 50 && totalComments > 10) {
      insightNarratives.push({
        id: "narrative-response-rate",
        text: `Your response rate is currently ${responseRate.toFixed(
          0,
        )}%. Responding to more comments can boost engagement.`,
        source: "Response Rate",
        sourceTab: "engage",
      });
    }
  }

  return {
    // Response Hub
    pendingCommentsCount,
    oldestPendingCommentDate: oldestPendingComment?.createdAt || null,
    highPriorityComments,
    pendingNegativeCount,
    pendingQuestionCount,
    recentNegativeComments,
    recentQuestions,
    // Strategy Hub
    contentIdeasCount,
    topRecommendation,
    topStrategyTheme,
    quickWinIdea,
    bigBetIdea,
    // Content Hub
    scheduledPostsCount,
    draftContentCount,
    publishedContentCount,
    archivedContentCount,
    nextScheduledPost,
    recentDrafts,
    // General
    engagementChange: Math.round(engagementChange),
    topPost,
    mostActiveUser,
    actionableRecommendations,
    insightNarratives,
    trendingTopicsFromViral,
  };
}

export async function triggerDashboardSummaryGeneration() {
  const { userId } = await getAuth({ required: true });

  // Consume credits for dashboard summary generation (8 credits)
  await _consumeCredits(
    userId,
    "dashboard_summary_generation",
    8,
    "Generated comprehensive dashboard summary with AI insights",
  );

  const cacheKey = `dashboard_summary_v1_${userId}`;

  const existingCache = await db.analyticsCache.findFirst({
    where: {
      cacheKey,
      status: "COMPLETED",
      completedAt: { gte: new Date(Date.now() - 1000 * 60 * 120) }, // 2 hour cache for dashboard data
    },
  });

  if (existingCache) {
    return { taskId: null, cacheKey, useCache: true };
  }

  const runningCache = await db.analyticsCache.findFirst({
    where: { cacheKey, status: { in: ["PENDING", "GENERATING"] } },
  });

  if (runningCache) {
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const isStale =
      new Date().getTime() - new Date(runningCache.startedAt).getTime() >
      STALE_THRESHOLD;
    if (!isStale) {
      return { taskId: null, cacheKey, useCache: false }; // Let it continue
    }
    await updateAnalyticsCache({
      userId,
      cacheKey: runningCache.cacheKey,
      cacheType: "dashboard_summary",
      status: "FAILED",
      error: "Task timed out and was marked as stale.",
    });
  }

  await updateAnalyticsCache({
    userId,
    cacheKey,
    cacheType: "dashboard_summary",
    status: "PENDING",
  });

  const task = await queueTask(async () => {
    try {
      await updateAnalyticsCache({
        userId,
        cacheKey,
        cacheType: "dashboard_summary",
        status: "GENERATING",
      });
      const summaryData = await _internal_calculateDashboardData(userId);
      await updateAnalyticsCache({
        userId,
        cacheKey,
        cacheType: "dashboard_summary",
        status: "COMPLETED",
        data: summaryData,
      });
    } catch (e) {
      await updateAnalyticsCache({
        userId,
        cacheKey,
        cacheType: "dashboard_summary",
        status: "FAILED",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  });

  return { taskId: task.id, cacheKey, useCache: false };
}

export async function getDashboardSummary(input?: {
  cacheKey?: string | null;
}) {
  const { userId } = await getAuth({ required: true });

  if (!input?.cacheKey) {
    return { status: "NOTFOUND" };
  }

  const cacheEntry = await db.analyticsCache.findUnique({
    where: { cacheKey: input.cacheKey },
  });

  if (!cacheEntry || cacheEntry.userId !== userId) {
    return { status: "NOTFOUND" };
  }

  if (cacheEntry.status === "COMPLETED" && cacheEntry.data) {
    try {
      const parsedData = JSON.parse(cacheEntry.data) as DashboardSummaryData;
      return {
        status: "COMPLETED",
        data: parsedData,
        completedAt: cacheEntry.completedAt,
      };
    } catch {
      return {
        status: "FAILED",
        error: "Failed to parse data.",
        completedAt: cacheEntry.completedAt,
      };
    }
  }

  return {
    status: cacheEntry.status,
    error: cacheEntry.error,
    completedAt: cacheEntry.completedAt,
  };
}

export async function searchApp(input: { query: string }) {
  const { userId } = await getAuth({ required: true });
  const { query } = input;

  if (!query || query.trim().length < 2) {
    return { comments: [], content: [], pillars: [] };
  }

  const [comments, content, pillars] = await Promise.all([
    db.comment.findMany({
      where: {
        userId,
        text: { contains: query },
      },
      take: 5,
      select: { id: true, text: true, platform: true, authorName: true },
      orderBy: { createdAt: "desc" },
    }),
    db.generatedContent.findMany({
      where: {
        userId,
        OR: [{ title: { contains: query } }, { content: { contains: query } }],
      },
      take: 5,
      select: { id: true, title: true, type: true, pillarId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.contentPillar.findMany({
      where: {
        userId,
        name: { contains: query },
      },
      take: 5,
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { comments, content, pillars };
}

export async function markTourAsCompleted() {
  const { userId } = await getAuth({ required: true });
  await db.user.update({
    where: { id: userId },
    data: { hasCompletedTour: true },
  });
  return { success: true };
}

export async function _seedBlogPosts() {
  // Find or create an author for the blog posts
  let author = await db.user.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!author) {
    author = await db.user.create({
      data: {
        name: "SocialWave AI",
      },
    });
  }
  const authorId = author.id;

  const topics = [
    "The Ultimate Guide to AI-Powered Social Media Management in 2025",
    "How to Go Viral: Deconstructing the Anatomy of a Viral Social Media Post",
    "Beyond ChatGPT: Top 5 AI Tools That Will Revolutionize Your Content Strategy",
    "Maximizing Your Reach: SEO for Social Media Explained",
    "SocialWave vs. Hootsuite: The Best Social Media Management Tool for 2025",
    "10x Your Engagement: How SocialWave's AI Finds Viral Content for You",
    "The Future of Content Creation: A Deep Dive into SocialWave's AI Generator",
    "Case Study: How We Grew Our Social Following by 300% with SocialWave",
  ];

  const generatedPosts = await Promise.all(
    topics.map(async (topic) => {
      const postContent = await requestMultimodalModel({
        system:
          "You are an expert content creator and SEO specialist. Generate a comprehensive, engaging, and SEO-optimized blog post based on the provided topic. The post should be at least 800 words long. Include a meta title, meta description, and relevant tags.",
        messages: [
          {
            role: "user",
            content: `Generate a blog post on the topic: "${topic}"`,
          },
        ],
        returnType: z.object({
          title: z.string(),
          slug: z.string().transform((s) =>
            s
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
          ),
          content: z.string(),
          metaTitle: z.string(),
          metaDescription: z.string(),
          tags: z.array(z.string()),
          imagePrompt: z
            .string()
            .describe(
              "A prompt for DALL-E to generate a featured image for this blog post.",
            ),
        }),
        model: "medium",
      });

      const { imageUrl } = await requestMultimodalModel({
        system: "You are an image generation assistant.",
        messages: [
          {
            role: "user",
            content: `Generate an image for the following prompt: ${postContent.imagePrompt}`,
          },
        ],
        returnType: z.object({ imageUrl: z.string() }),
      });

      return {
        ...postContent,
        authorId: authorId,
        publishedAt: new Date(),
        isPublished: true,
        featuredImageUrl: imageUrl,
        tags: postContent.tags.join(","),
      };
    }),
  );

  const postsToCreate: Prisma.BlogPostCreateManyInput[] = [];
  for (const post of generatedPosts) {
    const existingPost = await db.blogPost.findUnique({
      where: { slug: post.slug },
    });
    if (!existingPost) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imagePrompt, ...rest } = post;
      postsToCreate.push(rest);
    }
  }

  if (postsToCreate.length > 0) {
    await db.blogPost.createMany({
      data: postsToCreate,
    });
  }

  return { success: true, count: postsToCreate.length };
}

export async function listPublishedBlogPosts() {
  return await db.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    select: {
      title: true,
      slug: true,
      publishedAt: true,
      featuredImageUrl: true,
      metaDescription: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getBlogPostBySlug(input: { slug: string }) {
  return await db.blogPost.findUnique({
    where: { slug: input.slug, isPublished: true },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getAnalyticsSummary(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const where: Prisma.CommentWhereInput = {
    userId,
  };

  if (input?.platform && input.platform !== "all") {
    where.platform = input.platform;
  }
  if (input?.pageId) {
    where.pageId = input.pageId;
  }

  const comments = await db.comment.findMany({ where });

  const totalComments = comments.length;
  const respondedComments = comments.filter((c) => c.responded).length;
  const responseRate =
    totalComments > 0 ? (respondedComments / totalComments) * 100 : 0;

  const totalEngagement = comments.reduce(
    (acc, c) => acc + (c.likeCount ?? 0) + (c.replyCount ?? 0),
    0,
  );

  const sentimentBreakdown = comments.reduce(
    (acc, c) => {
      const sentiment = c.sentiment || "neutral";
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const followerCount: { current: number | null; change: number | null } = {
    current: null,
    change: null,
  };

  if (input?.pageId) {
    const pageAnalytics = await db.pageAnalytics.findMany({
      where: { pageId: input.pageId },
      orderBy: { date: "desc" },
      take: 2,
    });
    if (pageAnalytics.length > 0) {
      followerCount.current = pageAnalytics[0]!.followerCount;
      if (pageAnalytics.length > 1) {
        const previousCount = pageAnalytics[1]!.followerCount;
        if (previousCount > 0) {
          followerCount.change =
            ((followerCount.current - previousCount) / previousCount) * 100;
        }
      }
    }
  }

  return {
    totalEngagement,
    responseRate,
    sentimentBreakdown,
    followerCount,
    totalComments,
  };
}

export async function getPostingActivityHeatmap(input?: {
  pageId?: string;
  platform?: string;
}) {
  const { userId } = await getAuth({ required: true });

  const where: Prisma.CommentWhereInput = {
    userId,
  };

  if (input?.platform && input.platform !== "all") {
    where.platform = input.platform;
  }
  if (input?.pageId) {
    where.pageId = input.pageId;
  }

  const comments = await db.comment.findMany({
    where,
    select: {
      createdAt: true,
    },
  });

  const activityData: number[] = Array(7 * 24).fill(0);

  for (const comment of comments) {
    const date = new Date(comment.createdAt);
    const day = date.getUTCDay(); // Sunday = 0, Saturday = 6
    const hour = date.getUTCHours();
    const index = day * 24 + hour;
    if (activityData[index] !== undefined) {
      activityData[index]++;
    }
  }

  const heatmap = activityData.map((activity, i) => ({
    day: Math.floor(i / 24),
    hour: i % 24,
    activity,
  }));

  return heatmap;
}

// Enhanced Brand Context Analysis System
export async function analyzeBrandContext() {
  const { userId } = await getAuth({ required: true });

  // Consume credits for brand context analysis (12 credits)
  await _consumeCredits(
    userId,
    "brand_context_analysis",
    12,
    "Analyzed comprehensive brand context with AI insights",
  );

  const task = await queueTask(async () => {
    try {
      // Gather data for analysis
      const [
        comments,
        brandGuidelines,
        brandSignals,
        generatedContent,
        accounts,
      ] = await Promise.all([
        db.comment.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { text: true, platform: true, sentiment: true, topics: true },
        }),
        db.brandGuidelines.findUnique({ where: { userId } }),
        db.brandSignal.findUnique({ where: { userId } }),
        db.generatedContent.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { pillar: true },
        }),
        db.account.findMany({
          where: { userId },
          select: { platform: true, name: true },
        }),
      ]);

      // Analyze brand context using AI
      const analysisResult = await requestMultimodalModel({
        system: `You are a brand strategist and market analyst. Analyze the provided data to create a comprehensive brand context profile. Focus on identifying industry, niche, target audience, brand personality, and competitive positioning.`,
        messages: [
          {
            role: "user",
            content: `Analyze this brand data and create a comprehensive brand context:\n\nComments: ${JSON.stringify(comments.slice(0, 50))}\nBrand Guidelines: ${JSON.stringify(brandGuidelines)}\nBrand Signals: ${JSON.stringify(brandSignals)}\nContent Pillars: ${JSON.stringify(generatedContent.map((c) => c.pillar.name))}\nConnected Platforms: ${JSON.stringify(accounts.map((a) => a.platform))}`,
          },
        ],
        returnType: z.object({
          industry: z.string().describe("Primary industry category"),
          niche: z.string().describe("Specific niche within industry"),
          targetAudience: z.object({
            demographics: z.string(),
            psychographics: z.string(),
            painPoints: z.array(z.string()),
            interests: z.array(z.string()),
          }),
          brandPersonality: z.object({
            traits: z.array(z.string()),
            voiceTone: z.string(),
            communicationStyle: z.string(),
          }),
          competitorAnalysis: z.object({
            directCompetitors: z.array(z.string()),
            indirectCompetitors: z.array(z.string()),
            differentiators: z.array(z.string()),
          }),
          brandValues: z.array(z.string()),
          contentThemes: z.array(z.string()),
          riskTolerance: z.enum(["low", "medium", "high"]),
          trendAdoptionSpeed: z.enum([
            "conservative",
            "moderate",
            "early-adopter",
          ]),
        }),
      });

      // Save or update brand context
      await db.brandContext.upsert({
        where: { userId },
        update: {
          industry: analysisResult.industry,
          niche: analysisResult.niche,
          targetAudience: JSON.stringify(analysisResult.targetAudience),
          brandPersonality: JSON.stringify(analysisResult.brandPersonality),
          competitorAnalysis: JSON.stringify(analysisResult.competitorAnalysis),
          brandValues: JSON.stringify(analysisResult.brandValues),
          contentThemes: JSON.stringify(analysisResult.contentThemes),
          riskTolerance: analysisResult.riskTolerance,
          trendAdoptionSpeed: analysisResult.trendAdoptionSpeed,
          lastAnalyzedAt: new Date(),
        },
        create: {
          userId,
          industry: analysisResult.industry,
          niche: analysisResult.niche,
          targetAudience: JSON.stringify(analysisResult.targetAudience),
          brandPersonality: JSON.stringify(analysisResult.brandPersonality),
          competitorAnalysis: JSON.stringify(analysisResult.competitorAnalysis),
          brandValues: JSON.stringify(analysisResult.brandValues),
          contentThemes: JSON.stringify(analysisResult.contentThemes),
          riskTolerance: analysisResult.riskTolerance,
          trendAdoptionSpeed: analysisResult.trendAdoptionSpeed,
          lastAnalyzedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error analyzing brand context:", error);
      throw error;
    }
  });

  return task;
}

export async function getBrandContext() {
  const { userId } = await getAuth({ required: true });

  const brandContext = await db.brandContext.findUnique({
    where: { userId },
  });

  if (!brandContext) {
    return null;
  }

  return {
    ...brandContext,
    targetAudience: brandContext.targetAudience
      ? JSON.parse(brandContext.targetAudience)
      : null,
    brandPersonality: brandContext.brandPersonality
      ? JSON.parse(brandContext.brandPersonality)
      : null,
    competitorAnalysis: brandContext.competitorAnalysis
      ? JSON.parse(brandContext.competitorAnalysis)
      : null,
    brandValues: brandContext.brandValues
      ? JSON.parse(brandContext.brandValues)
      : null,
    contentThemes: brandContext.contentThemes
      ? JSON.parse(brandContext.contentThemes)
      : null,
  };
}

export async function getBrandContextAnalysisStatus(taskId: string) {
  return await getTaskStatusInternal(taskId);
}

export async function getTaskStatus({ taskId }: { taskId: string }) {
  return await getTaskStatusInternal(taskId);
}

// Saved insights management
export async function saveTrendInsight(input: {
  type: "trending" | "viral" | "audience";
  data: any;
  title: string;
}) {
  const { userId } = await getAuth({ required: true });

  return await db.savedInsight.create({
    data: {
      userId,
      type: input.type,
      data: JSON.stringify(input.data),
      title: input.title,
    },
  });
}

export async function removeSavedInsight(input: { id: string }) {
  const { userId } = await getAuth({ required: true });

  return await db.savedInsight.delete({
    where: {
      id: input.id,
      userId, // Ensure user can only delete their own insights
    },
  });
}

export async function listSavedInsights(input?: {
  type?: "trending" | "viral" | "audience";
}) {
  const { userId } = await getAuth({ required: true });

  const where: any = { userId };
  if (input?.type) {
    where.type = input.type;
  }

  const insights = await db.savedInsight.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return insights.map((insight) => ({
    ...insight,
    data: JSON.parse(insight.data),
  }));
}

// Credit Management Functions
export async function getUserCredits() {
  const { userId } = await getAuth({ required: true });

  // Check if user is superadmin
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    return {
      userId,
      totalCredits: 999999,
      usedCredits: 0,
      availableCredits: 999999,
      subscriptionPlan: "superadmin",
      monthlyAllocation: 999999,
      extraCredits: 0,
      lastResetAt: new Date(),
      transactions: [],
    };
  }

  // First sync subscription benefits
  await syncSubscriptionBenefits();

  let userCredits = await db.userCredits.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50, // Latest 50 transactions
      },
    },
  });

  // Create default credit record if it doesn't exist
  if (!userCredits) {
    userCredits = await db.userCredits.create({
      data: {
        userId,
        totalCredits: 0,
        usedCredits: 0,
        subscriptionPlan: "none",
        monthlyAllocation: 0,
        extraCredits: 0,
        lastResetAt: new Date(),
      },
      include: {
        transactions: true,
      },
    });
  }

  return {
    ...userCredits,
    availableCredits: userCredits.totalCredits - userCredits.usedCredits,
  };
}

export async function getCreditPricing() {
  return await db.creditPricing.findMany({
    where: { isActive: true },
    orderBy: { operation: "asc" },
  });
}

export async function getCreditTransactionHistory(input?: {
  limit?: number;
  offset?: number;
}) {
  const { userId } = await getAuth({ required: true });
  const limit = input?.limit || 50;
  const offset = input?.offset || 0;

  const transactions = await db.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const totalCount = await db.creditTransaction.count({
    where: { userId },
  });

  return {
    transactions,
    totalCount,
    hasMore: offset + limit < totalCount,
  };
}

// Helper function to consume credits (internal use)
export async function isSuperAdmin() {
  try {
    return await checkSuperAdminStatus();
  } catch {
    return false;
  }
}

export async function _consumeCredits(
  userId: string,
  operation: string,
  amount: number,
  description?: string,
  metadata?: any,
) {
  // Check if user is superadmin - they have unlimited credits
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    // Get or create user credits for superadmin to have a valid userCreditsId
    let userCredits = await db.userCredits.findUnique({
      where: { userId },
    });

    if (!userCredits) {
      userCredits = await db.userCredits.create({
        data: {
          userId,
          totalCredits: 999999,
          usedCredits: 0,
          subscriptionPlan: "superadmin",
          monthlyAllocation: 999999,
          extraCredits: 0,
          lastResetAt: new Date(),
        },
      });
    }

    // Record transaction for tracking but don't deduct credits
    await db.creditTransaction.create({
      data: {
        userId,
        userCreditsId: userCredits.id,
        type: "usage",
        amount: -amount,
        operation,
        description:
          description || `SuperAdmin used ${amount} credits for ${operation}`,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return {
      remainingCredits: 999999, // Unlimited for superadmin
      transactionId: "superadmin-unlimited",
    };
  }

  // Get or create user credits for regular users
  let userCredits = await db.userCredits.findUnique({
    where: { userId },
  });

  if (!userCredits) {
    userCredits = await db.userCredits.create({
      data: {
        userId,
        totalCredits: 0,
        usedCredits: 0,
        subscriptionPlan: "none",
        monthlyAllocation: 0,
        extraCredits: 0,
        lastResetAt: new Date(),
      },
    });
  }

  const availableCredits = userCredits.totalCredits - userCredits.usedCredits;

  if (availableCredits < amount) {
    throw new Error(
      `Insufficient credits. Available: ${availableCredits}, Required: ${amount}`,
    );
  }

  // Update credit usage
  await db.userCredits.update({
    where: { userId },
    data: {
      usedCredits: userCredits.usedCredits + amount,
    },
  });

  // Record transaction
  await db.creditTransaction.create({
    data: {
      userId,
      userCreditsId: userCredits.id,
      type: "usage",
      amount: -amount,
      operation,
      description: description || `Used ${amount} credits for ${operation}`,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return {
    remainingCredits: availableCredits - amount,
    transactionId: "transaction-recorded",
  };
}

// Seed function to create pricing products
// Sync subscription benefits from Adaptive monetization system
// Get user's subscription status and credit info
export async function getSubscriptionStatus() {
  await getAuth({ required: true });

  try {
    const purchases = await listUserPurchases();
    const userCredits = await getUserCredits();

    const activeSubscription = purchases.find((p) => p.kind === "SUBSCRIPTION");
    const creditPurchases = purchases.filter(
      (p) =>
        p.kind === "IN_APP_PURCHASE" && p.name.includes("Additional Credits"),
    );

    return {
      hasActiveSubscription: !!activeSubscription,
      subscriptionPlan: activeSubscription?.name || "None",
      subscriptionPrice: activeSubscription?.price || 0,
      totalCreditPurchases: creditPurchases.length,
      credits: userCredits,
      allPurchases: purchases,
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    const userCredits = await getUserCredits();
    return {
      hasActiveSubscription: false,
      subscriptionPlan: "None",
      subscriptionPrice: 0,
      totalCreditPurchases: 0,
      credits: userCredits,
      allPurchases: [],
    };
  }
}

export async function getAvailableSubscriptionPlans() {
  try {
    // For now, return mock data since listProducts is not available
    const subscriptionPlans: any[] = [];
    const creditPacks: any[] = [];

    return {
      subscriptionPlans,
      creditPacks,
      allProducts: [],
    };
  } catch (error) {
    console.error("Error getting available subscription plans:", error);
    return {
      subscriptionPlans: [],
      creditPacks: [],
      allProducts: [],
    };
  }
}

export async function getSubscriptionUpgradeOptions() {
  try {
    const [subscriptionStatus, availablePlans] = await Promise.all([
      getSubscriptionStatus(),
      getAvailableSubscriptionPlans(),
    ]);

    const currentPlan = subscriptionStatus.hasActiveSubscription
      ? availablePlans.subscriptionPlans.find(
          (p) => p.name === subscriptionStatus.subscriptionPlan,
        )
      : null;

    // Filter out the current plan from upgrade options
    const upgradeOptions = availablePlans.subscriptionPlans.filter(
      (plan) => plan.name !== subscriptionStatus.subscriptionPlan,
    );

    return {
      currentPlan,
      upgradeOptions,
      creditPacks: availablePlans.creditPacks,
      canUpgrade: upgradeOptions.length > 0,
    };
  } catch (error) {
    console.error("Error getting subscription upgrade options:", error);
    return {
      currentPlan: null,
      upgradeOptions: [],
      creditPacks: [],
      canUpgrade: false,
    };
  }
}

export async function syncSubscriptionBenefits() {
  const { userId } = await getAuth({ required: true });

  try {
    // Get user's current purchases from Adaptive
    const purchases = await listUserPurchases();

    // Check for active subscription
    const activeSubscription = purchases.find((p) => p.kind === "SUBSCRIPTION");

    let subscriptionPlan = "none";
    let monthlyAllocation = 0;

    if (activeSubscription) {
      // Map product names to subscription plans
      if (activeSubscription.name.includes("Starter")) {
        subscriptionPlan = "starter";
        monthlyAllocation = 500;
      } else if (activeSubscription.name.includes("Professional")) {
        subscriptionPlan = "professional";
        monthlyAllocation = 1500;
      } else if (activeSubscription.name.includes("Enterprise")) {
        subscriptionPlan = "enterprise";
        monthlyAllocation = 4000;
      }
    }

    // Count additional credit purchases
    const creditPurchases = purchases.filter(
      (p) =>
        p.kind === "IN_APP_PURCHASE" && p.name.includes("Additional Credits"),
    );
    const extraCredits = creditPurchases.length * 500; // 500 credits per pack

    // Get or create user credits record
    let userCredits = await db.userCredits.findUnique({
      where: { userId },
    });

    if (!userCredits) {
      userCredits = await db.userCredits.create({
        data: {
          userId,
          totalCredits: monthlyAllocation + extraCredits,
          usedCredits: 0,
          subscriptionPlan,
          monthlyAllocation,
          extraCredits,
          lastResetAt: new Date(),
        },
      });
    } else {
      // Check if we need to reset monthly credits
      const now = new Date();
      const lastReset = new Date(userCredits.lastResetAt);
      const shouldReset =
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear();

      if (shouldReset && subscriptionPlan !== "none") {
        // Reset monthly credits but keep extra credits
        await db.userCredits.update({
          where: { userId },
          data: {
            totalCredits: monthlyAllocation + userCredits.extraCredits,
            usedCredits: 0,
            subscriptionPlan,
            monthlyAllocation,
            lastResetAt: now,
          },
        });

        // Log the monthly reset
        await db.creditTransaction.create({
          data: {
            userId,
            userCreditsId: userCredits.id,
            type: "allocation",
            operation: "monthly_reset",
            amount: monthlyAllocation,
            description: `Monthly ${subscriptionPlan} plan credits reset`,
          },
        });
      } else {
        // Just update subscription info and add any new extra credits
        // Check if user has purchased more credit packs since last sync
        const currentPurchaseCount = creditPurchases.length;
        const lastKnownPurchases = Math.floor(userCredits.extraCredits / 500);
        const newPurchases = Math.max(
          0,
          currentPurchaseCount - lastKnownPurchases,
        );
        const creditDifference = newPurchases * 500;
        const newExtraCredits = userCredits.extraCredits + creditDifference;

        if (
          creditDifference > 0 ||
          userCredits.subscriptionPlan !== subscriptionPlan
        ) {
          await db.userCredits.update({
            where: { userId },
            data: {
              totalCredits: userCredits.totalCredits + creditDifference,
              subscriptionPlan,
              monthlyAllocation,
              extraCredits: newExtraCredits,
            },
          });

          if (creditDifference > 0) {
            // Log the extra credit addition
            await db.creditTransaction.create({
              data: {
                userId,
                userCreditsId: userCredits.id,
                type: "purchase",
                operation: "additional_credits",
                amount: creditDifference,
                description: `Additional credits purchased`,
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error syncing subscription benefits:", error);
  }
}

// Cron job handler to reset monthly credits for all subscription users
export async function _monthlyCreditsResetHandler() {
  try {
    const now = new Date();

    // Find all users with active subscriptions that need reset
    const usersToReset = await db.userCredits.findMany({
      where: {
        subscriptionPlan: {
          not: "none",
        },
        OR: [
          {
            lastResetAt: {
              lt: new Date(now.getFullYear(), now.getMonth(), 1), // Before this month
            },
          },
          {
            // lastResetAt: null,
          },
        ],
      },
    });

    console.log(`Resetting credits for ${usersToReset.length} users`);

    for (const userCredits of usersToReset) {
      const monthlyAllocation = userCredits.monthlyAllocation;

      await db.userCredits.update({
        where: { userId: userCredits.userId },
        data: {
          totalCredits: monthlyAllocation + userCredits.extraCredits,
          usedCredits: 0,
          lastResetAt: now,
        },
      });

      // Log the reset transaction
      await db.creditTransaction.create({
        data: {
          userId: userCredits.userId,
          userCreditsId: userCredits.id,
          type: "allocation",
          operation: "monthly_reset",
          amount: monthlyAllocation,
          description: `Monthly ${userCredits.subscriptionPlan} plan credits reset`,
        },
      });
    }

    console.log(`Successfully reset credits for ${usersToReset.length} users`);
  } catch (error) {
    console.error("Error in monthly credits reset:", error);
  }
}

export async function _seedCreditPricing() {
  // Create credit pricing for different operations
  const pricingData = [
    {
      operation: "trend_analysis",
      creditsPerUnit: 2.0,
      description: "Analyze trending topics and brand alignment",
    },
    {
      operation: "content_generation",
      creditsPerUnit: 3.0,
      description: "Generate AI-powered content from trends or ideas",
    },
    {
      operation: "viral_thread_creation",
      creditsPerUnit: 5.0,
      description: "Create viral thread content with AI assistance",
    },
    {
      operation: "sentiment_analysis",
      creditsPerUnit: 1.0,
      description: "Analyze sentiment of comments and engagement",
    },
    {
      operation: "response_generation",
      creditsPerUnit: 1.5,
      description: "Generate AI responses to comments and messages",
    },
    {
      operation: "image_generation",
      creditsPerUnit: 4.0,
      description: "Generate AI images for content",
    },
    {
      operation: "video_generation",
      creditsPerUnit: 8.0,
      description: "Generate AI videos from scripts",
    },
    {
      operation: "analytics_insights",
      creditsPerUnit: 3.0,
      description: "Generate advanced analytics and insights",
    },
  ];

  const pricing = await Promise.all(
    pricingData.map((item) =>
      db.creditPricing.create({
        data: item,
      }),
    ),
  );

  console.log("Created credit pricing:", pricing);
  return pricing;
}

export async function _seedPricingProducts() {
  // Create the three pricing tiers
  const products = await Promise.all([
    // Starter Plan - $19/month
    createProduct({
      name: "Starter Plan",
      description:
        "Perfect for individuals and small creators getting started with AI-powered social media management. Includes 500 credits per month for content generation, trend analysis, and basic insights.",
      price: 19_00, // $19.00
      kind: "SUBSCRIPTION",
    }),

    // Professional Plan - $49/month
    createProduct({
      name: "Professional Plan",
      description:
        "Ideal for growing businesses and content creators who need advanced AI features. Includes 1,500 credits per month for viral thread creation, video generation, and comprehensive analytics.",
      price: 49_00, // $49.00
      kind: "SUBSCRIPTION",
    }),

    // Enterprise Plan - $99/month
    createProduct({
      name: "Enterprise Plan",
      description:
        "For agencies and large teams requiring unlimited AI capabilities. Includes 4,000 credits per month plus priority support and advanced team collaboration features.",
      price: 99_00, // $99.00
      kind: "SUBSCRIPTION",
    }),

    // Additional Credits Pack - $15 one-time
    createProduct({
      name: "Additional Credits Pack",
      description:
        "Boost your monthly allowance with 500 extra credits. Perfect for busy months when you need more AI-powered content generation and analysis.",
      price: 15_00, // $15.00
      kind: "IN_APP_PURCHASE",
    }),
  ]);

  console.log("Created pricing products:", products);
  return products;
}

export async function setSuperAdmin({
  email,
  isSuperAdmin,
  credits,
}: {
  email: string;
  isSuperAdmin: boolean;
  credits?: number;
}) {
  const { userId } = await getAuth({ required: true });

  // Get current user info
  const currentUser = await db.user.findUnique({ where: { id: userId } });

  // Special case: Allow metamarketers23@gmail.com to be set as superadmin even if no current superadmin exists
  // This handles the bootstrap case where we need to create the first superadmin
  const isBootstrapCase =
    email === "metamarketers23@gmail.com" &&
    (currentUser?.handle === "metamarketers23452201367" ||
      currentUser?.name === "Metamarketers23");

  // Only existing superadmins can modify superadmin status, unless it's the bootstrap case
  const currentUserIsSuperAdmin = await checkSuperAdminStatus();

  if (!currentUserIsSuperAdmin && !isBootstrapCase) {
    throw new Error(
      "Unauthorized: Only superadmins can modify superadmin status",
    );
  }

  // Handle bootstrap case - update current user's email if they're the metamarketers23 user
  if (isBootstrapCase) {
    // Update current user's email and superadmin status
    await db.user.update({
      where: { id: userId },
      data: {
        email: "metamarketers23@gmail.com",
        isSuperAdmin: true,
      },
    });

    // Set unlimited credits if specified
    if (credits !== undefined) {
      await db.userCredits.upsert({
        where: { userId },
        create: {
          userId,
          totalCredits: credits,
          usedCredits: 0,
          subscriptionPlan: "unlimited",
          monthlyAllocation: credits,
          extraCredits: credits,
        },
        update: {
          totalCredits: credits,
          subscriptionPlan: "unlimited",
          monthlyAllocation: credits,
          extraCredits: credits,
        },
      });
    }

    return {
      success: true,
      message: `Successfully granted superadmin status and set up unlimited credits for ${email}`,
    };
  }

  // Find user by email for non-bootstrap cases
  const targetUser = await db.user.findFirst({
    where: {
      OR: [
        { email },
        { handle: email }, // In case they provided handle instead
      ],
    },
  });

  if (!targetUser) {
    throw new Error(`User with email ${email} not found`);
  }

  // Update superadmin status
  await db.user.update({
    where: { id: targetUser.id },
    data: { isSuperAdmin },
  });

  // Set credits if specified
  if (credits !== undefined) {
    await db.userCredits.upsert({
      where: { userId: targetUser.id },
      create: {
        userId: targetUser.id,
        totalCredits: credits,
        usedCredits: 0,
        subscriptionPlan: credits >= 999999 ? "unlimited" : "custom",
        monthlyAllocation: credits,
        extraCredits: credits,
      },
      update: {
        totalCredits: credits,
        subscriptionPlan: credits >= 999999 ? "unlimited" : "custom",
        monthlyAllocation: credits,
        extraCredits: credits,
      },
    });
  }

  return {
    success: true,
    message: `Successfully ${isSuperAdmin ? "granted" : "revoked"} superadmin status for ${email}`,
  };
}

export async function getUserCreditsById(input: { userId: string }) {
  await getAuth({ required: true });

  // Only superadmins can get credits for other users
  const currentUserIsSuperAdmin = await checkSuperAdminStatus();

  if (!currentUserIsSuperAdmin) {
    throw new Error("Unauthorized: Only superadmins can view user credits");
  }

  // Check if target user is superadmin
  const targetUser = await db.user.findUnique({
    where: { id: input.userId },
    select: { isSuperAdmin: true },
  });

  if (targetUser?.isSuperAdmin) {
    return {
      userId: input.userId,
      totalCredits: 999999,
      usedCredits: 0,
      availableCredits: 999999,
      subscriptionPlan: "superadmin",
      monthlyAllocation: 999999,
      extraCredits: 0,
      lastResetAt: new Date(),
      transactions: [],
    };
  }

  let userCredits = await db.userCredits.findUnique({
    where: { userId: input.userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10, // Latest 10 transactions for admin view
      },
    },
  });

  // Create default credit record if it doesn't exist
  if (!userCredits) {
    userCredits = await db.userCredits.create({
      data: {
        userId: input.userId,
        totalCredits: 0,
        usedCredits: 0,
        subscriptionPlan: "none",
        monthlyAllocation: 0,
        extraCredits: 0,
        lastResetAt: new Date(),
      },
      include: {
        transactions: true,
      },
    });
  }

  return {
    ...userCredits,
    availableCredits: userCredits.totalCredits - userCredits.usedCredits,
  };
}

export async function updateUserCredits(input: {
  userId: string;
  creditsToAdd: number;
  reason?: string;
}) {
  await getAuth({ required: true });

  // Only superadmins can update user credits
  const currentUserIsSuperAdmin = await checkSuperAdminStatus();

  if (!currentUserIsSuperAdmin) {
    throw new Error("Unauthorized: Only superadmins can update user credits");
  }

  // Don't allow modifying superadmin credits
  const targetUser = await db.user.findUnique({
    where: { id: input.userId },
    select: { isSuperAdmin: true },
  });

  if (targetUser?.isSuperAdmin) {
    throw new Error("Cannot modify superadmin credits");
  }

  let userCredits = await db.userCredits.findUnique({
    where: { userId: input.userId },
  });

  if (!userCredits) {
    userCredits = await db.userCredits.create({
      data: {
        userId: input.userId,
        totalCredits: 0,
        usedCredits: 0,
        subscriptionPlan: "none",
        monthlyAllocation: 0,
        extraCredits: 0,
        lastResetAt: new Date(),
      },
    });
  }

  // Update credits
  const updatedCredits = await db.userCredits.update({
    where: { userId: input.userId },
    data: {
      totalCredits: Math.max(0, userCredits.totalCredits + input.creditsToAdd),
      extraCredits: Math.max(0, userCredits.extraCredits + input.creditsToAdd),
    },
  });

  // Create transaction record
  await db.creditTransaction.create({
    data: {
      userId: input.userId,
      userCreditsId: userCredits.id,
      amount: input.creditsToAdd,
      operation: input.creditsToAdd > 0 ? "admin_grant" : "admin_deduct",
      type: input.creditsToAdd > 0 ? "allocation" : "usage",
      description: input.reason || "Admin adjustment",
    },
  });

  return {
    message: `Successfully ${input.creditsToAdd > 0 ? "added" : "deducted"} ${Math.abs(input.creditsToAdd)} credits`,
    newBalance: updatedCredits.totalCredits - updatedCredits.usedCredits,
  };
}

export async function listAllUsers() {
  await getAuth({ required: true });

  // Only superadmins can list all users
  const currentUserIsSuperAdmin = await checkSuperAdminStatus();

  if (!currentUserIsSuperAdmin) {
    throw new Error("Unauthorized: Only superadmins can list all users");
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      handle: true,
      isSuperAdmin: true,
      image: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return users;
}

export async function submitWaitlistEntry(input: {
  email: string;
  usageDetails: string;
}) {
  try {
    const waitlistEntry = await db.waitlist.create({
      data: {
        email: input.email,
        usageDetails: input.usageDetails,
      },
    });

    return { success: true, id: waitlistEntry.id };
  } catch (error: any) {
    // Handle duplicate email error
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      throw new Error("This email is already on the waitlist.");
    }

    console.error("Error submitting waitlist entry:", error);
    throw new Error("Failed to submit waitlist entry. Please try again.");
  }
}
