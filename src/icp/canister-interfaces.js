// ICP Canister Interfaces for SocialWave
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Content Storage Canister Interface
export const contentStorageIdl = ({ IDL }) => {
  const ContentItem = IDL.Record({
    id: IDL.Text,
    content: IDL.Text,
    contentType: IDL.Text,
    hash: IDL.Text,
    author: IDL.Principal,
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    isPublic: IDL.Bool,
    viralScore: IDL.Opt(IDL.Float64),
  });

  const ContentMetadata = IDL.Record({
    views: IDL.Nat,
    likes: IDL.Nat,
    shares: IDL.Nat,
    comments: IDL.Nat,
    engagementRate: IDL.Float64,
    lastInteraction: IDL.Int,
  });

  const StoreContentRequest = IDL.Record({
    content: IDL.Text,
    contentType: IDL.Text,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    isPublic: IDL.Bool,
  });

  const ContentSearchQuery = IDL.Record({
    contentType: IDL.Opt(IDL.Text),
    author: IDL.Opt(IDL.Principal),
    isPublic: IDL.Opt(IDL.Bool),
    fromDate: IDL.Opt(IDL.Int),
    toDate: IDL.Opt(IDL.Int),
  });

  const Result = (ok, err) => IDL.Variant({ ok, err });

  return IDL.Service({
    storeContent: IDL.Func([IDL.Principal, StoreContentRequest], [Result(IDL.Text, IDL.Text)], []),
    getContent: IDL.Func([IDL.Text], [Result(ContentItem, IDL.Text)], ["query"]),
    listContent: IDL.Func([ContentSearchQuery], [IDL.Vec(ContentItem)], ["query"]),
    updateViralScore: IDL.Func([IDL.Principal, IDL.Text, IDL.Float64], [Result(IDL.Null, IDL.Text)], []),
    recordInteraction: IDL.Func([IDL.Text, IDL.Text], [Result(IDL.Null, IDL.Text)], []),
    getContentMetadata: IDL.Func([IDL.Text], [Result(ContentMetadata, IDL.Text)], ["query"]),
    getTopContent: IDL.Func([IDL.Nat], [IDL.Vec(ContentItem)], ["query"]),
    deleteContent: IDL.Func([IDL.Principal, IDL.Text], [Result(IDL.Null, IDL.Text)], []),
    getStats: IDL.Func([], [IDL.Record({
      totalContent: IDL.Nat,
      publicContent: IDL.Nat,
      totalViews: IDL.Nat,
      totalEngagements: IDL.Nat,
    })], ["query"]),
    tagContentWithBrandVibe: IDL.Func([IDL.Principal, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], [Result(IDL.Null, IDL.Text)], []),
    getContentByBrandVibe: IDL.Func([IDL.Text], [IDL.Vec(ContentItem)], ["query"]),
  });
};

// SocialWave Backend Canister Interface
export const socialWaveBackendIdl = ({ IDL }) => {
  const AIModel = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    version: IDL.Text,
    modelType: IDL.Text,
    capabilities: IDL.Vec(IDL.Text),
    owner: IDL.Principal,
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
    isActive: IDL.Bool,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });

  const ViralPrediction = IDL.Record({
    contentId: IDL.Text,
    predictedScore: IDL.Float64,
    confidence: IDL.Float64,
    factors: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Float64)),
    timestamp: IDL.Int,
  });

  const TrendData = IDL.Record({
    id: IDL.Text,
    topic: IDL.Text,
    score: IDL.Float64,
    momentum: IDL.Float64,
    category: IDL.Text,
    sources: IDL.Vec(IDL.Text),
    timestamp: IDL.Int,
  });

  const BrandVibeProfile = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    persona: IDL.Text,
    tone: IDL.Text,
    guidelines: IDL.Text,
    keyPhrases: IDL.Vec(IDL.Text),
    avoidPhrases: IDL.Vec(IDL.Text),
    owner: IDL.Principal,
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });

  const StoreModelRequest = IDL.Record({
    name: IDL.Text,
    version: IDL.Text,
    modelType: IDL.Text,
    capabilities: IDL.Vec(IDL.Text),
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });

  const ModelSearchQuery = IDL.Record({
    name: IDL.Opt(IDL.Text),
    modelType: IDL.Opt(IDL.Text),
    capabilities: IDL.Opt(IDL.Vec(IDL.Text)),
    owner: IDL.Opt(IDL.Principal),
    isActive: IDL.Opt(IDL.Bool),
  });

  const Result = (ok, err) => IDL.Variant({ ok, err });

  return IDL.Service({
    // AI Model Management
    storeModel: IDL.Func([IDL.Principal, StoreModelRequest], [Result(IDL.Text, IDL.Text)], []),
    getModel: IDL.Func([IDL.Text], [Result(AIModel, IDL.Text)], ["query"]),
    listModels: IDL.Func([ModelSearchQuery], [IDL.Vec(AIModel)], ["query"]),
    recordModelUsage: IDL.Func([IDL.Text, IDL.Nat, IDL.Bool, IDL.Nat], [Result(IDL.Null, IDL.Text)], []),
    
    // Viral Analysis
    analyzeViralPotential: IDL.Func([IDL.Text, IDL.Text], [Result(IDL.Text, IDL.Text)], []),
    getViralPrediction: IDL.Func([IDL.Text], [Result(ViralPrediction, IDL.Text)], ["query"]),
    
    // Trend Detection
    detectTrends: IDL.Func([], [IDL.Vec(TrendData)], []),
    getTrendingTopics: IDL.Func([IDL.Nat], [IDL.Vec(TrendData)], ["query"]),
    
    // Brand Vibe Intelligence
    createBrandVibeProfile: IDL.Func([IDL.Principal, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Vec(IDL.Text), IDL.Vec(IDL.Text)], [Result(IDL.Text, IDL.Text)], []),
    analyzeBrandAlignment: IDL.Func([IDL.Text, IDL.Text], [Result(IDL.Float64, IDL.Text)], []),
    getBrandVibeProfile: IDL.Func([IDL.Text], [Result(BrandVibeProfile, IDL.Text)], ["query"]),
    listBrandVibeProfiles: IDL.Func([IDL.Opt(IDL.Principal)], [IDL.Vec(BrandVibeProfile)], ["query"]),
    
    // Stats
    getStats: IDL.Func([], [IDL.Record({
      totalModels: IDL.Nat,
      activeModels: IDL.Nat,
      totalUsage: IDL.Nat,
      totalPredictions: IDL.Nat,
      totalTrends: IDL.Nat,
      totalBrandProfiles: IDL.Nat,
    })], ["query"]),
    
    // Health check
    greet: IDL.Func([IDL.Text], [IDL.Text], ["query"]),
  });
};

// Analytics Canister Interface
export const analyticsIdl = ({ IDL }) => {
  const AnalyticsEvent = IDL.Record({
    id: IDL.Text,
    eventType: IDL.Text,
    userId: IDL.Opt(IDL.Principal),
    contentId: IDL.Opt(IDL.Text),
    platform: IDL.Text,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    timestamp: IDL.Int,
  });

  const UserEngagement = IDL.Record({
    userId: IDL.Principal,
    totalViews: IDL.Nat,
    totalLikes: IDL.Nat,
    totalShares: IDL.Nat,
    totalComments: IDL.Nat,
    avgEngagementRate: IDL.Float64,
    lastActivity: IDL.Int,
    topPlatforms: IDL.Vec(IDL.Text),
  });

  const ContentPerformance = IDL.Record({
    contentId: IDL.Text,
    views: IDL.Nat,
    likes: IDL.Nat,
    shares: IDL.Nat,
    comments: IDL.Nat,
    engagementRate: IDL.Float64,
    viralCoefficient: IDL.Float64,
    peakEngagement: IDL.Int,
    performanceByPlatform: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
  });

  const PlatformAnalytics = IDL.Record({
    platform: IDL.Text,
    totalEvents: IDL.Nat,
    uniqueUsers: IDL.Nat,
    avgEngagementRate: IDL.Float64,
    topContentTypes: IDL.Vec(IDL.Text),
    peakHours: IDL.Vec(IDL.Nat),
  });

  const TimeSeriesData = IDL.Record({
    timestamp: IDL.Int,
    value: IDL.Float64,
    platform: IDL.Opt(IDL.Text),
    contentType: IDL.Opt(IDL.Text),
  });

  const Result = (ok, err) => IDL.Variant({ ok, err });

  return IDL.Service({
    // Event Tracking
    trackEvent: IDL.Func([IDL.Text, IDL.Opt(IDL.Principal), IDL.Opt(IDL.Text), IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], [Result(IDL.Text, IDL.Text)], []),
    
    // Analytics Queries
    getUserEngagement: IDL.Func([IDL.Principal], [Result(UserEngagement, IDL.Text)], ["query"]),
    getContentPerformance: IDL.Func([IDL.Text], [Result(ContentPerformance, IDL.Text)], ["query"]),
    getTopPerformingContent: IDL.Func([IDL.Nat], [IDL.Vec(ContentPerformance)], ["query"]),
    getPlatformAnalytics: IDL.Func([IDL.Text], [PlatformAnalytics], ["query"]),
    getTimeSeriesData: IDL.Func([IDL.Int, IDL.Int, IDL.Opt(IDL.Text)], [IDL.Vec(TimeSeriesData)], ["query"]),
    
    // Dashboard Stats
    getDashboardStats: IDL.Func([], [IDL.Record({
      totalEvents: IDL.Nat,
      totalUsers: IDL.Nat,
      totalContent: IDL.Nat,
      avgEngagementRate: IDL.Float64,
      topPlatforms: IDL.Vec(IDL.Text),
      recentEvents: IDL.Nat,
    })], ["query"]),
    
    // Real-time Analytics
    getEngagementTrends: IDL.Func([IDL.Nat], [IDL.Vec(TimeSeriesData)], []),
    getViralContent: IDL.Func([IDL.Float64], [IDL.Vec(ContentPerformance)], ["query"]),
    
    // Batch Processing
    processAnalyticsBatch: IDL.Func([IDL.Vec(AnalyticsEvent)], [Result(IDL.Nat, IDL.Text)], []),
    
    // Health check
    getStatus: IDL.Func([], [IDL.Text], ["query"]),
  });
};

// Canister Client Class
export class ICPCanisterClient {
  constructor(canisterId, idlFactory, options = {}) {
    this.canisterId = canisterId;
    this.agent = new HttpAgent({
      host: options.host || "https://ic0.app",
    });
    
    if (options.local) {
      this.agent.fetchRootKey();
    }
    
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId,
    });
  }

  async call(method, ...args) {
    try {
      return await this.actor[method](...args);
    } catch (error) {
      console.error(`Error calling ${method}:`, error);
      throw error;
    }
  }
}

// Configuration
export const CANISTER_CONFIG = {
  local: {
    host: "http://localhost:8001",
    isLocal: true,
  },
  mainnet: {
    host: "https://ic0.app",
    isLocal: false,
  },
};

// Default canister IDs (will be populated after deployment)
export const DEFAULT_CANISTER_IDS = {
  contentStorage: process.env.REACT_APP_CONTENT_STORAGE_CANISTER_ID || "local-content-storage-id",
  socialwaveBackend: process.env.REACT_APP_SOCIALWAVE_BACKEND_CANISTER_ID || "local-backend-id",
  analytics: process.env.REACT_APP_ANALYTICS_CANISTER_ID || "local-analytics-id",
};