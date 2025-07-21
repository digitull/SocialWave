// Triggering a redeploy to fix a database connection issue.
// Triggering a redeploy to fix a database connection issue.
import React, { useState, useEffect, useRef } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { z } from "zod";
import copy from "copy-to-clipboard";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
} from "react-share";

import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  ArcElement,
);

const TrendingTopicsSchemaForProp = z.array(
  z.object({
    id: z.string(),
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
);
type TrendingTopicsDataForProp = z.infer<typeof TrendingTopicsSchemaForProp>;

function TrendingTopicsTab({
  topics,
  onFeedback,
  onGenerate,
  isGenerating,
  generatingParams,
  highlightedTopicId,
  onRefresh,
  isRefreshing,
  cacheInfo,
}: {
  topics: TrendingTopicsDataForProp;
  onFeedback: (
    topic: any,
    feedbackType: "love" | "like" | "neutral" | "dislike",
  ) => void;
  onGenerate: (topic: any, format: string) => void;
  isGenerating: boolean;
  generatingParams: { topicId: string; format: string } | null;
  highlightedTopicId?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  cacheInfo?: {
    lastUpdated?: string;
    isFromCache?: boolean;
  };
}) {
  const highlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedTopicId]);

  if (!topics || topics.length === 0) {
    return (
      <Card className="overflow-hidden mb-8">
        <CardHeader className="border-b bg-secondary/20">
          <div className="flex justify-between items-center">
            <CardTitle>Trending Topics</CardTitle>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            )}
          </div>
          {cacheInfo && (
            <p className="text-sm text-muted-foreground mt-2">
              {cacheInfo.isFromCache ? "Cached data" : "Live data"}
              {cacheInfo.lastUpdated && (
                <>
                  {" "}
                  • Last updated:{" "}
                  {new Date(cacheInfo.lastUpdated).toLocaleString()}
                </>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title="No Trending Topics Found"
            description="Could not generate trending topics at this time. Please check back later or try adjusting your filters."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Trending Topics</h2>
        <div className="flex items-center gap-4">
          {cacheInfo && (
            <p className="text-sm text-muted-foreground">
              {cacheInfo.isFromCache ? "Cached data" : "Live data"}
              {cacheInfo.lastUpdated && (
                <>
                  {" "}
                  • Last updated:{" "}
                  {new Date(cacheInfo.lastUpdated).toLocaleString()}
                </>
              )}
            </p>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          )}
        </div>
      </div>
      {topics.map((topic, index) => (
        <Card
          ref={topic.id === highlightedTopicId ? highlightedRef : null}
          key={index}
          className={`overflow-hidden ${
            topic.id === highlightedTopicId ? "ring-2 ring-primary" : ""
          }`}
        >
          <CardHeader className="border-b bg-secondary/20 p-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl gradient-text">
                  {topic.topic}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={
                      topic.sentiment.toLowerCase() === "positive"
                        ? "default"
                        : topic.sentiment.toLowerCase() === "negative"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {topic.sentiment}
                  </Badge>
                  <Badge variant="outline">
                    Relevance: {topic.relevanceScore}/10
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h4 className="font-semibold text-base mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Executive Summary
              </h4>
              <p className="text-sm text-muted-foreground ml-6 break-words">
                {topic.executiveSummary}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-base mb-2">
                  Strategic Angle
                </h4>
                <p className="text-sm text-muted-foreground break-words">
                  {topic.strategicAngle}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-base mb-2">Example Hook</h4>
                <p className="text-sm text-muted-foreground italic break-words">
                  "{topic.exampleHook}"
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-base mb-2">Sample Post</h4>
              <div className="p-4 bg-muted/30 rounded-lg border border-muted/50">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {topic.samplePost}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-base mb-2">
                  Historical Context
                </h4>
                <p className="text-sm text-muted-foreground break-words">
                  {topic.historicalData}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-base mb-2">
                  Suggested Content Formats (Click to generate)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {topic.contentFormatSuggestions.map((format, i) => (
                    <Button
                      key={i}
                      variant="secondary"
                      size="sm"
                      className="h-auto"
                      onClick={() => onGenerate(topic, format)}
                      disabled={isGenerating}
                    >
                      {isGenerating &&
                      generatingParams?.topicId === topic.id &&
                      generatingParams?.format === format ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {format}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            {topic.sources && topic.sources.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">Sources</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {topic.sources.map((source, i) => (
                      <li key={i}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-4 flex justify-end">
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-red-500"
                      onClick={() => onFeedback(topic, "love")}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Love this!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-green-500"
                      onClick={() => onFeedback(topic, "like")}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>I like this</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-yellow-500"
                      onClick={() => onFeedback(topic, "neutral")}
                    >
                      <Meh className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>It's okay</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-gray-500"
                      onClick={() => onFeedback(topic, "dislike")}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Not for me</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

const ViralPotentialSchemaForProp = z.array(
  z.object({
    id: z.string(),
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
);
type ViralPotentialDataForProp = z.infer<typeof ViralPotentialSchemaForProp>;

function ViralPotentialTab({
  potentialPosts,
  onFeedback,
  onGenerate,
  isGenerating,
  generatingPostId,
  highlightedPostId,
}: {
  potentialPosts: ViralPotentialDataForProp;
  onFeedback: (
    post: any,
    feedbackType: "love" | "like" | "neutral" | "dislike",
  ) => void;
  onGenerate: (post: any) => void;
  isGenerating: boolean;
  generatingPostId: string | null;
  highlightedPostId?: string | null;
}) {
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<
    "viral-content" | "trend-analysis" | "brand-insights"
  >("viral-content");
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
  const [isAnalyzingBrand, setIsAnalyzingBrand] = useState(false);
  // Remove unused trendAnalysis state
  const [brandInsights, setBrandInsights] = useState<any>(null);
  const [isLoadingBrandInsights, setIsLoadingBrandInsights] = useState(false);
  const [brandInsightsError, setBrandInsightsError] = useState<string | null>(
    null,
  );
  const [realTimeTrends, setRealTimeTrends] = useState<any[]>([]);
  const [tiktokInstagramTrends, setTiktokInstagramTrends] = useState<any[]>([]);
  const [selectedTrends, setSelectedTrends] = useState<Set<string>>(new Set());
  const [savedInsights, setSavedInsights] = useState<any[]>([]);
  const [savingInsights, setSavingInsights] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    riskTolerance: "medium" as "low" | "medium" | "high",
    trendAdoptionSpeed: "mainstream" as "early" | "mainstream" | "late",
    targetPlatforms: [] as string[],
    contentGoals: [] as string[],
    avoidTopics: [] as string[],
  });

  const { toast } = useToast();

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedPostId]);

  // Real-time trends mutation with streaming updates
  const detectTrendsMutation = useRealtimeMutation(
    apiClient.detectRealTimeTrendingTopics,
    {
      onSuccess: (data) => {
        if (
          data &&
          data.result &&
          data.result.trendingTopics &&
          Array.isArray(data.result.trendingTopics)
        ) {
          // Map the API response to match UI expectations
          const mappedTrends = data.result.trendingTopics.map((trend: any) => ({
            id: trend.topic,
            name: trend.topic,
            description: trend.context,
            metrics: {
              volume: trend.estimatedReach,
              growth: `${trend.viralPotentialScore}/10`,
            },
            platforms: trend.platforms,
            viralityScore: trend.viralPotentialScore,
            contentAngles: trend.contentAngles,
            demographics: trend.demographics,
            timeSensitivity: trend.timeSensitivity,
            sources: trend.sources,
          }));
          setRealTimeTrends(mappedTrends);
          toast({
            title: "🔥 Real-time trends updated",
            description: "Latest trending topics have been analyzed.",
          });
        }
      },
      onError: (error) => {
        console.error("Error fetching real-time trends:", error);
        toast({
          title: "❌ Error fetching trends",
          description:
            error instanceof Error ? error.message : "Failed to fetch trends",
          variant: "destructive",
        });
      },
    },
  );

  const fetchRealTimeTrends = () => {
    // Clear existing trends when starting new detection
    if (!detectTrendsMutation.isLoading) {
      detectTrendsMutation.mutate({});
    }
  };

  // Fetch real-time trends on component mount
  useEffect(() => {
    fetchRealTimeTrends();
  }, []);

  // Fetch TikTok/Instagram trends
  const fetchTikTokInstagramTrends = async () => {
    setIsAnalyzingTrends(true);
    try {
      const task = await apiClient.detectTikTokInstagramTrends({});

      // Poll for task completion
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max

      const pollForResults = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error("Task timeout - please try again");
        }

        const status = await apiClient.getTaskStatus({ taskId: task.id });

        if (status.status === "COMPLETED") {
          const results = await apiClient.getTikTokInstagramTrendsResults(
            task.id,
          );
          if (results && typeof results === "object") {
            const resultsObj = results as any;
            // Map the API response to match UI expectations
            const mappedTrends = [
              ...(Array.isArray(resultsObj.tiktokTrends)
                ? resultsObj.tiktokTrends
                : []
              ).map((trend: any) => ({
                ...trend,
                platform: "TikTok",
              })),
              ...(Array.isArray(resultsObj.instagramTrends)
                ? resultsObj.instagramTrends
                : []
              ).map((trend: any) => ({
                ...trend,
                platform: "Instagram",
              })),
              ...(Array.isArray(resultsObj.crossPlatformTrends)
                ? resultsObj.crossPlatformTrends
                : []
              ).map((trend: any) => ({
                ...trend,
                platform: "Cross-platform",
              })),
            ];
            setTiktokInstagramTrends(mappedTrends);
            toast({
              title: "📈 TikTok/Instagram trends analyzed successfully",
              description: "Latest social media trends have been updated.",
            });
          }
          return;
        } else if (status.status === "FAILED") {
          throw new Error(status.error?.message || "Task failed");
        }

        // Task still running, wait and try again
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        return pollForResults();
      };

      await pollForResults();
    } catch {
      console.error("Error fetching TikTok/Instagram trends:");
      toast({
        title: "❌ Error analyzing TikTok/Instagram trends",
        description: "Failed to fetch trends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingTrends(false);
    }
  };

  // Analyze trends for brand
  const analyzeTrendsForBrand = async () => {
    setIsAnalyzingBrand(true);
    try {
      const analysis = await apiClient.analyzeRealTimeTrendsForBrand({
        brandContext: brandInsights
          ? `Industry: ${brandInsights.industry || "Not specified"}\nNiche: ${brandInsights.niche || "Not specified"}`
          : undefined,
        industry: brandInsights?.industry || undefined,
        targetAudience: brandInsights?.targetAudience
          ? JSON.stringify(brandInsights.targetAudience)
          : undefined,
        contentGoals: ["engagement", "brand_awareness"],
        avoidTopics: ["controversial", "political"],
      });
      setBrandInsights(analysis);
      toast({
        title: "🎯 Brand trend analysis completed",
        description:
          "Personalized insights have been generated for your brand.",
      });
    } catch (error) {
      console.error("Error analyzing trends for brand:", error);
      toast({
        title: "❌ Error analyzing trends for brand",
        description:
          "Failed to analyze trends for your brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingBrand(false);
    }
  };

  // Get brand insights
  const getBrandInsights = async () => {
    setIsLoadingBrandInsights(true);
    setBrandInsightsError(null);
    try {
      const insights = await apiClient.getBrandContext();
      setBrandInsights(insights);
    } catch (error) {
      console.error("Error fetching brand insights:", error);
      setBrandInsightsError(
        error instanceof Error
          ? error.message
          : "Failed to load brand insights",
      );
    } finally {
      setIsLoadingBrandInsights(false);
    }
  };

  // Load brand insights and saved insights on component mount
  useEffect(() => {
    getBrandInsights();
    loadSavedInsights();
  }, []);

  // Load saved insights
  const loadSavedInsights = async () => {
    try {
      const insights = await apiClient.listSavedInsights({
        type: "viral",
      });
      setSavedInsights(insights);
    } catch (error) {
      console.error("Error loading saved insights:", error);
    }
  };

  // Save insight
  const saveInsight = async (insight: any, title: string) => {
    const insightId = insight.id || insight.trendName || title;
    setSavingInsights((prev) => new Set(prev).add(insightId));
    try {
      await apiClient.saveTrendInsight({
        type: "viral",
        data: insight,
        title,
      });
      toast({
        title: "✅ Insight saved successfully",
        description: `"${title}" has been added to your saved insights.`,
      });
      await loadSavedInsights();
    } catch (error) {
      console.error("Error saving insight:", error);
      toast({
        title: "❌ Error saving insight",
        description: "Failed to save the insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingInsights((prev) => {
        const newSet = new Set(prev);
        newSet.delete(insightId);
        return newSet;
      });
    }
  };

  // Remove saved insight
  const removeSavedInsight = async (insightId: string) => {
    try {
      await apiClient.removeSavedInsight({ id: insightId });
      toast({
        title: "🗑️ Insight removed successfully",
        description: "The insight has been removed from your saved collection.",
      });
      await loadSavedInsights();
    } catch (error) {
      console.error("Error removing insight:", error);
      toast({
        title: "❌ Error removing insight",
        description: "Failed to remove the insight. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if insight is saved
  const isInsightSaved = (insight: any) => {
    const insightId = insight.id || insight.trendName;
    return savedInsights.some(
      (saved) =>
        saved.data.id === insightId || saved.data.trendName === insightId,
    );
  };

  // Get saved insight ID
  const getSavedInsightId = (insight: any) => {
    const insightId = insight.id || insight.trendName;
    const saved = savedInsights.find(
      (saved) =>
        saved.data.id === insightId || saved.data.trendName === insightId,
    );
    return saved?.id;
  };

  // Refresh all data
  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchRealTimeTrends(),
        getBrandInsights(),
        loadSavedInsights(),
      ]);
      toast({
        title: "🔄 Data refreshed successfully",
        description:
          "All trends and insights have been updated with the latest data.",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "❌ Error refreshing data",
        description: "Failed to refresh some data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Advanced trend matching
  const performIntelligentTrendMatching = async () => {
    if (selectedTrends.size === 0) {
      toast({
        title: "⚠️ Please select at least one trend to analyze",
        description:
          "Choose trends from the list below to get personalized insights.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingBrand(true);
    try {
      const selectedTrendData = [
        ...realTimeTrends,
        ...tiktokInstagramTrends,
      ].filter((trend) => selectedTrends.has(trend.id || trend.name));

      const brandContext = await apiClient.getBrandContext();

      const matchingResult = await apiClient.intelligentTrendBrandMatcher({
        trends: selectedTrendData,
        brandContext: brandContext,
        ...advancedFilters,
      });

      setBrandInsights(matchingResult.data);
      setActiveTab("brand-insights");
      toast({
        title: "🧠 Intelligent trend matching completed",
        description: `Analyzed ${selectedTrends.size} trends and generated personalized insights.`,
      });
    } catch (error) {
      console.error("Error performing intelligent trend matching:", error);
      toast({
        title: "❌ Error performing trend matching",
        description: "Failed to analyze the selected trends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingBrand(false);
    }
  };

  if (!potentialPosts || potentialPosts.length === 0) {
    return (
      <Card className="overflow-hidden mb-8">
        <CardHeader className="border-b bg-secondary/20">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Advanced Viral Potential
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="No Viral Content Ideas Found"
            description="Could not generate viral content ideas at this time. Please check back later or try adjusting your filters."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Tabs */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-secondary/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Advanced Viral Potential
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={isRefreshing || detectTrendsMutation.isLoading}
                className="transition-all duration-200 hover:scale-105"
              >
                {isRefreshing || detectTrendsMutation.isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTikTokInstagramTrends}
                disabled={isAnalyzingTrends || detectTrendsMutation.isLoading}
                className="transition-all duration-200 hover:scale-105"
              >
                {isAnalyzingTrends ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Analyze TikTok/IG Trends
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeTrendsForBrand}
                disabled={isAnalyzingBrand || detectTrendsMutation.isLoading}
                className="transition-all duration-200 hover:scale-105"
              >
                {isAnalyzingBrand ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Analyze for Brand
              </Button>
            </div>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as any)}
          >
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <TabsTrigger
                value="viral-content"
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Viral Content
              </TabsTrigger>
              <TabsTrigger
                value="trend-analysis"
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Trend Analysis
              </TabsTrigger>
              <TabsTrigger
                value="brand-insights"
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                Brand Insights
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Tab Content */}
      {activeTab === "viral-content" && (
        <div className="space-y-6">
          {potentialPosts.map((post, index) => (
            <Card
              ref={post.id === highlightedPostId ? highlightedRef : null}
              key={index}
              className={`overflow-hidden ${
                post.id === highlightedPostId ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="border-b bg-secondary/20 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl gradient-text">
                      {post.concept}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default">
                        Virality Score: {post.viralityScore}/10
                      </Badge>
                      <Badge variant="outline">
                        Platforms: {post.targetPlatforms.join(", ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-base mb-2 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    Justification
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    {post.justification}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">Hook</h4>
                  <p className="text-sm text-muted-foreground italic break-words">
                    "{post.hook}"
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">Body</h4>
                  <div className="p-4 bg-muted/30 rounded-lg border border-muted/50">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {post.body}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">
                    Call to Action
                  </h4>
                  <p className="text-sm text-muted-foreground break-words">
                    {post.callToAction}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">Hashtags</h4>
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">
                    Creative Direction
                  </h4>
                  <p className="text-sm text-muted-foreground italic break-words">
                    "{post.creativeDirection}"
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-base mb-2">
                    Optimization Tips
                  </h4>
                  <p className="text-sm text-muted-foreground break-words">
                    {post.optimizationTips}
                  </p>
                </div>
                {post.sources && post.sources.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-base mb-2">Sources</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {post.sources.map((source, i) => (
                          <li key={i}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="p-4 flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerate(post)}
                  disabled={isGenerating && generatingPostId === post.id}
                >
                  {isGenerating && generatingPostId === post.id ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Content
                </Button>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-red-500"
                          onClick={() => onFeedback(post, "love")}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Love this!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-green-500"
                          onClick={() => onFeedback(post, "like")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>I like this</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-yellow-500"
                          onClick={() => onFeedback(post, "neutral")}
                        >
                          <Meh className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>It's okay</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-gray-500"
                          onClick={() => onFeedback(post, "dislike")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Not for me</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Analysis Tab */}
      {activeTab === "trend-analysis" && (
        <div className="space-y-6">
          {/* Advanced Filters */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Trend Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Risk Tolerance</Label>
                  <Select
                    value={advancedFilters.riskTolerance}
                    onValueChange={(value) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        riskTolerance: value as any,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🛡️ Low Risk</SelectItem>
                      <SelectItem value="medium">⚖️ Medium Risk</SelectItem>
                      <SelectItem value="high">🚀 High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Trend Adoption Speed
                  </Label>
                  <Select
                    value={advancedFilters.trendAdoptionSpeed}
                    onValueChange={(value) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        trendAdoptionSpeed: value as any,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="early">⚡ Early Adopter</SelectItem>
                      <SelectItem value="mainstream">🎯 Mainstream</SelectItem>
                      <SelectItem value="late">🐢 Late Adopter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium mb-1">
                    Selected Trends
                  </Label>
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-background rounded-md border">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {selectedTrends.size}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      trends selected
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <Button
                    onClick={performIntelligentTrendMatching}
                    disabled={
                      isAnalyzingBrand ||
                      selectedTrends.size === 0 ||
                      detectTrendsMutation.isLoading
                    }
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isAnalyzingBrand ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    Intelligent Matching
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Real-time Trending Topics
                </div>
                <div className="flex items-center gap-2">
                  {detectTrendsMutation.isLoading ? (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      🔄 Analyzing
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      🔴 Live
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {realTimeTrends.length} trends
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress tracking for real-time trends */}
              {detectTrendsMutation.isLoading &&
                (detectTrendsMutation.data as any)?.toolHistory && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analysis in Progress
                    </h4>
                    <div className="space-y-2">
                      {(
                        (detectTrendsMutation.data as any)?.toolHistory || []
                      ).map((tool: any, index: number) => (
                        <div key={index} className="flex items-center gap-3">
                          {tool.status === "in_progress" ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {tool.name}
                              </span>
                              <Badge
                                variant={
                                  tool.status === "in_progress"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {tool.status === "in_progress"
                                  ? "Running"
                                  : "Completed"}
                              </Badge>
                            </div>
                            {tool.status === "in_progress" &&
                              tool.inProgressMessage && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tool.inProgressMessage}
                                </p>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {/* Show loading state when trends are being fetched */}
              {detectTrendsMutation.isLoading && !realTimeTrends.length && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Detecting real-time trending topics...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This may take a few moments
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realTimeTrends.map((trend, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer ${
                      selectedTrends.has(trend.id || trend.name)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedTrends);
                      if (selectedTrends.has(trend.id || trend.name)) {
                        newSelected.delete(trend.id || trend.name);
                      } else {
                        newSelected.add(trend.id || trend.name);
                      }
                      setSelectedTrends(newSelected);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <h4 className="font-semibold text-sm">{trend.name}</h4>
                      </div>
                      <Checkbox
                        checked={selectedTrends.has(trend.id || trend.name)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedTrends);
                          if (checked) {
                            newSelected.add(trend.id || trend.name);
                          } else {
                            newSelected.delete(trend.id || trend.name);
                          }
                          setSelectedTrends(newSelected);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {trend.description}
                    </p>
                    {trend.metrics && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-xs">
                          📊 {trend.metrics.volume}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          📈 {trend.metrics.growth}
                        </Badge>
                      </div>
                    )}
                    {trend.viralityScore && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(trend.viralityScore / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {trend.viralityScore}/10
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TikTok/Instagram Trends */}
          {tiktokInstagramTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    TikTok & Instagram Trends
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      🎵 Social
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {tiktokInstagramTrends.length} trends
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tiktokInstagramTrends.map((trend, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer ${
                        selectedTrends.has(trend.id || trend.name)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedTrends);
                        if (selectedTrends.has(trend.id || trend.name)) {
                          newSelected.delete(trend.id || trend.name);
                        } else {
                          newSelected.add(trend.id || trend.name);
                        }
                        setSelectedTrends(newSelected);
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" />
                          <h4 className="font-semibold text-sm">
                            {trend.name}
                          </h4>
                        </div>
                        <Checkbox
                          checked={selectedTrends.has(trend.id || trend.name)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedTrends);
                            if (checked) {
                              newSelected.add(trend.id || trend.name);
                            } else {
                              newSelected.delete(trend.id || trend.name);
                            }
                            setSelectedTrends(newSelected);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {trend.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {trend.platform === "TikTok" ? "🎵" : "📸"}{" "}
                          {trend.platform}
                        </Badge>
                        {trend.viralityScore && (
                          <Badge variant="outline" className="text-xs">
                            🔥 {trend.viralityScore}/10
                          </Badge>
                        )}
                      </div>
                      {trend.viralityScore && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(trend.viralityScore / 10) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {trend.viralityScore}/10
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Brand Insights Tab */}
      {activeTab === "brand-insights" && (
        <div className="space-y-6">
          {/* Saved Insights Section */}
          {savedInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookmarkCheck className="h-5 w-5" />
                  Saved Viral Potential Insights
                  <Badge variant="secondary" className="ml-2">
                    {savedInsights.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">
                          {insight.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSavedInsight(insight.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {insight.data.brandAlignmentScore && (
                          <Badge variant="outline" className="text-xs">
                            Alignment: {insight.data.brandAlignmentScore}/10
                          </Badge>
                        )}
                        {insight.data.priority && (
                          <Badge
                            variant={
                              insight.data.priority === "high"
                                ? "destructive"
                                : insight.data.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs ml-2"
                          >
                            {insight.data.priority} Priority
                          </Badge>
                        )}
                      </div>
                      {insight.data.opportunityAssessment?.marketGap && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {insight.data.opportunityAssessment.marketGap}
                        </p>
                      )}
                      {insight.data.executionStrategy?.creativeAngles && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {insight.data.executionStrategy.creativeAngles
                            .slice(0, 3)
                            .map((angle: string, i: number) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                              >
                                {angle}
                              </Badge>
                            ))}
                          {insight.data.executionStrategy.creativeAngles
                            .length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +
                              {insight.data.executionStrategy.creativeAngles
                                .length - 3}{" "}
                              more
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          Saved:{" "}
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                        {insight.data.riskAnalysis?.brandSafetyScore && (
                          <Badge variant="outline" className="text-xs">
                            Safety: {insight.data.riskAnalysis.brandSafetyScore}
                            /10
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {isLoadingBrandInsights ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span>Loading brand insights...</span>
                </div>
              </CardContent>
            </Card>
          ) : brandInsightsError ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-2 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                    <span>Error loading brand insights</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brandInsightsError}
                  </p>
                  <Button onClick={getBrandInsights} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : brandInsights ? (
            <>
              {/* Matched Trends */}
              {brandInsights.matchedTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Intelligent Trend Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {brandInsights.matchedTrends.map(
                        (match: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">
                                {match.trendName}
                              </h4>
                              <div className="flex gap-2">
                                <Badge variant="default">
                                  Alignment: {match.brandAlignmentScore}/10
                                </Badge>
                                <Badge
                                  variant={
                                    match.priority === "high"
                                      ? "destructive"
                                      : match.priority === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {match.priority} Priority
                                </Badge>
                                {isInsightSaved(match) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      removeSavedInsight(
                                        getSavedInsightId(match)!,
                                      )
                                    }
                                    className="h-8 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                                  >
                                    <BookmarkCheck className="h-4 w-4 mr-1" />
                                    Saved
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      saveInsight(match, match.trendName)
                                    }
                                    disabled={savingInsights.has(
                                      match.id || match.trendName,
                                    )}
                                    className="h-8 hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50 dark:hover:border-blue-800 dark:hover:text-blue-400 dark:hover:bg-blue-950 transition-all duration-200"
                                  >
                                    {savingInsights.has(
                                      match.id || match.trendName,
                                    ) ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Bookmark className="h-4 w-4 mr-1" />
                                        Save
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <h5 className="font-medium mb-2">
                                  Opportunity Assessment
                                </h5>
                                <p className="text-sm text-muted-foreground">
                                  {match.opportunityAssessment?.marketGap}
                                </p>
                              </div>
                              <div>
                                <h5 className="font-medium mb-2">
                                  Execution Strategy
                                </h5>
                                <p className="text-sm text-muted-foreground">
                                  {match.executionStrategy?.timingFrequency}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <h5 className="font-medium mb-2">
                                Creative Angles
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {match.executionStrategy?.creativeAngles?.map(
                                  (angle: string, i: number) => (
                                    <Badge key={i} variant="outline">
                                      {angle}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>

                            <div className="mt-4">
                              <h5 className="font-medium mb-2">
                                Risk Analysis
                              </h5>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  Safety Score:{" "}
                                  {match.riskAnalysis?.brandSafetyScore}/10
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {match.timeToMarket}
                                </span>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Strategy */}
              {brandInsights.overallStrategy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Strategic Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium mb-2">
                          Resource Allocation
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {brandInsights.overallStrategy.resourceAllocation}
                        </p>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">
                          Timeline Recommendations
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {
                            brandInsights.overallStrategy
                              .timelineRecommendations
                          }
                        </p>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">
                          Long-term Brand Strategy
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {brandInsights.overallStrategy.longTermBrandStrategy}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Plan */}
              {brandInsights.actionPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Action Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Immediate Actions</h5>
                        <ul className="space-y-1">
                          {brandInsights.actionPlan.immediate?.map(
                            (action: string, i: number) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <CheckCircle className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                                {action}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Short-term Actions</h5>
                        <ul className="space-y-1">
                          {brandInsights.actionPlan.shortTerm?.map(
                            (action: string, i: number) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <Clock className="h-3 w-3 mt-1 text-yellow-500 flex-shrink-0" />
                                {action}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Long-term Actions</h5>
                        <ul className="space-y-1">
                          {brandInsights.actionPlan.longTerm?.map(
                            (action: string, i: number) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <Calendar className="h-3 w-3 mt-1 text-blue-500 flex-shrink-0" />
                                {action}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={<Brain className="h-12 w-12" />}
                  title="No Brand Insights Available"
                  description="Click 'Analyze for Brand' or perform 'Intelligent Matching' to generate brand-specific insights."
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Unified EmptyState component
function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-sm">{description}</p>
      )}
      {children && (
        <div className="mt-4 flex flex-col gap-2 items-center w-full">
          {children}
        </div>
      )}
    </div>
  );
}

// Spinner
function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <RefreshCw className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  NavLink,
  useParams,
} from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, inferRPCOutputType, inferRPCInputType } from "~/client/api";
import {
  useAuth,
  useToast,
  encodeFileAsBase64DataURL,
  useRealtimeMutation,
} from "~/client/utils";

// Query key factories for better invalidation control
const queryKeys = {
  accounts: () => ["accounts"] as const,
  connectedAccounts: () => ["connectedAccounts"] as const,
  userSettings: () => ["userSettings"] as const,
  brandSignals: () => ["brandSignals"] as const,
  pages: () => ["pages"] as const,
  contentPillars: () => ["contentPillars"] as const,
  generatedContent: (pillarId?: string) =>
    pillarId
      ? (["generatedContent", pillarId] as const)
      : (["generatedContent"] as const),
  uploadedDocuments: () => ["uploadedDocuments"] as const,
  brandGuidelines: () => ["brandGuidelines"] as const,
  viralThreadTags: () => ["viralThreadTags"] as const,
  contentTags: () => ["contentTags"] as const,
  comments: (pageId?: string) =>
    pageId ? (["comments", pageId] as const) : (["comments"] as const),
  dashboardStats: () => ["dashboardStats"] as const,
  viralThreads: () => ["viralThreads"] as const,
  viralThread: (id: string) => ["viralThread", id] as const,
  scheduledPosts: () => ["scheduledPosts"] as const,
  advancedInsights: (pageId?: string) =>
    pageId
      ? (["advancedInsights", pageId] as const)
      : (["advancedInsights"] as const),
  analyticsSummary: (platform?: string, pageId?: string) => {
    const keys = ["analyticsSummary", platform, pageId].filter(Boolean);
    return keys as readonly string[];
  },
  postingActivityHeatmap: (platform?: string, pageId?: string) => {
    const keys = ["postingActivityHeatmap", platform, pageId].filter(Boolean);
    return keys as readonly string[];
  },
  pageAnalytics: (platform?: string, pageId?: string) => {
    const keys = ["pageAnalytics", platform, pageId].filter(Boolean);
    return keys as readonly string[];
  },
};

// Custom hooks for query reuse optimization
function useConnectedAccounts() {
  return useQuery(
    queryKeys.connectedAccounts(),
    () => apiClient.getConnectedAccounts(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  );
}

function useUserSettings() {
  return useQuery(queryKeys.userSettings(), () => apiClient.getUserSettings(), {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

function useBrandSignals() {
  return useQuery(queryKeys.brandSignals(), () => apiClient.getBrandSignals(), {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 20 * 60 * 1000, // 20 minutes
  });
}

function usePages() {
  return useQuery(queryKeys.pages(), () => apiClient.getPages(), {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

function useContentPillars() {
  return useQuery(
    queryKeys.contentPillars(),
    () => apiClient.listContentPillars(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 20 * 60 * 1000, // 20 minutes
    },
  );
}

function useGeneratedContent(pillarId?: string) {
  return useQuery(
    queryKeys.generatedContent(pillarId),
    () => apiClient.listGeneratedContent({ pillarId: pillarId || "" }),
    {
      enabled: !!pillarId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
    },
  );
}

function useUploadedDocuments() {
  return useQuery(
    queryKeys.uploadedDocuments(),
    () => apiClient.listUploadedDocuments(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
    },
  );
}

// Error boundary component for handling React errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Something went wrong
                </CardTitle>
                <CardDescription>
                  An error occurred while loading this page. Please try
                  refreshing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  CardFooter,
  Skeleton,
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Progress,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  MessageSquare,
  Settings,
  BarChart3,
  RefreshCw,
  Send,
  X,
  Check,
  Sparkles,
  Copy,
  PieChart,
  PenSquare,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Meh,
  Download,
  Tag,
  Camera,
  Clock,
  ArrowRight,
  LayoutDashboard,
  Search,
  MessageCircle,
  Percent,
  TrendingDown,
  Flame,
  HelpCircle,
  Edit,
  Brain,
  Filter,
  Target,
  CheckCircle,
  Calendar,
  Video,
  Lightbulb,
  AlertCircle,
  Hash,
  Bookmark,
  BookmarkCheck,
  Code,
  Navigation,
  Zap,
  BarChart,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Keyboard,
  Coins,
  Crown,
  Star,
  AlertTriangle,
  Bug,
  History,
  Minus,
  Plus,
  FileText,
  ImageIcon,
  Link2,
  LinkIcon,
  User,
  Rocket,
  CreditCard,
  SkipForward,
  Trophy,
  Command,
  Loader2,
  ExternalLink,
  Shield,
} from "lucide-react";
// Removed duplicate React import
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// Onboarding Guide Types
type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    navigate?: string;
    variant?: "default" | "outline" | "secondary";
    icon?: React.ComponentType<any>;
  };
  optional?: boolean;
  completed?: boolean;
};

type OnboardingGuideProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentUser: any;
};

type SmartRecommendation = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  priority: "high" | "medium" | "low";
  action: () => void;
};

type DiscoverFilters = {
  timeframe: "today" | "week" | "month";
  priority: "all" | "high" | "medium" | "low";
  type: "all" | "trends" | "content" | "insights";
};

type DiscoverOverviewProps = {
  smartRecommendations: SmartRecommendation[];
  onNavigate: (view: string) => void;
  searchQuery: string;
  filters: DiscoverFilters;
};

// Comprehensive Onboarding Guide Component
function OnboardingGuide({
  isOpen,
  onClose,
  onComplete,
}: OnboardingGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set<string>());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [visitedSteps, setVisitedSteps] = useState(new Set<number>([0]));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024,
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  // Enhanced responsive design hook with performance optimization
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setIsMobile(width < 768);
        setIsTablet(width >= 768 && width < 1024);
      }, 100); // Debounce resize events
    };

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    window.addEventListener("resize", handleResize);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      mediaQuery.removeEventListener("change", handleMotionChange);
      clearTimeout(timeoutId);
    };
  }, []);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enhanced keyboard navigation with hints
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hide keyboard hints after first interaction
      if (showKeyboardHints) {
        setShowKeyboardHints(false);
      }

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ": // Spacebar for next
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          handlePrevious();
          break;
        case "Escape":
          e.preventDefault();
          if (currentStepIndex === steps.length - 1) {
            markTourCompletedMutation.mutate();
          } else {
            onClose();
          }
          break;
        case "Enter":
          e.preventDefault();
          if (currentStep?.action) {
            handleActionClick(currentStep.action);
          } else {
            handleNext();
          }
          break;
        case "KeyS":
        case "s": // Skip optional step
          if (currentStep?.optional && !isTransitioning) {
            e.preventDefault();
            handleNext();
            toast({
              title: "Step skipped",
              description: `${currentStep.title} can be completed later in Settings.`,
            });
          }
          break;
        case "KeyH":
        case "h": // Toggle keyboard hints
          e.preventDefault();
          setShowKeyboardHints(!showKeyboardHints);
          break;
        default:
          // Handle number keys for direct navigation
          const num = parseInt(e.key);
          if (num >= 1 && num <= steps.length) {
            e.preventDefault();
            handleStepClick(num - 1);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, isTransitioning, showKeyboardHints]);

  // Auto-advance welcome step
  React.useEffect(() => {
    if (currentStepIndex === 0 && !hasSeenWelcome) {
      const timer = setTimeout(() => {
        setHasSeenWelcome(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, hasSeenWelcome]);

  const { data: connectedAccounts } = useQuery(
    ["connectedAccounts"],
    apiClient.getConnectedAccounts,
    { enabled: isOpen },
  );

  const { data: brandGuidelines } = useQuery(
    ["brandGuidelines"],
    apiClient.getBrandGuidelines,
    { enabled: isOpen },
  );

  const queryClient = useQueryClient();

  const markTourCompletedMutation = useMutation(apiClient.markTourAsCompleted, {
    onSuccess: () => {
      toast({
        title: "🎉 Welcome to SocialWave!",
        description:
          "You're all set to revolutionize your social media management with AI.",
      });
      // Invalidate and refetch current user data
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: "Failed to complete the tour. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to mark tour as completed:", error);
    },
  });

  const hasConnectedAccounts =
    connectedAccounts && connectedAccounts.length > 0;
  const hasBrandGuidelines = brandGuidelines && brandGuidelines.brandVoice;

  // Mark steps as completed based on user progress
  React.useEffect(() => {
    const newCompletedSteps = new Set<string>();
    if (hasConnectedAccounts) newCompletedSteps.add("connect-accounts");
    if (hasBrandGuidelines) newCompletedSteps.add("brand-setup");
    setCompletedSteps(newCompletedSteps);
  }, [hasConnectedAccounts, hasBrandGuidelines]);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to SocialWave!",
      description: "Your AI-powered social media command center",
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <motion.div
              className={`mx-auto bg-gradient-to-r from-primary to-primary/60 rounded-full flex items-center justify-center mb-4 ${
                isMobile ? "w-16 h-16" : "w-20 h-20"
              }`}
              initial={reducedMotion ? {} : { scale: 0, rotate: -180 }}
              animate={reducedMotion ? {} : { scale: 1, rotate: 0 }}
              transition={
                reducedMotion ? {} : { delay: 0.3, type: "spring", damping: 20 }
              }
            >
              <Sparkles
                className={`text-white ${isMobile ? "h-8 w-8" : "h-10 w-10"}`}
              />
            </motion.div>
            <motion.h3
              className={`font-bold mb-2 ${isMobile ? "text-xl" : "text-2xl"}`}
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={reducedMotion ? {} : { delay: 0.4 }}
            >
              Welcome to SocialWave!
            </motion.h3>
            <motion.p
              className={`text-muted-foreground mb-6 ${isMobile ? "text-sm" : "text-base"}`}
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={reducedMotion ? {} : { delay: 0.5 }}
            >
              Let's get you set up with the most powerful AI social media
              management platform. This quick guide will help you connect your
              accounts and understand your new command center.
            </motion.p>
          </div>
          <motion.div
            className={`grid text-sm ${
              isMobile
                ? "grid-cols-1 gap-3"
                : isTablet
                  ? "grid-cols-2 gap-3"
                  : "grid-cols-3 gap-4"
            }`}
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={
              reducedMotion ? {} : { delay: 0.6, staggerChildren: 0.1 }
            }
          >
            <motion.div
              className="text-center p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors duration-200"
              initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
            >
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="font-semibold">Smart Responses</div>
              <div className="text-muted-foreground">
                AI-powered comment management
              </div>
            </motion.div>
            <motion.div
              className="text-center p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors duration-200"
              initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
            >
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="font-semibold">Trend Analysis</div>
              <div className="text-muted-foreground">
                Discover viral opportunities
              </div>
            </motion.div>
            <motion.div
              className="text-center p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors duration-200"
              initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
            >
              <PenSquare className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="font-semibold">Content Creation</div>
              <div className="text-muted-foreground">
                Generate engaging content
              </div>
            </motion.div>
          </motion.div>
        </div>
      ),
      completed: true,
    },
    {
      id: "connect-accounts",
      title: "Connect Your Social Accounts",
      description:
        "Link your Facebook, Instagram, Twitter, and YouTube accounts",
      icon: <Settings className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              Connect Your Social Accounts
            </h3>
            <p className="text-muted-foreground">
              Connect your social media accounts to start managing comments,
              analyzing engagement, and discovering trends.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">f</span>
              </div>
              <div className="flex-1">
                <div className="font-medium">Facebook & Instagram</div>
                <div className="text-sm text-muted-foreground">
                  Manage posts and comments
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${hasConnectedAccounts ? "bg-green-500" : "bg-gray-300"}`}
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <div className="flex-1">
                <div className="font-medium">Twitter / X</div>
                <div className="text-sm text-muted-foreground">
                  Track mentions and trends
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${hasConnectedAccounts ? "bg-green-500" : "bg-gray-300"}`}
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">▶</span>
              </div>
              <div className="flex-1">
                <div className="font-medium">YouTube</div>
                <div className="text-sm text-muted-foreground">
                  Manage video comments
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${hasConnectedAccounts ? "bg-green-500" : "bg-gray-300"}`}
              />
            </div>
          </div>

          {hasConnectedAccounts ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Great job!</AlertTitle>
              <AlertDescription>
                You've connected {connectedAccounts?.length} account(s). You can
                always add more in Settings.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Ready to connect?</AlertTitle>
              <AlertDescription>
                You can connect accounts now or skip this step and do it later
                in Settings.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ),
      action: {
        label: hasConnectedAccounts ? "Accounts Connected" : "Connect Accounts",
        navigate: "/settings",
        variant: hasConnectedAccounts ? "outline" : "default",
        icon: hasConnectedAccounts ? CheckCircle : Settings,
      },
      completed: hasConnectedAccounts,
    },
    {
      id: "brand-setup",
      title: "Set Up Your Brand Voice",
      description: "Define your brand's tone and communication style",
      icon: <MessageCircle className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Define Your Brand Voice</h3>
            <p className="text-muted-foreground">
              Help our AI understand your brand's personality so it can create
              content and responses that match your style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Brand Voice
              </h4>
              <p className="text-sm text-muted-foreground">
                Professional, friendly, casual, authoritative, playful, etc.
              </p>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Tone Priorities
              </h4>
              <p className="text-sm text-muted-foreground">
                What tone should your content prioritize?
              </p>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                Phrases to Use
              </h4>
              <p className="text-sm text-muted-foreground">
                Brand-specific terminology and preferred language
              </p>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ThumbsDown className="h-4 w-4" />
                Phrases to Avoid
              </h4>
              <p className="text-sm text-muted-foreground">
                Words or phrases that don't fit your brand
              </p>
            </div>
          </div>

          {hasBrandGuidelines ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Brand voice configured!</AlertTitle>
              <AlertDescription>
                Your brand guidelines are set up. The AI will use these to match
                your communication style.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Optional but recommended</AlertTitle>
              <AlertDescription>
                Setting up your brand voice helps the AI create more
                personalized content and responses.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ),
      action: {
        label: hasBrandGuidelines ? "Brand Voice Set" : "Set Up Brand Voice",
        navigate: "/settings",
        variant: hasBrandGuidelines ? "outline" : "default",
        icon: hasBrandGuidelines ? CheckCircle : MessageCircle,
      },
      optional: true,
      completed: !!hasBrandGuidelines,
    },
    {
      id: "response-hub",
      title: "Response Hub - Your Comment Inbox",
      description: "Manage and respond to comments with AI assistance",
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Response Hub</h3>
            <p className="text-muted-foreground">
              Your central command center for managing all social media comments
              and interactions.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">1</span>
              </div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Fetch Comments
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-200">
                  Pull in comments from all your connected accounts
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">2</span>
              </div>
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">
                  AI Analysis
                </div>
                <div className="text-sm text-green-700 dark:text-green-200">
                  Get sentiment analysis and response suggestions
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">3</span>
              </div>
              <div>
                <div className="font-medium text-purple-900 dark:text-purple-100">
                  Smart Responses
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-200">
                  Use AI-generated responses that match your brand voice
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">Pro Tip</span>
            </div>
            <p className="text-sm">
              The AI learns from your editing patterns. The more you refine its
              suggestions, the better it gets at matching your style!
            </p>
          </div>
        </div>
      ),
      action: {
        label: "Explore Response Hub",
        navigate: "/engage",
        icon: MessageSquare,
      },
    },
    {
      id: "strategy-hub",
      title: "Strategy Hub - Discover Trends",
      description: "Find trending topics and viral content opportunities",
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Strategy Hub</h3>
            <p className="text-muted-foreground">
              Discover trending topics, analyze viral content potential, and get
              strategic insights for your brand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-semibold">Trending Topics</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time trending topics from TikTok and Instagram, analyzed
                for your brand fit
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Viral Potential</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI analysis of content formats and trends with high viral
                potential
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Audience Insights</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deep analysis of your audience engagement patterns and
                preferences
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Content Strategy</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Personalized content recommendations based on your brand and
                trends
              </p>
            </div>
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>AI-Powered Insights</AlertTitle>
            <AlertDescription>
              All trend analysis is personalized to your brand, ensuring
              recommendations align with your voice and audience.
            </AlertDescription>
          </Alert>
        </div>
      ),
      action: {
        label: "Explore Strategy Hub",
        navigate: "/discover",
        icon: TrendingUp,
      },
    },
    {
      id: "content-hub",
      title: "Content Hub - Create & Generate",
      description: "AI-powered content creation and media library",
      icon: <PenSquare className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <PenSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Content Hub</h3>
            <p className="text-muted-foreground">
              Your creative workspace for generating, editing, and managing all
              your social media content.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg">
              <div className="p-2 bg-blue-500 rounded-lg">
                <PenSquare className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Text Content</div>
                <div className="text-sm text-muted-foreground">
                  Generate posts, captions, and copy
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-lg">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Video className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Image Generation</div>
                <div className="text-sm text-muted-foreground">
                  Create custom visuals with AI
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg">
              <div className="p-2 bg-green-500 rounded-lg">
                <Video className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Video Scripts</div>
                <div className="text-sm text-muted-foreground">
                  Generate video content and scripts
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-lg">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Content Scheduling</div>
                <div className="text-sm text-muted-foreground">
                  Plan and schedule your posts
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span className="font-semibold">Smart Features</span>
            </div>
            <p className="text-sm">
              Content is generated based on trending topics, your brand voice,
              and audience insights for maximum engagement.
            </p>
          </div>
        </div>
      ),
      action: {
        label: "Explore Content Hub",
        navigate: "/create",
        icon: PenSquare,
      },
    },
    {
      id: "navigation",
      title: "Navigation & Keyboard Shortcuts",
      description: "Master the SocialWave interface and shortcuts",
      icon: <Navigation className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Master Your Navigation</h3>
            <p className="text-muted-foreground">
              Learn the quickest ways to navigate SocialWave and boost your
              productivity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Main Navigation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-3 w-3" />
                    Home
                  </span>
                  <span className="text-muted-foreground">
                    Dashboard overview
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    Engage
                  </span>
                  <span className="text-muted-foreground">
                    Comment management
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span className="flex items-center gap-2">
                    <PieChart className="h-3 w-3" />
                    Discover
                  </span>
                  <span className="text-muted-foreground">
                    Trends & insights
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span className="flex items-center gap-2">
                    <PenSquare className="h-3 w-3" />
                    Create
                  </span>
                  <span className="text-muted-foreground">
                    Content generation
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Keyboard Shortcuts
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span>Quick Search</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘ K</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span>Navigate Pages</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">1-6</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span>Close Dialogs</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span>Refresh Data</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘ R</kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">Pro Navigation Tips</span>
            </div>
            <ul className="text-sm space-y-1">
              <li>• Hover over the sidebar to expand it and see full labels</li>
              <li>• Use ⌘+K to quickly search and navigate anywhere</li>
              <li>
                • The search function works across all content and features
              </li>
              <li>• Most dialogs and modals can be closed with the Esc key</li>
            </ul>
          </div>
        </div>
      ),
      action: {
        label: "Try Quick Search",
        onClick: () => {
          onClose();
          // Trigger the search function
          setTimeout(() => {
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }, 300);
        },
        icon: Search,
      },
    },
    {
      id: "feature-discovery",
      title: "Advanced Features & Tips",
      description: "Discover powerful features to maximize your productivity",
      icon: <Lightbulb className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Advanced Features</h3>
            <p className="text-muted-foreground">
              Discover powerful features that will supercharge your social media
              management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold">AI Learning</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                The AI learns from your editing patterns and feedback to provide
                increasingly personalized suggestions.
              </p>
              <div className="text-xs text-muted-foreground">
                💡 Edit AI responses to teach your preferred style
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-semibold">Batch Operations</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Select multiple comments or content pieces to perform bulk
                actions like hiding or tagging.
              </p>
              <div className="text-xs text-muted-foreground">
                💡 Use Shift+Click to select ranges
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-semibold">Smart Tagging</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Organize content and viral threads with custom tags for easy
                filtering and management.
              </p>
              <div className="text-xs text-muted-foreground">
                💡 Create tags for different campaigns or topics
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-semibold">Content Scheduling</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Schedule your generated content to post at optimal times across
                different platforms.
              </p>
              <div className="text-xs text-muted-foreground">
                💡 AI suggests best posting times based on your audience
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="font-semibold">Trend Alerts</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Get notified when new trends match your brand or when your
                content shows viral potential.
              </p>
              <div className="text-xs text-muted-foreground">
                💡 Set up brand-specific trend monitoring
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <BarChart className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="font-semibold">Analytics Dashboard</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Track engagement patterns, sentiment trends, and content
                performance with detailed analytics.
              </p>
              <div className="text-xs text-muted-foreground">
                💡 Export reports for stakeholder presentations
              </div>
            </Card>
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Unlock More Features</AlertTitle>
            <AlertDescription>
              Many features become available as you use the platform more.
              Connect accounts, engage with comments, and generate content to
              unlock advanced capabilities.
            </AlertDescription>
          </Alert>
        </div>
      ),
      action: {
        label: "Explore Analytics",
        navigate: "/analytics",
        icon: BarChart,
      },
    },
    {
      id: "complete",
      title: "You're All Set!",
      description: "Ready to take your social media to the next level",
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">You're All Set! 🎉</h3>
            <p className="text-muted-foreground mb-6">
              Welcome to the future of social media management. You now have
              access to AI-powered tools that will transform how you engage with
              your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold">Next Steps</span>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Fetch your first comments</li>
                <li>• Explore trending topics</li>
                <li>• Generate your first content</li>
                <li>• Set up brand guidelines</li>
              </ul>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <HelpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-semibold">Need Help?</span>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use the search function (⌘K)</li>
                <li>• Check tooltips and hints</li>
                <li>• Explore each hub at your pace</li>
                <li>• The AI learns as you use it</li>
              </ul>
            </Card>
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Pro Tip</AlertTitle>
            <AlertDescription>
              The more you use SocialWave, the smarter it gets. Your AI
              assistant learns from your preferences and feedback to provide
              increasingly personalized recommendations.
            </AlertDescription>
          </Alert>
        </div>
      ),
      action: {
        label: "🚀 Launch SocialWave",
        onClick: () => {
          markTourCompletedMutation.mutate();
        },
        icon: Rocket,
      },
      completed: true,
    },
  ];

  const currentStep = steps[currentStepIndex];

  if (!currentStep) return null;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      const nextIndex = currentStepIndex + 1;
      setVisitedSteps((prev) => new Set([...prev, nextIndex]));
      setTimeout(() => {
        setCurrentStepIndex(nextIndex);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex - 1);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleStepClick = (index: number) => {
    if (index !== currentStepIndex && !isTransitioning) {
      setIsTransitioning(true);
      setVisitedSteps((prev) => new Set([...prev, index]));
      setTimeout(() => {
        setCurrentStepIndex(index);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleSkipOptional = () => {
    if (currentStep?.optional && !isTransitioning) {
      toast({
        title: "Step skipped",
        description: `${currentStep.title} can be completed later in Settings.`,
      });
      handleNext();
    }
  };

  const handleActionClick = (action: OnboardingStep["action"]) => {
    if (!action) return;
    if (action.navigate) {
      onClose();
      navigate(action.navigate);
    } else if (action.onClick) {
      action.onClick();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            // Allow clicking outside to close, but only if not on the final step
            if (currentStepIndex !== steps.length - 1) {
              onClose();
            }
          }
        }}
      >
        {/* Enhanced keyboard hints */}
        <AnimatePresence>
          {showKeyboardHints && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 1 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-3 border shadow-lg max-w-4xl"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Zap className="h-3 w-3" />
                  Keyboard Navigation
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKeyboardHints(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    ←→ ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    Enter
                  </kbd>
                  Action
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    Space
                  </kbd>
                  Next
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    Esc
                  </kbd>
                  Close
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    1-{steps.length}
                  </kbd>
                  Jump to
                </span>
                {currentStep.optional && (
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                      S
                    </kbd>
                    Skip
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    H
                  </kbd>
                  Hide hints
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <Sparkles className="h-3 w-3" />
                  Try it!
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={
            reducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 20 }
          }
          animate={
            reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }
          }
          exit={
            reducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 20 }
          }
          transition={
            reducedMotion
              ? { duration: 0.2 }
              : { type: "spring", damping: 25, stiffness: 300 }
          }
          className={`bg-background rounded-2xl shadow-2xl border w-full overflow-hidden ${
            isMobile
              ? "mx-2 max-w-sm max-h-[90vh] rounded-xl"
              : isTablet
                ? "mx-4 max-w-3xl max-h-[92vh]"
                : "mx-auto max-w-5xl max-h-[95vh]"
          }`}
        >
          {/* Header */}
          <div
            className={`relative border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent ${
              isMobile ? "p-4" : isTablet ? "p-6" : "p-8"
            }`}
          >
            <div
              className={`flex items-start justify-between ${
                isMobile ? "mb-4 flex-col gap-3" : "mb-6 flex-row"
              }`}
            >
              <motion.div
                className={`flex items-start flex-1 min-w-0 ${
                  isMobile ? "gap-3 w-full" : "gap-4"
                }`}
                initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
                animate={reducedMotion ? {} : { opacity: 1, x: 0 }}
                transition={reducedMotion ? {} : { delay: 0.2 }}
              >
                <motion.div
                  className={`bg-primary/10 rounded-xl border border-primary/20 flex-shrink-0 ${
                    isMobile ? "p-2" : "p-3"
                  }`}
                  whileHover={reducedMotion ? {} : { scale: 1.05, rotate: 5 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                >
                  {currentStep.icon}
                </motion.div>
                <div className="space-y-1 min-w-0">
                  <motion.h2
                    className={`font-bold tracking-tight ${
                      isMobile ? "text-lg" : isTablet ? "text-xl" : "text-2xl"
                    }`}
                    initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                    transition={reducedMotion ? {} : { delay: 0.3 }}
                  >
                    {currentStep.title}
                  </motion.h2>
                  <motion.p
                    className={`text-muted-foreground leading-relaxed ${
                      isMobile ? "text-sm" : isTablet ? "text-base" : "text-lg"
                    }`}
                    initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                    transition={reducedMotion ? {} : { delay: 0.4 }}
                  >
                    {currentStep.description}
                  </motion.p>
                  {currentStep.optional && (
                    <motion.div
                      initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                      animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                      transition={reducedMotion ? {} : { delay: 0.5 }}
                    >
                      <Badge variant="secondary" className="mt-2">
                        Optional
                      </Badge>
                    </motion.div>
                  )}
                </div>
              </motion.div>
              <motion.div
                className={`flex items-center gap-2 flex-shrink-0 ${
                  isMobile ? "self-end" : ""
                }`}
                initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                transition={reducedMotion ? {} : { delay: 0.3 }}
              >
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => {
                    if (currentStepIndex === steps.length - 1) {
                      markTourCompletedMutation.mutate();
                    } else {
                      onClose();
                    }
                  }}
                  className={`text-muted-foreground hover:text-foreground p-0 ${
                    isMobile ? "h-7 w-7" : "h-8 w-8"
                  }`}
                >
                  <X className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                </Button>
              </motion.div>
            </div>

            {/* Enhanced Progress Bar */}
            <motion.div
              className={isMobile ? "space-y-3" : "space-y-4"}
              initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={reducedMotion ? {} : { delay: 0.5 }}
            >
              <div
                className={`flex items-center text-sm ${
                  isMobile ? "flex-col gap-2" : "justify-between"
                }`}
              >
                <div className="flex items-center gap-2">
                  <motion.span
                    className="font-medium"
                    key={currentStepIndex}
                    initial={reducedMotion ? {} : { scale: 0.8 }}
                    animate={reducedMotion ? {} : { scale: 1 }}
                    transition={
                      reducedMotion ? {} : { type: "spring", stiffness: 300 }
                    }
                  >
                    Step {currentStepIndex + 1} of {steps.length}
                  </motion.span>
                  {completedSteps.has(currentStep.id) && (
                    <motion.div
                      initial={
                        reducedMotion
                          ? {}
                          : { opacity: 0, scale: 0.5, rotate: -180 }
                      }
                      animate={
                        reducedMotion ? {} : { opacity: 1, scale: 1, rotate: 0 }
                      }
                      transition={
                        reducedMotion ? {} : { type: "spring", stiffness: 200 }
                      }
                    >
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <motion.span
                  className="text-muted-foreground font-medium"
                  key={Math.round(progress)}
                  initial={reducedMotion ? {} : { opacity: 0.5 }}
                  animate={reducedMotion ? {} : { opacity: 1 }}
                >
                  {Math.round(progress)}% complete
                </motion.span>
              </div>
              <div className="relative">
                <div
                  className={`w-full bg-secondary/50 rounded-full overflow-hidden ${
                    isMobile ? "h-2" : "h-3"
                  }`}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={
                      reducedMotion
                        ? { duration: 0.3 }
                        : { duration: 0.8, ease: "easeOut" }
                    }
                  >
                    {/* Animated shimmer effect */}
                    {!reducedMotion && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "loop",
                          ease: "linear",
                        }}
                      />
                    )}
                  </motion.div>
                </div>
                {/* Glow effect */}
                {!reducedMotion && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full blur-sm" />
                )}
              </div>
            </motion.div>

            {/* Enhanced Step Indicators with Flow Lines */}
            <motion.div
              className="flex justify-center mt-4 sm:mt-6 gap-2 sm:gap-3 flex-wrap relative overflow-x-auto pb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {/* Flow connecting lines - hidden on small screens */}
              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 hidden lg:block">
                <div className="flex items-center gap-3">
                  {steps.slice(0, -1).map((_, index) => {
                    const isCompleted = index < currentStepIndex;
                    return (
                      <motion.div
                        key={index}
                        className={`w-8 h-0.5 transition-colors duration-300 ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isCompleted ? 1 : 0.3 }}
                        transition={{ delay: index * 0.1 }}
                      />
                    );
                  })}
                </div>
              </div>

              {steps.map((step, index) => {
                const isCompleted =
                  completedSteps.has(step.id) || index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isVisited = visitedSteps.has(index);
                const isOptional = step.optional;

                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={() => handleStepClick(index)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full text-xs font-semibold transition-all duration-300 border-2 z-10 flex-shrink-0 ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 border-primary"
                            : isCompleted
                              ? "bg-green-500 text-white shadow-md border-green-500"
                              : isVisited
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:scale-105 border-muted"
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto" />
                        ) : (
                          <span className="text-xs sm:text-sm">
                            {index + 1}
                          </span>
                        )}

                        {/* Optional step indicator */}
                        {isOptional && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">
                              ?
                            </span>
                          </div>
                        )}

                        {/* Current step pulse */}
                        {isCurrent && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-primary"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.5, 0.8, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}

                        {/* Visited step indicator */}
                        {isVisited && !isCurrent && !isCompleted && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          {step.title}
                          {isOptional && (
                            <Badge variant="secondary" className="text-xs">
                              Optional
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-primary font-medium">
                            Current step
                          </p>
                        )}
                        {isCompleted && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ Completed
                          </p>
                        )}
                        {isVisited && !isCurrent && !isCompleted && (
                          <p className="text-xs text-blue-600 font-medium">
                            Previously visited
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </motion.div>
          </div>

          {/* Enhanced Content */}
          <div
            className={`overflow-y-auto ${
              isMobile
                ? "p-4 max-h-[45vh]"
                : isTablet
                  ? "p-6 max-h-[50vh]"
                  : "p-8 max-h-[55vh]"
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 20, scale: 0.98 }
                }
                animate={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -20, scale: 0.98 }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.2 }
                    : {
                        duration: 0.4,
                        ease: "easeOut",
                        staggerChildren: 0.1,
                      }
                }
                className={isMobile ? "space-y-4" : "space-y-6"}
              >
                {currentStep.content}
              </motion.div>
            </AnimatePresence>

            {/* Enhanced Completion celebration */}
            {currentStepIndex === steps.length - 1 && (
              <motion.div
                className={`text-center space-y-6 ${isMobile ? "py-6" : "py-8"}`}
                initial={
                  reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
                }
                animate={
                  reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                }
                transition={
                  reducedMotion ? { delay: 0.2 } : { delay: 0.3, duration: 0.5 }
                }
              >
                <motion.div
                  className="relative inline-block"
                  animate={
                    reducedMotion
                      ? {}
                      : {
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.1, 1],
                        }
                  }
                  transition={
                    reducedMotion
                      ? {}
                      : {
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse",
                        }
                  }
                >
                  <div
                    className={`bg-green-100 dark:bg-green-900/20 rounded-full ${
                      isMobile ? "p-3" : "p-4"
                    }`}
                  >
                    <Trophy
                      className={`text-green-600 dark:text-green-400 ${
                        isMobile ? "h-8 w-8" : "h-12 w-12"
                      }`}
                    />
                  </div>
                  {/* Confetti effect */}
                  {!reducedMotion && (
                    <motion.div
                      className="absolute -inset-8 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                    >
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                          style={{
                            left: `${20 + Math.random() * 60}%`,
                            top: `${20 + Math.random() * 60}%`,
                          }}
                          animate={{
                            y: [-20, 20, -20],
                            x: [
                              Math.random() * 20 - 10,
                              Math.random() * 20 - 10,
                            ],
                            rotate: [0, 360],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
                <div className={isMobile ? "space-y-1" : "space-y-2"}>
                  <motion.h3
                    className={`font-bold text-green-700 dark:text-green-300 ${
                      isMobile ? "text-xl" : "text-2xl"
                    }`}
                    initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
                    animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                    transition={reducedMotion ? {} : { delay: 0.5 }}
                  >
                    Congratulations! 🎉
                  </motion.h3>
                  <motion.p
                    className={`text-muted-foreground ${
                      isMobile ? "text-base" : "text-lg"
                    }`}
                    initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
                    animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                    transition={reducedMotion ? {} : { delay: 0.6 }}
                  >
                    You've completed the SocialWave onboarding tour.
                  </motion.p>
                  <motion.p
                    className={`text-muted-foreground ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                    initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
                    animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                    transition={reducedMotion ? {} : { delay: 0.7 }}
                  >
                    You're now ready to create amazing social media content!
                  </motion.p>
                </div>
                <motion.div
                  initial={
                    reducedMotion ? { opacity: 0 } : { y: 20, opacity: 0 }
                  }
                  animate={
                    reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }
                  }
                  transition={reducedMotion ? { delay: 0.3 } : { delay: 0.8 }}
                >
                  <Button
                    onClick={() => markTourCompletedMutation.mutate()}
                    disabled={markTourCompletedMutation.isLoading}
                    size={isMobile ? "default" : "lg"}
                    className={`bg-green-600 hover:bg-green-700 text-white transition-all duration-200 ${
                      isMobile ? "px-6 text-sm" : "px-8"
                    }`}
                  >
                    {markTourCompletedMutation.isLoading ? (
                      <RefreshCw
                        className={`animate-spin mr-2 ${
                          isMobile ? "h-3 w-3" : "h-4 w-4"
                        }`}
                      />
                    ) : (
                      <Sparkles
                        className={`mr-2 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                      />
                    )}
                    Start Creating Content
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Enhanced Footer with Smart Navigation */}
          <motion.div
            className={`border-t bg-gradient-to-r from-secondary/10 to-transparent ${
              isMobile ? "p-4" : isTablet ? "p-6" : "p-8"
            }`}
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={reducedMotion ? {} : { delay: 0.2 }}
          >
            <div
              className={`flex items-stretch justify-between gap-4 ${
                isMobile ? "flex-col" : "flex-row items-center"
              }`}
            >
              <div
                className={`flex items-center gap-2 ${
                  isMobile
                    ? "order-2 justify-center"
                    : "sm:gap-3 order-2 sm:order-1"
                }`}
              >
                <motion.div
                  whileHover={reducedMotion ? {} : { scale: 1.02 }}
                  whileTap={reducedMotion ? {} : { scale: 0.98 }}
                  className={isMobile ? "flex-1" : "sm:flex-none"}
                >
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStepIndex === 0 || isTransitioning}
                    className={`transition-all duration-200 ${
                      isMobile ? "w-full min-w-[80px]" : "sm:min-w-[100px]"
                    }`}
                  >
                    <motion.div
                      animate={
                        reducedMotion ? {} : { x: isTransitioning ? -5 : 0 }
                      }
                      transition={reducedMotion ? {} : { duration: 0.2 }}
                    >
                      <ArrowLeft
                        className={`mr-2 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                      />
                    </motion.div>
                    <span className={isMobile ? "" : "hidden sm:inline"}>
                      Previous
                    </span>
                    <span className={isMobile ? "hidden" : "sm:hidden"}>
                      Back
                    </span>
                  </Button>
                </motion.div>

                {/* Skip button for optional steps */}
                {currentStep.optional && (
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.02 }}
                    whileTap={reducedMotion ? {} : { scale: 0.98 }}
                    className={isMobile ? "flex-1" : "sm:flex-none"}
                  >
                    <Button
                      variant="ghost"
                      onClick={handleSkipOptional}
                      disabled={isTransitioning}
                      className={`text-muted-foreground hover:text-foreground ${
                        isMobile ? "w-full" : "sm:w-auto"
                      }`}
                    >
                      <SkipForward
                        className={`mr-2 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                      />
                      <span className={isMobile ? "" : "hidden sm:inline"}>
                        Skip for now
                      </span>
                      <span className={isMobile ? "hidden" : "sm:hidden"}>
                        Skip
                      </span>
                    </Button>
                  </motion.div>
                )}
              </div>

              <div
                className={`flex items-stretch gap-2 order-1 sm:order-2 ${
                  isMobile ? "flex-col" : "flex-row items-center sm:gap-4"
                }`}
              >
                {/* Enhanced Progress indicator */}
                <div
                  className={`flex items-center gap-2 text-sm text-muted-foreground ${
                    isMobile
                      ? "justify-center order-2"
                      : "justify-center sm:justify-start"
                  }`}
                >
                  <motion.span
                    key={`${currentStepIndex + 1}-${steps.length}`}
                    initial={reducedMotion ? {} : { scale: 0.8, opacity: 0.5 }}
                    animate={reducedMotion ? {} : { scale: 1, opacity: 1 }}
                    transition={
                      reducedMotion ? {} : { type: "spring", stiffness: 300 }
                    }
                  >
                    {currentStepIndex + 1} of {steps.length}
                  </motion.span>
                  <div
                    className={`bg-secondary rounded-full overflow-hidden ${
                      isMobile ? "w-12 h-1.5" : "w-16 sm:w-20 h-2"
                    }`}
                  >
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                      }}
                      transition={
                        reducedMotion ? { duration: 0.2 } : { duration: 0.3 }
                      }
                    />
                  </div>
                </div>

                <div
                  className={`flex gap-2 order-1 ${
                    isMobile ? "w-full" : "sm:gap-4"
                  }`}
                >
                  {currentStep.action && (
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.02 }}
                      whileTap={reducedMotion ? {} : { scale: 0.98 }}
                      className={isMobile ? "flex-1" : "sm:flex-none"}
                    >
                      <Button
                        variant={currentStep.action.variant || "secondary"}
                        onClick={() => handleActionClick(currentStep.action)}
                        disabled={markTourCompletedMutation.isLoading}
                        className={`transition-all duration-200 ${
                          isMobile ? "w-full text-sm" : "sm:min-w-[140px]"
                        }`}
                      >
                        {markTourCompletedMutation.isLoading ? (
                          <RefreshCw
                            className={`animate-spin mr-2 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                          />
                        ) : currentStep.action?.icon ? (
                          React.createElement(currentStep.action.icon, {
                            className: `mr-2 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`,
                          })
                        ) : null}
                        <span className="truncate">
                          {currentStep.action.label}
                        </span>
                      </Button>
                    </motion.div>
                  )}

                  {currentStepIndex < steps.length - 1 ? (
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.02 }}
                      whileTap={reducedMotion ? {} : { scale: 0.98 }}
                      className={isMobile ? "flex-1" : "sm:flex-none"}
                    >
                      <Button
                        onClick={handleNext}
                        disabled={isTransitioning}
                        className={`bg-primary hover:bg-primary/90 transition-all duration-200 ${
                          isMobile
                            ? "w-full text-sm min-w-[80px]"
                            : "sm:min-w-[100px]"
                        }`}
                      >
                        <span className={isMobile ? "" : "hidden sm:inline"}>
                          Next
                        </span>
                        <span className={isMobile ? "hidden" : "sm:hidden"}>
                          Continue
                        </span>
                        <motion.div
                          animate={
                            reducedMotion ? {} : { x: isTransitioning ? 5 : 0 }
                          }
                          transition={reducedMotion ? {} : { duration: 0.2 }}
                        >
                          <ArrowRight
                            className={`ml-2 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                          />
                        </motion.div>
                      </Button>
                    </motion.div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Enhanced Quick navigation tips */}
            {showKeyboardHints && !isMobile && (
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, height: 0 }}
                animate={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, height: "auto" }
                }
                exit={
                  reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
                }
                className="mt-4 pt-4 border-t border-border/50"
              >
                <div
                  className={`flex items-center justify-center text-xs text-muted-foreground flex-wrap ${
                    isTablet ? "gap-3" : "gap-4 lg:gap-6"
                  }`}
                >
                  <motion.span
                    className="flex items-center gap-1"
                    whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  >
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                      Space
                    </kbd>
                    Next step
                  </motion.span>
                  {currentStep.optional && (
                    <motion.span
                      className="flex items-center gap-1"
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                    >
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                        S
                      </kbd>
                      Skip optional
                    </motion.span>
                  )}
                  <motion.span
                    className="flex items-center gap-1"
                    whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  >
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                      H
                    </kbd>
                    Hide hints
                  </motion.span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Background overlay for mobile */}
        {isMobile && (
          <motion.div
            className="fixed inset-0 bg-black/20 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
      s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
      s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
      C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
      c-5.222,0-9.655-3.417-11.27-8.169l-6.571,4.819C9.656,39.663,16.318,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
      l6.19,5.238C39.712,34.462,44,28.756,44,20C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="w-full px-6 py-4 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-lg z-20 border-b">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground shadow-md">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold gradient-text">SocialWave</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            Home
          </Link>
          <Link
            to="/blog"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            Blog
          </Link>
        </nav>
      </header>
      <main className="flex-1 container mx-auto py-8 px-4">{children}</main>
      <footer className="w-full bg-background border-t mt-auto py-8">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} SocialWave. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function BlogPage() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["publishedBlogPosts"],
    queryFn: () => apiClient.listPublishedBlogPosts(),
  });

  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <div>
      <MetaTags
        title="Blog | SocialWave"
        description="Latest articles, tips, and insights on social media management, AI marketing, and content strategy from the SocialWave team."
        keywords="social media blog, AI marketing tips, content strategy, social media trends"
      />
      {origin && (
        <>
          <StructuredData
            data={{
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "SocialWave",
              url: origin,
            }}
          />
          {posts && (
            <StructuredData
              data={{
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: "SocialWave Blog",
                description:
                  "Latest articles, tips, and insights on social media management, AI marketing, and content strategy from the SocialWave team.",
                url: `${origin}/blog`,
                mainEntity: {
                  "@type": "ItemList",
                  itemListElement: posts.map((post, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    url: `${origin}/blog/${post.slug}`,
                    name: post.title,
                  })),
                },
                publisher: {
                  "@type": "Organization",
                  name: "SocialWave",
                },
              }}
            />
          )}
        </>
      )}
      <h1 className="text-4xl font-bold mb-4">SocialWave Blog</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Insights, trends, and tips on mastering social media with AI.
      </p>
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Enhanced Navigation Tabs with Smart Interactions */}
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts?.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`}>
              <Card className="overflow-hidden h-full group">
                {post.featuredImageUrl && (
                  <img
                    src={post.featuredImageUrl}
                    alt={post.title}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription>
                    {post.publishedAt
                      ? `${formatDate(post.publishedAt)} by ${post.author.name}`
                      : "Not published"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {post.metaDescription}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  // Removed unused upgrade dialog state
  const { data: post, isLoading } = useQuery({
    queryKey: ["blogPost", slug],
    queryFn: () => apiClient.getBlogPostBySlug({ slug: slug! }),
    enabled: !!slug,
  });

  const postUrl = window.location.href;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/4 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!post) {
    return <div className="text-center py-10">Post not found.</div>;
  }

  const blogPostingStructuredData: any = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    headline: post.title,
    description: post.metaDescription || post.content.substring(0, 150),
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "SocialWave",
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
  };

  if (post.featuredImageUrl) {
    blogPostingStructuredData.image = post.featuredImageUrl;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <MetaTags
        title={`${post.metaTitle || post.title} | SocialWave Blog`}
        description={post.metaDescription || post.content.substring(0, 150)}
        keywords={post.tags || ""}
      />
      <StructuredData data={blogPostingStructuredData} />
      {post.featuredImageUrl && (
        <img
          src={post.featuredImageUrl}
          alt={post.title}
          className="w-full h-96 object-cover rounded-lg mb-8"
        />
      )}
      <h1 className="text-5xl font-extrabold mb-4">{post.title}</h1>
      <div className="text-muted-foreground mb-8">
        <span>
          Published on {post.publishedAt ? formatDate(post.publishedAt) : ""}{" "}
          by{" "}
        </span>
        <span className="font-semibold">{post.author.name}</span>
      </div>
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {post.content}
        </ReactMarkdown>
      </article>
      <div className="mt-8 pt-8 border-t">
        <h3 className="text-lg font-semibold mb-4">Share this post</h3>
        <div className="flex gap-4">
          <TwitterShareButton url={postUrl} title={post.title}>
            <TwitterIcon size={40} round />
          </TwitterShareButton>
          <FacebookShareButton url={postUrl}>
            <FacebookIcon size={40} round />
          </FacebookShareButton>
          <LinkedinShareButton
            url={postUrl}
            title={post.title}
            summary={post.metaDescription || post.content.substring(0, 150)}
            source="SocialWave"
          >
            <LinkedinIcon size={40} round />
          </LinkedinShareButton>
        </div>
      </div>
      {/* Removed upgrade dialog */}
    </div>
  );
}

// Helper functions
const getPlatformIcon = (platform: string, className = "h-5 w-5") => {
  switch (platform.toLowerCase()) {
    case "facebook":
      return <Facebook className={`${className} platform-facebook`} />;
    case "instagram":
      return <Instagram className={`${className} platform-instagram`} />;
    case "twitter":
      return <Twitter className={`${className} platform-twitter`} />;
    case "youtube":
      return <Youtube className={`${className} platform-youtube`} />;
    case "linkedin":
      return <Linkedin className={`${className} platform-linkedin`} />;
    default:
      return <MessageSquare className={className} />;
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};

const isNewComment = (comment: any) => {
  const commentDate = new Date(comment.createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
};

function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  // const navigate = useNavigate(); // Reserved for future navigation features
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isLoading } = useQuery(
    ["searchApp", debouncedQuery],
    () => apiClient.searchApp({ query: debouncedQuery }),
    {
      enabled: debouncedQuery.length > 1,
    },
  );

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading ? (
          <div className="p-4 text-center text-sm">Searching...</div>
        ) : (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {searchResults?.comments && searchResults.comments.length > 0 && (
          <CommandGroup heading="Comments">
            {searchResults.comments.map((comment) => (
              <CommandItem
                key={comment.id}
                onSelect={() =>
                  runCommand(() =>
                    console.log("Navigate to engage with comment:", comment.id),
                  )
                }
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>{comment.text}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {searchResults?.content && searchResults.content.length > 0 && (
          <CommandGroup heading="Content">
            {searchResults.content.map((content) => (
              <CommandItem
                key={content.id}
                onSelect={() =>
                  runCommand(() =>
                    console.log("Navigate to create with content:", content.id),
                  )
                }
              >
                <PenSquare className="mr-2 h-4 w-4" />
                <span>{content.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {searchResults?.pillars && searchResults.pillars.length > 0 && (
          <CommandGroup heading="Pillars">
            {searchResults.pillars.map((pillar) => (
              <CommandItem
                key={pillar.id}
                onSelect={() =>
                  runCommand(() =>
                    console.log("Navigate to create with pillar:", pillar.id),
                  )
                }
              >
                <PieChart className="mr-2 h-4 w-4" />
                <span>{pillar.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function MetaTags({
  title,
  description,
  keywords,
}: {
  title: string;
  description: string;
  keywords?: string;
}) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
    </Helmet>
  );
}

function StructuredData({ data }: { data: object }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

function HomePage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchCommentsMutation = useMutation(apiClient.fetchComments, {
    onSuccess: (data) => {
      triggerGeneration();

      if ("error" in data && data.error) {
        toast({
          title: "Failed to fetch comments",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      const count = data.newCommentsCount ?? 0;
      const skipped = data.problematicIds?.length || 0;
      toast({
        title:
          count > 0
            ? `${count} new comment${count === 1 ? "" : "s"} found!`
            : "No new comments found",
        description:
          skipped > 0
            ? `Some comments could not be fetched (e.g., deleted/private posts). ${skipped} post(s) were skipped.`
            : count > 0
              ? "Your dashboard will update shortly."
              : "You're all caught up!",
        variant: skipped > 0 ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to fetch comments",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const [cacheKey, setCacheKey] = useState<string | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: apiClient.getCurrentUser,
  });

  // Onboarding is now handled at the MainApp level to prevent duplicate triggers

  const { mutate: triggerGeneration, isLoading: isTriggering } = useMutation({
    mutationFn: apiClient.triggerDashboardSummaryGeneration,
    onSuccess: (data) => {
      setCacheKey(data.cacheKey);
    },
  });

  // Check if user has connected accounts
  const hasConnectedAccounts =
    currentUser?.accounts && currentUser.accounts.length > 0;

  useEffect(() => {
    // Only trigger dashboard generation if user has connected accounts
    if (!cacheKey && hasConnectedAccounts) {
      triggerGeneration();
    }
  }, [cacheKey, triggerGeneration, hasConnectedAccounts]);

  const { data: summaryResult, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["dashboardSummary", cacheKey],
    queryFn: () => apiClient.getDashboardSummary({ cacheKey }),
    enabled: !!cacheKey,
    refetchInterval: (data) => {
      if (!data) return false;
      return ["PENDING", "GENERATING"].includes(data.status) ? 3000 : false;
    },
  });

  const summary =
    summaryResult?.status === "COMPLETED" ? summaryResult.data : null;
  // Only show generating state if user has connected accounts and we're actually generating
  const isGenerating =
    hasConnectedAccounts &&
    (summaryResult?.status === "GENERATING" ||
      summaryResult?.status === "PENDING" ||
      isTriggering ||
      (isLoadingSummary && !summaryResult && cacheKey));

  const greeting = currentUser?.name
    ? `Welcome back, ${currentUser.name}!`
    : "Home";
  const subGreeting = "Here’s your command center for today.";

  const renderLoadingState = () => (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-1/2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-6 w-28" />
                </CardFooter>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-8 w-1/2" />
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-8 w-8" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => {
    const hasAccounts =
      currentUser?.accounts && currentUser.accounts.length > 0;

    return (
      <div className="space-y-8">
        <EmptyState
          icon={<LayoutDashboard className="h-12 w-12" />}
          title={
            hasAccounts ? "Your Dashboard is Ready" : "Welcome to SocialWave!"
          }
          description={
            hasAccounts
              ? "You've connected your accounts. Fetch your latest comments to get started."
              : "Your AI-powered social media command center awaits. Let's get you set up!"
          }
        >
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {hasAccounts ? (
              <Button
                onClick={() => fetchCommentsMutation.mutate()}
                disabled={fetchCommentsMutation.isLoading}
                size="lg"
              >
                {fetchCommentsMutation.isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Fetch Comments
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate("/settings")} size="lg">
                  <Settings className="h-4 w-4 mr-2" />
                  Connect Accounts
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("showOnboarding"));
                  }}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Take Tour
                </Button>
              </>
            )}
          </div>
        </EmptyState>

        {!hasAccounts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Smart Responses</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered comment management and response generation
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Trend Discovery</h3>
              <p className="text-sm text-muted-foreground">
                Discover viral opportunities and trending topics
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <PenSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Content Creation</h3>
              <p className="text-sm text-muted-foreground">
                Generate engaging content with AI assistance
              </p>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const StatsCard = ({
    title,
    value,
    change,
    icon,
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
  }) => (
    <Card className="p-4">
      <div className="flex items-center">
        <div className="p-3 bg-primary/10 rounded-lg mr-4">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {typeof change === "number" && (
          <div
            className={`ml-auto flex items-center text-sm font-semibold ${change >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            <TrendingUp
              className={`h-4 w-4 mr-1 ${change < 0 ? "transform rotate-180" : ""}`}
            />
            {change.toFixed(1)}%
          </div>
        )}
      </div>
    </Card>
  );

  const HubCard = ({
    title,
    description,
    mainStat,
    subStat,
    icon,
    onClick,
    ctaText,
  }: {
    title: string;
    description: string;
    mainStat: string | number;
    subStat: string;
    icon: React.ReactNode;
    onClick: () => void;
    ctaText: string;
  }) => (
    <Card className="flex flex-col h-full hub-card group" onClick={onClick}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-4xl font-bold">{mainStat}</p>
        <p className="text-sm text-muted-foreground break-words">{subStat}</p>
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          className="w-full justify-start text-primary group-hover:underline p-0"
        >
          {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const InsightItem = ({
    item,
    onClick,
  }: {
    item: any;
    onClick: () => void;
  }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-2 bg-primary/10 rounded-full">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium leading-tight">{item.text}</p>
        <p className="text-xs text-muted-foreground mt-1">{item.source}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );

  if (isGenerating && !summary) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 gradient-text">
          {greeting}
          {isGenerating && summary && (
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          )}
        </h1>
        <p className="text-muted-foreground text-lg mb-8">{subGreeting}</p>
        {renderLoadingState()}
      </div>
    );
  }

  if (summaryResult?.status === "FAILED") {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2 gradient-text">{greeting}</h1>
        <p className="text-muted-foreground text-lg mb-8">{subGreeting}</p>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Dashboard Generation Failed</AlertTitle>
          <AlertDescription>
            {summaryResult.error ||
              "An unknown error occurred. This can happen if you haven't fetched any comments yet."}
          </AlertDescription>
          <Button
            onClick={() => triggerGeneration()}
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={isTriggering}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  // Show empty state if user hasn't connected accounts or no summary data available
  // Don't show loading if we're not actually generating (no connected accounts or cache key)
  if (!hasConnectedAccounts || (!summary && !isGenerating)) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">{greeting}</h1>
              <p className="text-muted-foreground text-lg">{subGreeting}</p>
            </div>
            {!hasConnectedAccounts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("showOnboarding"));
                }}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Guide
              </Button>
            )}
          </div>
          {renderEmptyState()}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <MetaTags
        title="SocialWave Dashboard - AI Social Media Assistant"
        description="Your command center for AI-powered social media engagement, content creation, and analytics."
        keywords="AI social media, content creation, social media analytics, engagement, social media management"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "SocialWave Dashboard",
          description:
            "Your command center for AI-powered social media engagement, content creation, and analytics.",
        }}
      />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 gradient-text">{greeting}</h1>
          <p className="text-muted-foreground text-lg">{subGreeting}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Trigger the onboarding guide from MainApp by dispatching a custom event
            window.dispatchEvent(new CustomEvent("showOnboarding"));
          }}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Guide
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HubCard
              title="Response Hub"
              description="Your comment inbox"
              mainStat={summary?.pendingCommentsCount || 0}
              subStat="Comments Pending"
              icon={<MessageSquare className="h-6 w-6 text-primary" />}
              onClick={() => navigate("/engage")}
              ctaText="Go to Inbox"
            />
            <HubCard
              title="Strategy Hub"
              description="Your content plan"
              mainStat={summary?.contentIdeasCount || 0}
              subStat="Content Ideas"
              icon={<PieChart className="h-6 w-6 text-primary" />}
              onClick={() =>
                navigate("/discover", { state: { activeTab: "discover" } })
              }
              ctaText="View Strategy"
            />
            <HubCard
              title="Content Hub"
              description="Your media library"
              mainStat={summary?.draftContentCount || 0}
              subStat="Drafts Ready"
              icon={<PenSquare className="h-6 w-6 text-primary" />}
              onClick={() => navigate("/create")}
              ctaText="Open Library"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today's Briefing</CardTitle>
              <CardDescription>
                Your daily overview and top priorities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsCard
                  title="Engagement Change"
                  value={`${(summary?.engagementChange || 0).toFixed(0)}%`}
                  change={summary?.engagementChange || 0}
                  icon={<TrendingUp />}
                />
                <StatsCard
                  title="Pending Questions"
                  value={summary?.pendingQuestionCount || 0}
                  icon={<HelpCircle />}
                />
                <StatsCard
                  title="Top Post Engagement"
                  value={summary?.topPost?.engagement ?? 0}
                  icon={<ThumbsUp />}
                />
                <StatsCard
                  title="Most Active User"
                  value={summary?.mostActiveUser?.authorName ?? "N/A"}
                  icon={<Users />}
                />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Action Items</h4>
                <div className="space-y-2">
                  {(summary?.actionableRecommendations?.length ?? 0) > 0 ||
                  (summary?.insightNarratives?.length ?? 0) > 0 ? (
                    <>
                      {summary?.actionableRecommendations?.map((item) => (
                        <InsightItem
                          key={item.id}
                          item={item}
                          onClick={() =>
                            navigate("/discover", {
                              state: {
                                activeTab: "insights",
                                subTab: item.sourceTab,
                                highlightedItemId: item.sourceItemId,
                              },
                            })
                          }
                        />
                      ))}
                      {summary?.insightNarratives?.map((item) => (
                        <InsightItem
                          key={item.id}
                          item={item}
                          onClick={() =>
                            navigate("/discover", {
                              state: {
                                activeTab: "insights",
                                subTab: item.sourceTab,
                                highlightedItemId: item.sourceItemId,
                              },
                            })
                          }
                        />
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">
                      No new actions right now. Check back later!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="xl:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Trending Topics</CardTitle>
              <CardDescription>
                Based on viral content potential
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              {(summary?.trendingTopicsFromViral?.length ?? 0) > 0 ? (
                <div className="space-y-1">
                  {summary?.trendingTopicsFromViral?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate("/discover", {
                          state: {
                            activeTab: "insights",
                            subTab: item.sourceTab,
                            highlightedItemId: item.sourceItemId,
                          },
                        })
                      }
                    >
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Flame className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">
                          {item.text}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.source}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center p-6">
                  No trending topics right now.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Next Up</CardTitle>
              <CardDescription>Your upcoming scheduled post.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.nextScheduledPost ? (
                <div>
                  <p className="text-sm font-medium">
                    {summary?.nextScheduledPost?.content?.substring(0, 100)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Posting to {summary?.nextScheduledPost?.platform} on{" "}
                    {formatDate(
                      summary?.nextScheduledPost?.scheduledAt ?? new Date(),
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                  No posts scheduled.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Onboarding Guide is now handled at MainApp level */}
    </motion.div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [usageDetails, setUsageDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    if (!usageDetails.trim()) {
      toast({
        title: "Usage details required",
        description: "Please tell us how you plan to use SocialWave.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call once backend is ready
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      setIsSubmitted(true);
      toast({
        title: "Welcome to the waitlist! 🎉",
        description: "We'll notify you as soon as SocialWave is ready for you.",
      });
    } catch {
      toast({
        title: "Something went wrong",
        description:
          "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center"
      >
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold mb-2">You're on the list!</h3>
        <p className="text-muted-foreground">
          We'll send you early access and updates at <strong>{email}</strong>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="bg-background border rounded-lg p-6 shadow-lg space-y-4"
    >
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold mb-2">Join the Waitlist</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to know when SocialWave launches
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="waitlist-email" className="text-sm font-medium">
            Email Address *
          </Label>
          <Input
            id="waitlist-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="usage-details" className="text-sm font-medium">
            How do you plan to use SocialWave? *
          </Label>
          <Textarea
            id="usage-details"
            placeholder="e.g., Managing my brand's Instagram and Facebook accounts, creating content for my agency's clients, automating responses for my e-commerce business..."
            value={usageDetails}
            onChange={(e) => setUsageDetails(e.target.value)}
            className="mt-1 resize-none"
            rows={3}
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full font-semibold"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining Waitlist...
          </>
        ) : (
          "🚀 Join Waitlist"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        We respect your privacy. No spam, just updates on our launch.
      </p>
    </motion.form>
  );
}

function LandingPage() {
  const featuresRef = React.useRef<HTMLDivElement>(null);
  const pricingRef = React.useRef<HTMLDivElement>(null);

  const handleLearnMoreClick = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePricingClick = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SocialWave",
    applicationCategory: "SocialMedia",
    operatingSystem: "Web",
    description:
      "SocialWave is your all-in-one platform for AI-powered social media management. Go from insight to impact with automated sentiment analysis, viral trend discovery, and effortless content creation across all your channels.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const pricingPlans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description:
        "Perfect for individuals and small businesses getting started",
      features: [
        "2 social accounts",
        "100 AI responses/month",
        "Basic sentiment analysis",
        "Content calendar",
        "Email support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Professional",
      price: "$29",
      period: "per month",
      description: "Ideal for growing businesses and content creators",
      features: [
        "10 social accounts",
        "1,000 AI responses/month",
        "Advanced sentiment analysis",
        "Viral trend discovery",
        "Content generation",
        "Analytics dashboard",
        "Priority support",
      ],
      cta: "Start 14-Day Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "For agencies and large organizations",
      features: [
        "Unlimited social accounts",
        "Unlimited AI responses",
        "White-label options",
        "Team collaboration",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 phone support",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  const advancedFeatures = [
    {
      icon: Brain,
      title: "AI Sentiment Analysis",
      description:
        "Automatically detect and categorize emotions in comments to prioritize responses and identify opportunities.",
    },
    {
      icon: TrendingUp,
      title: "Viral Trend Discovery",
      description:
        "Stay ahead of the curve with real-time trend analysis and get content suggestions before trends peak.",
    },
    {
      icon: Zap,
      title: "Auto-Response Engine",
      description:
        "Generate contextually appropriate responses instantly, maintaining your brand voice across all interactions.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Deep insights into engagement patterns, audience behavior, and content performance across all platforms.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Seamlessly work with your team, assign tasks, and maintain consistent brand messaging.",
    },
    {
      icon: Shield,
      title: "Brand Safety",
      description:
        "AI-powered content moderation and brand guideline enforcement to protect your reputation.",
    },
    {
      icon: Clock,
      title: "Smart Scheduling",
      description:
        "Optimize posting times based on audience activity and platform algorithms for maximum reach.",
    },
    {
      icon: Target,
      title: "Audience Targeting",
      description:
        "Identify and engage with your most valuable audience segments across all platforms.",
    },
    {
      icon: Lightbulb,
      title: "Content Ideation",
      description:
        "Never run out of content ideas with AI-powered suggestions based on your niche and audience.",
    },
  ];

  const showcaseFeatures = [
    {
      value: "inbox",
      icon: MessageSquare,
      title: "Unified Inbox",
      heading: "Your Social Command Center",
      description:
        "Stop juggling tabs. SocialWave consolidates comments from all your connected platforms into one intelligent feed. Respond faster with AI-powered sentiment analysis and never miss an opportunity to engage.",
      points: [
        "View all comments across all platforms in one elegant interface.",
        "Filter by platform, status, or sentiment to focus on what matters.",
        "Access original post context without leaving your workflow.",
      ],
    },
    {
      value: "ai",
      icon: Sparkles,
      title: "AI Co-Pilot",
      heading: "Your Creative & Strategic Partner",
      description:
        "Our AI analyzes comments for sentiment and intent, suggesting on-brand replies in your unique voice. It learns from your style to become a true extension of your team.",
      points: [
        "Receive multiple, context-aware response variations for any comment.",
        "Automatically surface high-priority comments requiring urgent attention.",
        "Define your brand voice, and the AI adapts to you.",
      ],
    },
    {
      value: "strategy",
      icon: PieChart,
      title: "Strategy Hub",
      heading: "From Insight to Impact",
      description:
        "Turn analytics into action. Generate viral thread ideas, discover trending topics, and receive a full 7-day content plan tailored to your brand and audience goals.",
      points: [
        "Generate complete content calendars from your own social data.",
        "Create images, videos, and full posts with an integrated AI generator.",
        "Repurpose your best-performing content for any platform with a single click.",
      ],
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Connect & Calibrate",
      description:
        "Securely link your social accounts. Then, calibrate the AI by defining your unique brand voice, tone, and strategic goals.",
    },
    {
      step: 2,
      title: "Discover & Create",
      description:
        "Leverage Discover to uncover viral trends and generate a data-driven content calendar, complete with ready-to-post ideas.",
    },
    {
      step: 3,
      title: "Engage & Scale",
      description:
        "Execute your strategy with the AI-powered inbox. Respond 10x faster, manage conversations effortlessly, and scale your growth.",
    },
  ];

  const faqs = [
    {
      question: "Which social media platforms are supported?",
      answer:
        "SocialWave supports Facebook Pages, Instagram Business accounts, Twitter/X, YouTube, and LinkedIn for comment management, content scheduling, and analytics.",
    },
    {
      question: "How does the AI learn my brand's voice?",
      answer:
        "You provide initial guidelines (tone, keywords, example posts) in the settings. From there, the AI learns from every piece of content you generate, every response you edit, and all the feedback you provide on its suggestions.",
    },
    {
      question: "Can I schedule posts for all platforms?",
      answer:
        "Yes, our integrated scheduler allows you to plan and automate your content pipeline across all your connected accounts, including images and videos generated within the app.",
    },
    {
      question: "Is my data and account information secure?",
      answer:
        "Absolutely. We use industry-standard encryption and secure OAuth for account connections. Your credentials are never stored on our servers, and your data is used solely to power your SocialWave experience.",
    },
  ];
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center">
      <MetaTags
        title="SocialWave - AI-Powered Social Media Management"
        description="Supercharge your social media with SocialWave's AI-powered tools for sentiment analysis, content creation, and trend discovery. Sign up for free!"
        keywords="social media management, AI marketing, content scheduling, sentiment analysis, viral trends"
      />
      <StructuredData data={structuredData} />
      {/* Header */}
      <header className="w-full px-6 py-4 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-lg z-20 border-b">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground shadow-md">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold gradient-text">SocialWave</span>
        </div>
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      </header>

      <main className="w-full">
        {/* Hero Section */}
        <section className="text-center py-20 px-4 bg-background subtle-gradient-bg">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-6xl font-extrabold gradient-text mb-4"
          >
            🤖 Your AI Co-Pilot for Social Media Dominance
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8"
          >
            SocialWave is your all-in-one platform for AI-powered social media
            management. Go from insight to impact with automated sentiment
            analysis, viral trend discovery, and effortless content creation
            across all your channels.
          </motion.p>
          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-md mx-auto"
          >
            <WaitlistForm />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6"
          >
            <Button
              size="lg"
              variant="outline"
              className="rounded-full py-6 px-8 text-lg font-bold w-full sm:w-auto"
              onClick={handleLearnMoreClick}
              asChild
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ✨ See Features
              </motion.div>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full py-6 px-8 text-lg font-bold w-full sm:w-auto"
              onClick={handlePricingClick}
              asChild
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                💰 View Pricing
              </motion.div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mt-8"
          >
            <motion.div whileHover={{ y: -3, scale: 1.1 }}>
              <Facebook className="h-7 w-7 platform-facebook" />
            </motion.div>
            <motion.div whileHover={{ y: -3, scale: 1.1 }}>
              <Instagram className="h-7 w-7 platform-instagram" />
            </motion.div>
            <motion.div whileHover={{ y: -3, scale: 1.1 }}>
              <Twitter className="h-7 w-7 platform-twitter" />
            </motion.div>
            <motion.div whileHover={{ y: -3, scale: 1.1 }}>
              <Youtube className="h-7 w-7 platform-youtube" />
            </motion.div>
            <motion.div whileHover={{ y: -3, scale: 1.1 }}>
              <Linkedin className="h-7 w-7 platform-linkedin" />
            </motion.div>
          </motion.div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 px-4 bg-secondary/20">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold text-center mb-4">
              From Zero to Social Hero
            </h2>
            <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
              Our streamlined 3-step process is designed to get you from insight
              to impact, fast.
            </p>
            <div className="relative">
              {/* The connecting line for desktop */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-px -translate-y-1/2">
                <svg width="100%" height="2" className="stroke-border">
                  <line
                    x1="0"
                    y1="1"
                    x2="100%"
                    y2="1"
                    strokeWidth="2"
                    strokeDasharray="8 8"
                  />
                </svg>
              </div>
              <div className="grid md:grid-cols-3 gap-12 relative">
                {howItWorks.map((item, index) => (
                  <motion.div
                    key={item.step}
                    className="relative z-10 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                  >
                    <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold shadow-lg border-4 border-background">
                      {item.step}
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Features Grid */}
        <section className="py-20 px-4 bg-secondary/10">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                🎯 Advanced AI-Powered Features
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Discover the cutting-edge tools that make SocialWave the most
                powerful social media management platform.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {advancedFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-background rounded-lg p-6 shadow-lg border hover:shadow-xl transition-all duration-300 hover:border-primary/20"
                >
                  <div className="p-3 bg-primary/10 text-primary rounded-lg w-fit mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Showcase Section */}
        <section ref={featuresRef} className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                🚀 One Platform, Limitless Potential
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Explore how SocialWave's core features work in synergy to
                transform your social media workflow from reactive to proactive.
              </p>
            </div>

            <Tabs defaultValue={showcaseFeatures[0]?.value} className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-2 h-auto mb-12">
                {showcaseFeatures.map((feature) => (
                  <TabsTrigger
                    key={feature.value}
                    value={feature.value}
                    className="flex items-center gap-3 p-4 rounded-lg text-left h-full data-[state=active]:bg-primary/10 data-[state=active]:shadow-md data-[state=active]:border-primary/20 border"
                  >
                    <div className="p-3 bg-primary/20 text-primary rounded-lg">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {feature.heading}
                      </p>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {showcaseFeatures.map((feature) => (
                <TabsContent key={feature.value} value={feature.value}>
                  <motion.div
                    key={feature.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="grid md:grid-cols-2 gap-12 items-center"
                  >
                    <div className="rounded-lg shadow-lg overflow-hidden interactive-card bg-gradient-to-br from-primary/10 to-secondary/10 p-8 flex items-center justify-center min-h-[300px]">
                      <div className="text-center">
                        <feature.icon className="h-16 w-16 text-primary mx-auto mb-4" />
                        <h4 className="text-xl font-semibold text-foreground">
                          {feature.title}
                        </h4>
                        <p className="text-muted-foreground mt-2">
                          Interactive {feature.title.toLowerCase()} interface
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-4">
                        {feature.heading}
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.points.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Pricing Section */}
        <section ref={pricingRef} className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                💎 Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the perfect plan for your needs. Start free, upgrade when
                you're ready.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative bg-background rounded-lg p-8 shadow-lg border ${
                    plan.popular
                      ? "border-primary shadow-primary/20 transform scale-105"
                      : "border-border"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                        🔥 Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">
                        /{plan.period}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    size="lg"
                    disabled
                  >
                    Coming Soon
                  </Button>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">
                🔒 All plans include 256-bit SSL encryption and GDPR compliance
              </p>
              <p className="text-sm text-muted-foreground">
                Need a custom solution?{" "}
                <Link to="#" className="text-primary hover:underline">
                  Contact our sales team
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 bg-secondary/20">
          <div className="container mx-auto max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-center mb-12"
            >
              ❓ Frequently Asked Questions
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="text-lg font-semibold text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
                🌊 Ready to Ride the SocialWave?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Be among the first to experience the future of AI-powered social
                media management. Join our exclusive waitlist and get early
                access when we launch.
              </p>
              <div className="max-w-md mx-auto mb-8">
                <WaitlistForm />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Early access</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Exclusive updates</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Special launch pricing</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-background border-t mt-auto py-20">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-8 w-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground shadow-md">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold gradient-text">
                SocialWave
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Transform your social media presence with AI-powered management
            </p>
          </motion.div>
          <div className="flex justify-center items-center gap-6 mt-8 mb-4">
            <Link
              to="/blog"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Blog
            </Link>
            <Link
              to="#"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Terms of Service
            </Link>
            <Link
              to="#"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SocialWave. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Layout Component
// Layout Component
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);
    updateMatch();
    media.addEventListener("change", updateMatch);
    return () => media.removeEventListener("change", updateMatch);
  }, [query]);
  return matches;
};

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/engage", label: "Engage", icon: MessageSquare },
  { href: "/discover", label: "Discover", icon: PieChart },
  { href: "/create", label: "Create", icon: PenSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ user }: { user: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 80 }}
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => setIsExpanded(false)}
      className="hidden md:flex flex-col h-screen sticky top-0 border-r bg-background z-20"
    >
      <div className="flex-grow flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center px-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="text-lg font-bold gradient-text"
                  >
                    SocialWave
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
          <nav className="flex flex-col gap-2 px-4 mt-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="font-medium text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {user?.image && <AvatarImage src={user.image} />}
              <AvatarFallback>
                {getInitials(user?.name || "User")}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="text-sm overflow-hidden"
                >
                  <p className="font-semibold truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-muted-foreground truncate">
                    {user?.email || "No email"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t z-20">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-colors w-full h-full ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Header component with prominent search
function Header({
  user,
  onSearchClick,
}: {
  user: any;
  onSearchClick: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading } = useQuery(
    ["headerSearch", debouncedQuery],
    () => apiClient.searchApp({ query: debouncedQuery }),
    {
      enabled: debouncedQuery.length > 1,
    },
  );

  const hasResults =
    searchResults &&
    ((searchResults.comments && searchResults.comments.length > 0) ||
      (searchResults.content && searchResults.content.length > 0) ||
      (searchResults.pillars && searchResults.pillars.length > 0));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6">
          <div className="h-8 w-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </div>
          {isDesktop && (
            <span className="text-lg font-bold gradient-text">SocialWave</span>
          )}
        </Link>

        {/* Main Search Bar - Always Visible */}
        <div className="flex-1 max-w-2xl mx-auto relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={
                isDesktop
                  ? "Search content, comments, insights... (⌘K)"
                  : "Search..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(searchQuery.length > 1)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="pl-10 pr-12 bg-background/50 border-border/50 focus:bg-background focus:border-border transition-colors"
            />

            {/* Clear button */}
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {/* Search shortcut hint */}
            {!searchQuery && isDesktop && (
              <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </div>

          {/* Inline Search Results Dropdown */}
          {showResults && searchQuery.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-auto mx-2 md:mx-0">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Searching...
                </div>
              ) : hasResults ? (
                <div className="p-2">
                  {searchResults?.comments &&
                    searchResults.comments.length > 0 && (
                      <div className="mb-4 last:mb-0">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Comments ({searchResults.comments.length})
                        </div>
                        {searchResults.comments.slice(0, 3).map((comment) => (
                          <button
                            key={comment.id}
                            className="w-full p-2 text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                            onClick={() => {
                              setShowResults(false);
                              // Navigate to comment
                              console.log("Navigate to comment:", comment.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">
                              {comment.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                  {searchResults?.content &&
                    searchResults.content.length > 0 && (
                      <div className="mb-4 last:mb-0">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Content ({searchResults.content.length})
                        </div>
                        {searchResults.content.slice(0, 3).map((content) => (
                          <button
                            key={content.id}
                            className="w-full p-2 text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                            onClick={() => {
                              setShowResults(false);
                              // Navigate to content
                              console.log("Navigate to content:", content.id);
                            }}
                          >
                            <PenSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">
                              {content.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                  {searchResults?.pillars &&
                    searchResults.pillars.length > 0 && (
                      <div className="mb-4 last:mb-0">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Pillars ({searchResults.pillars.length})
                        </div>
                        {searchResults.pillars.slice(0, 3).map((pillar) => (
                          <button
                            key={pillar.id}
                            className="w-full p-2 text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                            onClick={() => {
                              setShowResults(false);
                              // Navigate to pillar
                              console.log("Navigate to pillar:", pillar.id);
                            }}
                          >
                            <PieChart className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">
                              {pillar.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                  {/* Show more results button */}
                  <div className="border-t pt-2 mt-2">
                    <button
                      onClick={() => {
                        setShowResults(false);
                        onSearchClick();
                      }}
                      className="w-full p-2 text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm text-muted-foreground flex items-center justify-center gap-2"
                    >
                      <Search className="h-3 w-3" />
                      View all results
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found for "{searchQuery}"
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setShowResults(false);
                        onSearchClick();
                      }}
                      className="text-primary hover:underline"
                    >
                      Try advanced search
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 ml-6">
          {/* Quick Actions - Desktop Only */}
          {isDesktop && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSearchClick}
                className="text-muted-foreground hover:text-foreground"
              >
                <Command className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  {user?.image && <AvatarImage src={user.image} />}
                  <AvatarFallback>
                    {getInitials(user?.name || "User")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "No email"}
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: apiClient.getCurrentUser,
  });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {isDesktop && <Sidebar user={user} />}
      <div className="flex-1 flex flex-col">
        {/* New Header with Search */}
        <Header
          user={user}
          onSearchClick={() => setIsCommandPaletteOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-12 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      {!isDesktop && <MobileBottomNav />}
      <CommandPalette
        open={isCommandPaletteOpen}
        setOpen={setIsCommandPaletteOpen}
      />
    </div>
  );
}

function EngagePage() {
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    location.state?.selectedCommentId || null,
  );
  const [responseText, setResponseText] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [respondedFilter, setRespondedFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [dateRange, setDateRange] = useState<{
    startDate: string | undefined;
    endDate: string | undefined;
  }>({ startDate: undefined, endDate: undefined });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const [originalPostContent, setOriginalPostContent] = useState<any>({
    isLoading: false,
    showEmbed: false,
  });

  // Get user settings for fetch frequency
  useUserSettings();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { toast } = useToast();

  const { data: accounts } = useConnectedAccounts();
  const connectedPlatforms = accounts
    ? [...new Set(accounts.map((a) => a.platform))]
    : [];
  const facebookPages =
    accounts
      ?.filter((a) => a.platform === "facebook")
      .flatMap((a) => (a as any).pages) ?? [];

  // Fetch new comments
  const fetchCommentsMutation = useMutation({
    mutationFn: apiClient.fetchComments,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments() });

      // Check if there was an error in the response
      if (data.error) {
        toast({
          title: "Failed to fetch comments",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Visual feedback on number of new comments found
      const count = data?.newCommentsCount ?? 0;
      const skipped = data?.problematicIds?.length || 0;
      if (count > 0) {
        toast({
          title: `${count} new comment${count === 1 ? "" : "s"} found!`,
          description:
            skipped > 0
              ? `Some comments could not be fetched (e.g., deleted/private posts). ${skipped} post(s) were skipped.`
              : `Your inbox has been updated with the latest comments.`,
          variant: skipped > 0 ? "destructive" : "default",
        });
      } else {
        toast({
          title: "No new comments found",
          description:
            skipped > 0
              ? `Some comments could not be fetched (e.g., deleted/private posts). ${skipped} post(s) were skipped.`
              : "You're all caught up!",
          variant: skipped > 0 ? "destructive" : "default",
        });
      }
    },
    onError: () => {
      toast({
        title: "Failed to fetch comments",
        description: "An error occurred while fetching new comments.",
        variant: "destructive",
      });
    },
  });

  // Analyze comment for response necessity and suggestions
  const { mutate: analyzeComment } = useMutation({
    mutationFn: apiClient.analyzeCommentForResponse,
    onSuccess: (data) => {
      setCommentAnalysis(data);
    },
  });

  // AI comment analysis state
  const [commentAnalysis, setCommentAnalysis] = useState<{
    responseNeeded: boolean;
    priorityLevel: number;
    reasoning: string;
    textResponses: string[];
    emojiSuggestions: Array<{ emoji: string; explanation: string }>;
    responseStrategy: string;
  } | null>(null);

  // Response variations state
  const [responseVariations, setResponseVariations] = useState<
    Array<{ id: string; text: string }>
  >([]);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);

  // Send response
  const respondMutation = useMutation({
    mutationFn: apiClient.respondToComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      setResponseText("");
      setSelectedCommentId(null);
    },
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [
    selectedPlatform,
    selectedPage,
    debouncedSearchQuery,
    respondedFilter,
    dateRange.startDate,
    dateRange.endDate,
  ]);

  // Reset selected page when platform changes
  useEffect(() => {
    setSelectedPage(null);
  }, [selectedPlatform]);

  // Reset response variations when comment changes
  useEffect(() => {
    setResponseVariations([]);
    setResponseText("");
    setCommentAnalysis(null);

    // Analyze the selected comment automatically
    if (selectedCommentId) {
      analyzeComment({ commentId: selectedCommentId });
    }
  }, [selectedCommentId, analyzeComment]);

  // Close date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Generate response variations when a comment is selected
  const { mutate: generateVariations } = useMutation({
    mutationFn: apiClient.generateResponseVariations,
    onSuccess: (data) => {
      if (data.variations && data.variations.length > 0) {
        setResponseVariations(data.variations);
        setResponseText(data.variations[0]?.text ?? "");
      }
      setIsLoadingVariations(false);
    },
    onError: () => {
      setIsLoadingVariations(false);
      toast({
        title: "Failed to generate responses",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (selectedCommentId) {
      setIsLoadingVariations(true);
      generateVariations({ commentId: selectedCommentId });
    }
  }, [selectedCommentId, generateVariations]);

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isFetching: isFetchingComments,
    isPreviousData,
  } = useQuery({
    queryKey: [
      "comments",
      currentPage,
      debouncedSearchQuery,
      selectedPlatform,
      selectedPage,
      respondedFilter,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () =>
      apiClient.getComments({
        page: currentPage,
        limit: 10,
        search: debouncedSearchQuery,
        platform: selectedPlatform || undefined,
        pageId: selectedPage || undefined,
        responded: respondedFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    keepPreviousData: true,
  });

  const comments = commentsData?.comments || [];
  const pagination = commentsData?.pagination;

  // Get selected comment
  const selectedComment = comments.find((c) => c.id === selectedCommentId);

  // Fetch original post content when a comment is selected
  useEffect(() => {
    if (selectedComment) {
      setOriginalPostContent((prev) => ({ ...prev, isLoading: true }));
      apiClient
        .getOriginalPostContent({
          platform: selectedComment.platform,
          postId: selectedComment.postId,
          accountId: selectedComment.accountId,
        })
        .then((data) => {
          if (data.error?.code === "TOKEN_EXPIRED") {
            // Handle expired token specifically
            setOriginalPostContent({
              content: "",
              author: "",
              date: null,
              imageUrl: null,
              engagement: null,
              isLoading: false,
              error: data.error,
            });

            // Show toast notification about expired token
            toast({
              title: "Authentication Required",
              description: data.error.message,
              variant: "destructive",
            });
          } else {
            // Normal content handling
            setOriginalPostContent({
              content: data.content || "",
              author: data.author || "",
              date: data.date ? formatDate(data.date) : null,
              imageUrl: data.imageUrl,
              engagement: data.engagement,
              isLoading: false,
              permalinkUrl: data.permalinkUrl,
              error: data.error,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching post content:", error);
          setOriginalPostContent({
            content: "",
            author: "",
            date: null,
            imageUrl: null,
            engagement: null,
            isLoading: false,
            error: {
              code: "FETCH_ERROR",
              message: "Unable to fetch post content. Please try again.",
            },
          });
        });
    } else {
      setOriginalPostContent({
        content: "",
        author: "",
        date: null,
        imageUrl: null,
        isLoading: false,
        error: null,
      });
    }
  }, [selectedCommentId, selectedComment, toast]);

  return (
    <div>
      <MetaTags
        title="Engage | SocialWave"
        description="Manage and respond to all your social media comments from a unified inbox. Prioritize conversations and engage with your audience effectively."
        keywords="social media inbox, comment management, customer engagement, sentiment analysis"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Engage | SocialWave",
          description:
            "Manage and respond to all your social media comments from a unified inbox.",
        }}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 gradient-text">Engage</h1>
          <p className="text-muted-foreground text-lg">
            Manage and respond to interactions across your social platforms
          </p>
        </div>
        <Button
          onClick={() => fetchCommentsMutation.mutate()}
          disabled={fetchCommentsMutation.isLoading}
          className="mt-4 md:mt-0 px-6 py-2 h-auto rounded-full shadow-md transition-all hover:shadow-lg"
        >
          <RefreshCw
            className={`mr-2 h-5 w-5 ${
              fetchCommentsMutation.isLoading ? "animate-spin" : ""
            }`}
          />
          Fetch New Comments
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full md:w-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              type="text"
              placeholder="Search comments or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Platform Select */}
          <select
            value={selectedPlatform || "all"}
            onChange={(e) =>
              setSelectedPlatform(
                e.target.value === "all" ? null : e.target.value,
              )
            }
            className="w-full md:w-auto px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Platforms</option>
            {connectedPlatforms.map((platform) => (
              <option key={platform} value={platform} className="capitalize">
                {platform}
              </option>
            ))}
          </select>

          {/* Page Select (Conditional) */}
          {selectedPlatform === "facebook" && facebookPages.length > 0 && (
            <select
              value={selectedPage || "all"}
              onChange={(e) =>
                setSelectedPage(
                  e.target.value === "all" ? null : e.target.value,
                )
              }
              className="w-full md:w-auto px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Pages</option>
              {facebookPages.map((page: any) => (
                <option key={page.id} value={page.id}>
                  {page.pageName}
                </option>
              ))}
            </select>
          )}

          {/* Status Select */}
          <select
            value={
              respondedFilter === undefined
                ? "all"
                : respondedFilter
                  ? "responded"
                  : "pending"
            }
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all") setRespondedFilter(undefined);
              else if (value === "responded") setRespondedFilter(true);
              else setRespondedFilter(false);
            }}
            className="w-full md:w-auto px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Comments</option>
            <option value="pending">Pending</option>
            <option value="responded">Responded</option>
          </select>

          {/* Date Picker */}
          <div className="relative" ref={datePickerRef}>
            <Button
              variant="outline"
              className="w-full md:w-auto flex items-center justify-between gap-2"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-calendar"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>
                {dateRange.startDate
                  ? dateRange.endDate
                    ? `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`
                    : new Date(dateRange.startDate).toLocaleDateString()
                  : "Date Filter"}
              </span>
              {(dateRange.startDate || dateRange.endDate) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRange({ startDate: undefined, endDate: undefined });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Button>
            {showDatePicker && (
              <Card className="absolute right-0 top-full mt-1 z-50 w-80 p-4">
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={dateRange.startDate || ""}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            startDate: e.target.value || undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={dateRange.endDate || ""}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            endDate: e.target.value || undefined,
                          }))
                        }
                        min={dateRange.startDate}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => setShowDatePicker(false)}>
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments and Response Section */}
      <div
        ref={commentsSectionRef}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 relative"
      >
        {/* Visual connector between comments and response */}
        <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-primary/10 rounded-full p-2 shadow-sm border border-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>
        {/* Comments List */}
        <Card className="overflow-hidden border-r-4 border-r-primary/20 md:border-r-8 md:border-r-primary/20 w-full flex flex-col">
          <CardHeader className="border-b bg-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5 text-primary/70" />
                  Recent Interactions
                </CardTitle>
                <CardDescription>
                  {selectedPlatform
                    ? `Interactions from ${selectedPlatform}`
                    : "Interactions from all platforms"}
                  {pagination && ` (${pagination.totalCount} total)`}
                </CardDescription>
              </div>
              <div className="hidden lg:flex items-center text-primary/70 text-sm font-medium">
                <span>Step 1: Select</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-1"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            {isLoadingComments && !comments.length ? (
              <LoadingSpinner className="py-12" />
            ) : comments.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-12 w-12" />}
                title={
                  !accounts || accounts.length === 0
                    ? "No accounts connected"
                    : "No comments found"
                }
                description={
                  !accounts || accounts.length === 0
                    ? "Connect your social media accounts to start managing comments and engaging with your audience."
                    : searchQuery
                      ? "Try a different search query"
                      : "Fetch new comments or adjust your filters to see interactions here."
                }
              >
                {!accounts || accounts.length === 0 ? (
                  <Button
                    className="w-full md:w-auto"
                    onClick={() => navigate("/settings")}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect Account
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full md:w-auto"
                      onClick={() => fetchCommentsMutation.mutate()}
                      disabled={fetchCommentsMutation.isLoading}
                    >
                      {fetchCommentsMutation.isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Fetch Comments
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full md:w-auto"
                      onClick={() => navigate("/settings")}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
                  </>
                )}
              </EmptyState>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto w-full">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-5 border-b last:border-b-0 transition-colors cursor-pointer ${
                        selectedCommentId === comment.id
                          ? "comment-active"
                          : isNewComment(comment)
                            ? "comment-new hover:bg-accent/50"
                            : "comment-old hover:bg-accent/50"
                      }`}
                      onClick={() => {
                        setSelectedCommentId(comment.id);
                        setResponseText("");
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="border-2 border-primary/10">
                          {comment.authorImage ? (
                            <AvatarImage
                              src={comment.authorImage}
                              alt={comment.authorName}
                            />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(comment.authorName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium truncate">
                              {comment.authorName}
                            </div>
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(comment.platform)}
                              {comment.responded && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-primary/10 text-primary border-primary/20"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Responded
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(comment.createdAt)}
                          </p>
                          <p className="text-sm mb-2">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentPage === 0}
                    >
                      Previous
                    </Button>

                    <div className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {pagination.totalPages}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={!pagination.hasMore}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Loading indicator for pagination */}
            {isFetchingComments && isPreviousData && (
              <div className="p-4 flex justify-center border-t">
                <RefreshCw className="h-5 w-5 animate-spin text-primary/50" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Section */}
        <Card className="overflow-hidden border-l-4 border-l-primary/20 md:border-l-8 md:border-l-primary/20 w-full">
          <CardHeader className="border-b bg-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Send className="mr-2 h-5 w-5 text-primary/70" />
                  Response
                </CardTitle>
                <CardDescription>
                  {selectedComment
                    ? `Respond to ${selectedComment.authorName}`
                    : "Select a comment to respond"}
                </CardDescription>
              </div>
              <div className="hidden lg:flex items-center text-primary/70 text-sm font-medium">
                <span>Step 2: Respond</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedComment ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <MessageSquare className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  No comment selected
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  Select a comment from the list to craft your response
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Original Post */}
                {originalPostContent.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Original Post Context
                        </CardTitle>
                        {originalPostContent.permalinkUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() =>
                              window.open(
                                originalPostContent.permalinkUrl,
                                "_blank",
                              )
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Post
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {originalPostContent.imageUrl && (
                        <img
                          src={originalPostContent.imageUrl}
                          alt="Original post"
                          className="rounded-lg mb-4"
                        />
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {originalPostContent.content || "No content available."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* 2. Comment content */}
                <div
                  className={`mb-3 p-3 rounded-lg ${selectedComment ? "comment-context-active" : "comment-context"} relative group`}
                >
                  <p className="text-sm">{selectedComment.text}</p>
                </div>

                {/* 3. AI Insights */}
                {commentAnalysis && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>AI Insights</AccordionTrigger>
                      <AccordionContent>
                        <div className="border border-primary/20 rounded-lg p-3 bg-primary/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm flex items-center">
                              <Sparkles className="h-4 w-4 mr-1 text-primary" />
                              AI Analysis
                            </h4>
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              Priority: {commentAnalysis.priorityLevel}/10
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground break-words">
                            <strong>Reasoning:</strong>{" "}
                            {commentAnalysis.reasoning}
                          </p>
                          <p className="text-sm text-muted-foreground break-words">
                            <strong>Strategy:</strong>{" "}
                            {commentAnalysis.responseStrategy}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {commentAnalysis.emojiSuggestions.map(
                              (emojiSugg) => (
                                <TooltipProvider key={emojiSugg.emoji}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                          setResponseText(
                                            (prev) => prev + emojiSugg.emoji,
                                          )
                                        }
                                      >
                                        {emojiSugg.emoji}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{emojiSugg.explanation}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ),
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* 4. Suggested Responses and Input */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="response" className="text-base">
                      Your Response
                    </Label>
                    {responseVariations.length > 0 && (
                      <Badge
                        variant="outline"
                        className="px-3 py-1 bg-primary/10 text-primary"
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-primary" />
                        AI Generated
                      </Badge>
                    )}
                  </div>

                  {/* AI Response Variations */}
                  {isLoadingVariations ? (
                    <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary/60 mr-2" />
                      <span className="text-muted-foreground">
                        Generating thoughtful responses...
                      </span>
                    </div>
                  ) : responseVariations.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {responseVariations.map((variation) => (
                          <Card
                            key={variation.id}
                            className={`p-3 cursor-pointer transition-all hover:shadow-md relative group ${responseText === variation.text ? "border-primary bg-primary/5" : "border-secondary/50 bg-secondary/10 hover:bg-secondary/20"}`}
                            onClick={() => setResponseText(variation.text)}
                          >
                            <p className="text-sm pr-16">{variation.text}</p>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Thumbs up/down feedback buttons */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-green-100 hover:text-green-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (selectedCommentId) {
                                          apiClient
                                            .submitResponseFeedback({
                                              commentId: selectedCommentId,
                                              responseVariationId: variation.id,
                                              feedbackType: "thumbs_up",
                                              regenerateAfterFeedback: false,
                                            })
                                            .then(() => {
                                              toast({
                                                title: "Feedback submitted",
                                                description:
                                                  "Thanks for helping us improve!",
                                              });
                                            });
                                        }
                                      }}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Good response</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-red-100 hover:text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (selectedCommentId) {
                                          apiClient
                                            .submitResponseFeedback({
                                              commentId: selectedCommentId,
                                              responseVariationId: variation.id,
                                              feedbackType: "thumbs_down",
                                              regenerateAfterFeedback: true,
                                            })
                                            .then((result) => {
                                              toast({
                                                title: "Feedback submitted",
                                                description:
                                                  "Generating better responses...",
                                              });
                                              // Update response variations with new ones
                                              if (result.newVariations) {
                                                setResponseVariations(
                                                  result.newVariations,
                                                );
                                              }
                                            });
                                        }
                                      }}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Generate better responses</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-primary/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copy(variation.text);
                                        if (originalPostContent.permalinkUrl) {
                                          window.open(
                                            originalPostContent.permalinkUrl,
                                            "_blank",
                                          );
                                        }
                                        toast({
                                          title: "Copied to clipboard",
                                          description:
                                            "Response text has been copied",
                                        });
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy response & open post</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="relative group">
                    <Textarea
                      id="response"
                      placeholder="Type your response here..."
                      className="min-h-[120px] border-secondary/50 focus:border-primary pr-8"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    className="py-3 h-12 font-medium text-sm shadow-md hover:shadow-lg transition-all"
                    disabled={!responseText || respondMutation.isLoading}
                    onClick={() => {
                      if (selectedCommentId && responseText) {
                        respondMutation.mutate(
                          {
                            commentId: selectedCommentId,
                            responseText,
                          },
                          {
                            onSuccess: () => {
                              apiClient.updateCommentStatus({
                                commentId: selectedCommentId,
                                status: "responded",
                                responseText,
                              });
                              queryClient.invalidateQueries({
                                queryKey: queryKeys.comments(),
                              });
                            },
                          },
                        );
                      }
                    }}
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Post
                  </Button>

                  <Button
                    className="py-3 h-12 font-medium text-sm shadow-md hover:shadow-lg transition-all"
                    variant="outline"
                    disabled={respondMutation.isLoading}
                    onClick={() => {
                      if (selectedCommentId) {
                        apiClient.updateCommentStatus({
                          commentId: selectedCommentId,
                          status: "reacted",
                        });
                        setSelectedCommentId(null);
                        setResponseText("");
                      }
                    }}
                  >
                    <span className="mr-2">👍</span>
                    React
                  </Button>

                  <Button
                    className="py-3 h-12 font-medium text-sm shadow-md hover:shadow-lg transition-all"
                    variant="outline"
                    disabled={respondMutation.isLoading}
                    onClick={() => {
                      if (selectedCommentId) {
                        apiClient.updateCommentStatus({
                          commentId: selectedCommentId,
                          status: "dismissed",
                        });
                        setSelectedCommentId(null);
                        setResponseText("");
                      }
                    }}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// OAuth Button components
function TwitterOAuthButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform");

    // Only process if this is a Twitter callback
    if (platform !== "twitter") {
      return;
    }

    // Clean up URL after processing
    const cleanUpUrl = () => {
      navigate("/settings", { replace: true });
    };

    if (error) {
      toast({
        title: "Connection failed",
        description: `Twitter authorization failed: ${error}`,
        variant: "destructive",
      });
      cleanUpUrl();
      return;
    }

    if (code && state) {
      const handleCallback = async () => {
        setIsLoading(true);
        try {
          await apiClient.handleTwitterOAuthCallback({
            code,
            state,
          });
          queryClient.invalidateQueries(queryKeys.connectedAccounts());

          toast({
            title: "Account connected",
            description: "Your Twitter account has been connected successfully",
          });
        } catch (callbackError: any) {
          toast({
            title: "Connection failed",
            description:
              callbackError instanceof Error
                ? callbackError.message
                : "Failed to connect account",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          cleanUpUrl();
        }
      };

      handleCallback();
    }
  }, [location, navigate, queryClient, toast]);

  // Initiate OAuth flow
  const connectWithTwitter = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getTwitterOAuthUrl();

      // Check if we got a missingCredentials response
      if ("missingCredentials" in result) {
        toast({
          title: "Configuration Required",
          description:
            "Twitter API credentials are not configured. Please add them in the app settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Open OAuth window instead of direct navigation
      const oauthWindow = window.open(
        result.url,
        "twitter-oauth",
        "width=600,height=700,menubar=no,toolbar=no,location=no",
      );

      if (!oauthWindow) {
        toast({
          title: "Popup Blocked",
          description:
            "Please allow popups for this site to connect with Twitter",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Show a toast to guide the user
      toast({
        title: "Twitter Authentication",
        description:
          "Please complete the authentication in the popup window. You'll be redirected back automatically.",
      });

      // Don't set isLoading to false here - it will be handled when the callback URL is processed
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate Twitter connection",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={connectWithTwitter}
      disabled={isLoading}
      className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Twitter className="h-4 w-4 mr-2" />
      )}
      Connect with Twitter
    </Button>
  );
}

function YouTubeOAuthButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform");

    // Only process if this is a YouTube callback
    if (platform !== "youtube") {
      return;
    }

    // Clean up URL after processing
    const cleanUpUrl = () => {
      navigate("/settings", { replace: true });
    };

    if (error) {
      toast({
        title: "Connection failed",
        description: `YouTube authorization failed: ${error}`,
        variant: "destructive",
      });
      cleanUpUrl();
      return;
    }

    if (code && state) {
      const handleCallback = async () => {
        setIsLoading(true);
        try {
          await apiClient.handleYouTubeOAuthCallback({
            code,
            state,
          });
          queryClient.invalidateQueries(queryKeys.connectedAccounts());

          toast({
            title: "Account connected",
            description: "Your YouTube account has been connected successfully",
          });
        } catch (error: any) {
          toast({
            title: "Connection failed",
            description:
              error instanceof Error
                ? error.message
                : "Failed to connect account",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          cleanUpUrl();
        }
      };

      handleCallback();
    }
  }, [location, navigate, queryClient, toast]);

  // Initiate OAuth flow
  const connectWithYouTube = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getYouTubeOAuthUrl();

      // Check if we got a missingCredentials response
      if ("missingCredentials" in result) {
        toast({
          title: "Configuration Required",
          description:
            "Google API credentials are not configured. Please add them in the app settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Open OAuth window instead of direct navigation
      const oauthWindow = window.open(
        result.url,
        "youtube-oauth",
        "width=600,height=700,menubar=no,toolbar=no,location=no",
      );

      if (!oauthWindow) {
        toast({
          title: "Popup Blocked",
          description:
            "Please allow popups for this site to connect with YouTube",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Show a toast to guide the user
      toast({
        title: "YouTube Authentication",
        description:
          "Please complete the authentication in the popup window. You'll be redirected back automatically.",
      });

      // Don't set isLoading to false here - it will be handled when the callback URL is processed
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate YouTube connection",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={connectWithYouTube}
      disabled={isLoading}
      className="bg-[#FF0000] hover:bg-[#FF0000]/90 text-white"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Youtube className="h-4 w-4 mr-2" />
      )}
      Connect with YouTube
    </Button>
  );
}

function FacebookOAuthButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availablePages, setAvailablePages] = useState<Array<{
    id: string;
    name: string;
  }> | null>(null);
  // Removed unused accountData state
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform");

    // Only process if this is a Facebook callback
    if (platform !== "facebook" || !code) {
      return;
    }

    // Clean up URL after processing
    const cleanUpUrl = () => {
      navigate("/settings", { replace: true });
    };

    if (error) {
      toast({
        title: "Connection failed",
        description: `Facebook authorization failed: ${error}`,
        variant: "destructive",
      });
      cleanUpUrl();
      return;
    }

    if (code && state) {
      const handleCallback = async () => {
        setIsLoading(true);
        try {
          const result = await apiClient.handleFacebookOAuthCallback({
            code,
            state,
            platform: "facebook",
          });

          // Check if we need page selection
          if (result.needsPageSelection && result.availablePages) {
            setAvailablePages(result.availablePages);

            setIsLoading(false);
            cleanUpUrl();
            return;
          }

          // Standard success flow
          queryClient.invalidateQueries(queryKeys.connectedAccounts());

          toast({
            title: "Account connected",
            description:
              "Your Facebook account has been connected successfully",
          });

          if (result.warning) {
            toast({
              title: "Limited functionality",
              description: result.warning,
              variant: "destructive",
            });
          }
        } catch (error: any) {
          toast({
            title: "Connection failed",
            description:
              error instanceof Error
                ? error.message
                : "Failed to connect account",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          cleanUpUrl();
        }
      };

      handleCallback();
    }
  }, [location, navigate, queryClient, toast]);

  // Handle page selection confirmation
  const handlePageSelection = (selectedPageIds: string[]) => {
    if (selectedPageIds.length === 0) {
      toast({
        title: "No Pages Selected",
        description: "Please select at least one Page to connect",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    apiClient
      .handleFacebookOAuthCallback({
        platform: "facebook",
        code: "", // Not needed for the second call
        state: "", // Not needed for the second call
        selectedPageIds,
      })
      .then(() => {
        queryClient.invalidateQueries(queryKeys.connectedAccounts());
        setAvailablePages(null);

        toast({
          title: "Pages Connected",
          description: `Successfully connected ${selectedPageIds.length} Facebook ${selectedPageIds.length === 1 ? "Page" : "Pages"}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Connection failed",
          description:
            error instanceof Error ? error.message : "Failed to connect pages",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Cancel page selection
  const handleCancelPageSelection = () => {
    setAvailablePages(null);
    toast({
      title: "Connection canceled",
      description: "No Facebook Pages were connected",
    });
  };

  // Initiate OAuth flow
  const connectWithFacebook = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getFacebookOAuthUrl({
        platform: "facebook",
      });

      // Check if we got a missingCredentials response
      if ("missingCredentials" in result) {
        toast({
          title: "Configuration Required",
          description:
            "Facebook API credentials are not configured. Please add them in the app settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Open OAuth window instead of direct navigation
      const oauthWindow = window.open(
        result.url,
        "facebook-oauth",
        "width=600,height=700,menubar=no,toolbar=no,location=no",
      );

      if (!oauthWindow) {
        toast({
          title: "Popup Blocked",
          description:
            "Please allow popups for this site to connect with Facebook",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Show a toast to guide the user
      toast({
        title: "Facebook Authentication",
        description:
          "Please complete the authentication in the popup window. You'll be redirected back automatically.",
      });

      // Don't set isLoading to false here - it will be handled when the callback URL is processed
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate Facebook connection",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (availablePages) {
    return (
      <FacebookPageSelector
        pages={availablePages}
        onSelect={handlePageSelection}
        onCancel={handleCancelPageSelection}
        isLoading={isLoading}
      />
    );
  }

  return (
    <Button
      onClick={connectWithFacebook}
      disabled={isLoading}
      className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Facebook className="h-4 w-4 mr-2" />
      )}
      Connect with Facebook
    </Button>
  );
}

function InstagramOAuthButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform");

    // Only process if this is an Instagram callback
    if (platform !== "instagram") {
      return;
    }

    // Clean up URL after processing
    const cleanUpUrl = () => {
      navigate("/settings", { replace: true });
    };

    if (error) {
      toast({
        title: "Connection failed",
        description: `Instagram authorization failed: ${error}`,
        variant: "destructive",
      });
      cleanUpUrl();
      return;
    }

    if (code && state) {
      const handleCallback = async () => {
        setIsLoading(true);
        try {
          const result = await apiClient.handleFacebookOAuthCallback({
            code,
            state,
            platform: "instagram",
          });

          // Invalidate accounts query to refetch
          queryClient.invalidateQueries(queryKeys.connectedAccounts());

          toast({
            title: "Account connected",
            description:
              "Your Instagram account has been connected successfully",
          });

          if (result.warning) {
            toast({
              title: "Limited functionality",
              description: result.warning,
              variant: "destructive",
            });
          }
        } catch (error: any) {
          toast({
            title: "Connection failed",
            description:
              error instanceof Error
                ? error.message
                : "Failed to connect account",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          cleanUpUrl();
        }
      };

      handleCallback();
    }
  }, [location, navigate, queryClient, toast]);

  // Initiate OAuth flow
  const connectWithInstagram = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getFacebookOAuthUrl({
        platform: "instagram",
      });

      if ("missingCredentials" in result) {
        toast({
          title: "Configuration Required",
          description: "Facebook/Instagram API credentials are not configured.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const oauthWindow = window.open(
        result.url,
        "instagram-oauth",
        "width=600,height=700,menubar=no,toolbar=no,location=no",
      );

      if (!oauthWindow) {
        toast({
          title: "Popup Blocked",
          description:
            "Please allow popups for this site to connect with Instagram.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Instagram Authentication",
        description: "Please complete the authentication in the popup window.",
      });
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate Instagram connection",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={connectWithInstagram}
      disabled={isLoading}
      className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Instagram className="h-4 w-4 mr-2" />
      )}
      Connect with Instagram
    </Button>
  );
}

function FacebookPageSelector({
  pages,
  onSelect,
  onCancel,
  isLoading = false,
}: {
  pages: Array<{ id: string; name: string }>;
  onSelect: (selectedIds: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  // Pre-select all pages by default
  useEffect(() => {
    if (pages && pages.length > 0) {
      setSelectedPages(pages.map((page) => page.id));
    }
  }, [pages]);

  const togglePage = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId],
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-secondary/20">
        <CardTitle>Select Facebook Pages</CardTitle>
        <CardDescription>
          Choose which Facebook Pages you want to connect
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground break-words">
            Your Facebook User token gives access to the following Pages. Select
            which ones you want to manage in SocialWave (all are selected by
            default):
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center p-2 hover:bg-secondary/20 rounded-md cursor-pointer"
                onClick={() => togglePage(page.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    id={`page-${page.id}`}
                    checked={selectedPages.includes(page.id)}
                    onChange={() => togglePage(page.id)}
                    className="h-4 w-4"
                  />
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Facebook className="h-4 w-4 platform-facebook" />
                  </div>
                  <label
                    htmlFor={`page-${page.id}`}
                    className="ml-2 text-sm font-medium cursor-pointer flex-1"
                  >
                    {page.name}
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => onSelect(selectedPages)}
              disabled={selectedPages.length === 0 || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>Connect Selected Pages ({selectedPages.length})</>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-secondary/20 border-secondary/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BrandSignalsDashboard() {
  // Removed unused upgrade dialog state
  const { data: connectedAccounts, isLoading: accountsLoading } =
    useConnectedAccounts();
  const {
    data: brandSignals,
    isLoading: signalsLoading,
    isError,
    error,
  } = useBrandSignals();

  // Show loading only if accounts are still loading
  if (accountsLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <div className="flex flex-wrap gap-2">
                      {[...Array(3)].map((_, j) => (
                        <Skeleton key={j} className="h-6 w-16 rounded-full" />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no accounts are connected, show a message to connect accounts first
  if (!connectedAccounts || connectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Signals</CardTitle>
          <CardDescription>
            What our AI learns about your brand from your feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Connect Your Social Media Accounts"
            description="To start building your brand signals, please connect your social media accounts first. Go to the Engage tab to connect your accounts."
          />
        </CardContent>
      </Card>
    );
  }

  // Show loading for brand signals only if accounts are connected
  if (signalsLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <div className="flex flex-wrap gap-2">
                      {[...Array(3)].map((_, j) => (
                        <Skeleton key={j} className="h-6 w-16 rounded-full" />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading Brand Signals</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {(error as Error)?.message ||
                  "Failed to load brand signals. Please try again later."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!brandSignals) {
    return (
      <EmptyState
        icon={<Sparkles className="h-12 w-12" />}
        title="No Brand Signals Yet"
        description="As you provide feedback on content recommendations, your brand signals will appear here, showing what the AI has learned about your preferences."
      />
    );
  }

  const {
    preferredTones,
    commonKeywords,
    engagementPatterns,
    sentimentProfile,
    contentPillars,
    lastUpdatedAt,
  } = brandSignals;

  const hasData =
    (Array.isArray(preferredTones) && preferredTones.length > 0) ||
    (Array.isArray(commonKeywords) && commonKeywords.length > 0) ||
    (engagementPatterns && Object.keys(engagementPatterns).length > 0) ||
    (sentimentProfile && Object.keys(sentimentProfile).length > 0) ||
    (Array.isArray(contentPillars) && contentPillars.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Brand Signals</CardTitle>
            <CardDescription>
              What our AI has learned about your brand from your feedback.
            </CardDescription>
          </div>
          {lastUpdatedAt && (
            <p className="text-sm text-muted-foreground break-words">
              Last updated: {formatDate(lastUpdatedAt)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!hasData ? (
          <EmptyState
            icon={<Sparkles className="h-12 w-12" />}
            title="No Brand Signals Yet"
            description="Provide feedback on content suggestions in the Content Studio to start building your brand profile."
          />
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SignalCard title="Preferred Tones">
                {Array.isArray(preferredTones) && preferredTones.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {preferredTones.map((tone: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {tone}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground break-words">
                    No data yet.
                  </p>
                )}
              </SignalCard>
              <SignalCard title="Common Keywords">
                {Array.isArray(commonKeywords) && commonKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {commonKeywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground break-words">
                    No data yet.
                  </p>
                )}
              </SignalCard>
              <SignalCard title="Top Content Pillars">
                {Array.isArray(contentPillars) && contentPillars.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {contentPillars.map((pillar: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {pillar}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground break-words">
                    No data yet.
                  </p>
                )}
              </SignalCard>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SignalCard title="Engagement Patterns">
                {engagementPatterns &&
                Object.keys(engagementPatterns).length > 0 ? (
                  <pre className="text-xs bg-muted/30 p-2 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(engagementPatterns, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground break-words">
                    No data yet.
                  </p>
                )}
              </SignalCard>
              <SignalCard title="Sentiment Profile">
                {sentimentProfile &&
                Object.keys(sentimentProfile).length > 0 ? (
                  <pre className="text-xs bg-muted/30 p-2 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(sentimentProfile, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground break-words">
                    No data yet.
                  </p>
                )}
              </SignalCard>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreditUsageTab() {
  const { toast } = useToast();

  const {
    data: userCredits,
    isLoading: creditsLoading,
    error: creditsError,
    isError: isCreditsError,
  } = useQuery(["userCredits"], () => apiClient.getUserCredits(), {
    onError: (error: any) => {
      console.error("Failed to fetch user credits:", error);
      toast({
        title: "Failed to load credits",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while loading your credit information.",
        variant: "destructive",
      });
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  const {
    data: creditPricing,
    isLoading: pricingLoading,
    error: pricingError,
    isError: isPricingError,
  } = useQuery(["creditPricing"], () => apiClient.getCreditPricing(), {
    onError: (error: any) => {
      console.error("Failed to fetch credit pricing:", error);
      toast({
        title: "Failed to load pricing",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while loading credit pricing information.",
        variant: "destructive",
      });
    },
    retry: 2,
    staleTime: 300000, // 5 minutes
  });

  const {
    data: transactionHistory,
    isLoading: historyLoading,
    error: historyError,
    // isError: _isHistoryError,
  } = useQuery(
    ["creditTransactionHistory"],
    () => apiClient.getCreditTransactionHistory({ limit: 20 }),
    {
      onError: (error: any) => {
        console.error("Failed to fetch transaction history:", error);
        toast({
          title: "Failed to load transaction history",
          description:
            error instanceof Error
              ? error.message
              : "An error occurred while loading your transaction history.",
          variant: "destructive",
        });
      },
      retry: 2,
      staleTime: 60000, // 1 minute
    },
  );

  // Calculate usage percentage - must be before conditional returns to avoid hooks violation
  const usagePercentage = React.useMemo(() => {
    try {
      if (
        !userCredits ||
        typeof userCredits.usedCredits !== "number" ||
        typeof userCredits.totalCredits !== "number"
      ) {
        console.warn("Invalid userCredits data structure:", userCredits);
        return 0;
      }
      const used = userCredits.usedCredits || 0;
      const total = Math.max(userCredits.totalCredits || 1, 1);
      return Math.round((used / total) * 100);
    } catch (error) {
      console.error("Error calculating usage percentage:", error, userCredits);
      return 0;
    }
  }, [userCredits]);

  const formatDate = (dateString: string | Date) => {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCreditIcon = (operation: string) => {
    switch (operation) {
      case "content_generation":
        return <FileText className="h-4 w-4" />;
      case "viral_thread_creation":
        return <Zap className="h-4 w-4" />;
      case "comment_analysis":
        return <MessageSquare className="h-4 w-4" />;
      case "image_generation":
        return <ImageIcon className="h-4 w-4" />;
      case "video_generation":
        return <Video className="h-4 w-4" />;
      case "trending_analysis":
        return <TrendingUp className="h-4 w-4" />;
      case "audience_insights":
        return <Users className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getOperationLabel = (operation: string) => {
    switch (operation) {
      case "content_generation":
        return "Content Generation";
      case "viral_thread_creation":
        return "Viral Thread Creation";
      case "comment_analysis":
        return "Comment Analysis";
      case "image_generation":
        return "Image Generation";
      case "video_generation":
        return "Video Generation";
      case "trending_analysis":
        return "Trending Analysis";
      case "audience_insights":
        return "Audience Insights";
      default:
        return operation
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  // Show error states if any of the critical queries fail
  if (isCreditsError || isPricingError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Credits Information</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>
              {isCreditsError && (
                <p>
                  Failed to load credit balance:{" "}
                  {creditsError instanceof Error
                    ? creditsError.message
                    : "Unknown error"}
                </p>
              )}
              {isPricingError && (
                <p>
                  Failed to load pricing information:{" "}
                  {pricingError instanceof Error
                    ? pricingError.message
                    : "Unknown error"}
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.reload();
                }}
                className="mr-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  console.log("Credits Error Details:", {
                    creditsError: creditsError,
                    pricingError: pricingError,
                    historyError: historyError,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                  });
                  toast({
                    title: "Debug info logged",
                    description:
                      "Error details have been logged to the console for debugging.",
                  });
                }}
              >
                <Bug className="h-4 w-4 mr-2" />
                Log Debug Info
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (creditsLoading || pricingLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <div className="ml-3 text-muted-foreground">
          Loading credits information...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Credit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Available Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {userCredits?.availableCredits || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {userCredits?.availableCredits === userCredits?.totalCredits
                ? "All credits available this month"
                : `Out of ${userCredits?.totalCredits || 0} total credits`}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {userCredits?.usedCredits || 0}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Usage</span>
                <span>{usagePercentage}%</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-500" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {userCredits?.subscriptionPlan === "none"
                ? "Free"
                : userCredits?.subscriptionPlan || "Free"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {userCredits?.subscriptionPlan === "none"
                ? "Limited features available"
                : `${userCredits?.monthlyAllocation || 0} credits refresh monthly`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Pricing */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-secondary/20">
          <CardTitle>Credit Pricing</CardTitle>
          <CardDescription>
            {userCredits && userCredits.usedCredits === 0
              ? "Here's how many credits each feature will cost when you start using them"
              : "Track how many credits each feature consumes - helpful for planning your usage"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {creditPricing?.map((pricing) => (
              <div
                key={pricing.operation}
                className="flex items-center gap-3 p-4 rounded-lg border bg-secondary/10 hover:bg-secondary/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getCreditIcon(pricing.operation)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {getOperationLabel(pricing.operation)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pricing.creditsPerUnit} credit
                    {pricing.creditsPerUnit !== 1 ? "s" : ""} per use
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-secondary/20">
          <CardTitle>Recent Usage History</CardTitle>
          <CardDescription>
            {transactionHistory?.transactions?.length === 0
              ? "Your usage history will appear here once you start using features"
              : `Your last ${Math.min(transactionHistory?.transactions?.length || 0, 20)} credit transactions`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6">
              <LoadingSpinner />
            </div>
          ) : transactionHistory?.transactions?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <History className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                Ready to get started?
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Once you start generating content, analyzing trends, or creating
                viral threads, your credit usage will appear here. You currently
                have {userCredits?.availableCredits || 0} credits to use!
              </p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {transactionHistory?.transactions?.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === "usage"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {transaction.type === "usage" ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {getOperationLabel(transaction.operation)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </div>
                      {transaction.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {transaction.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      transaction.type === "usage"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {transaction.type === "usage" ? "" : "+"}
                    {Math.abs(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Status Alerts */}
      {userCredits && userCredits.availableCredits === 0 ? (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 dark:text-red-100">
            No Credits Remaining
          </AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-200">
            You've used all {userCredits.totalCredits} of your monthly credits.
            Upgrade your plan to continue using AI features, or wait until next
            month for your credits to reset.
          </AlertDescription>
        </Alert>
      ) : userCredits && userCredits.availableCredits < 10 ? (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            Running Low on Credits
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Only {userCredits.availableCredits} credits left out of{" "}
            {userCredits.totalCredits}. Consider upgrading your plan before you
            run out, so you don't miss out on any AI-powered insights.
          </AlertDescription>
        </Alert>
      ) : userCredits && userCredits.usedCredits === 0 ? (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Ready to Go!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            You have {userCredits.availableCredits} credits available this
            month. Start exploring features like content generation, viral
            threads, and trend analysis!
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function UserManagementTab({
  users,
  refetchUsers,
}: {
  users?: any[];
  refetchUsers: () => void;
}) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [creditReason, setCreditReason] = useState<string>("");
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  const setSuperAdminMutation = useMutation(
    (params: { email: string; isSuperAdmin: boolean }) =>
      apiClient.setSuperAdmin(params),
    {
      onSuccess: (data) => {
        toast({
          title: "Success",
          description: data.message,
        });
        refetchUsers();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to update user",
          variant: "destructive",
        });
      },
    },
  );

  const updateCreditsMutation = useMutation(
    (params: { userId: string; creditsToAdd: number; reason?: string }) =>
      apiClient.updateUserCredits(params),
    {
      onSuccess: (data) => {
        toast({
          title: "Success",
          description: data.message,
        });
        setShowCreditDialog(false);
        setCreditAmount("");
        setCreditReason("");
        setSelectedUserId(null);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to update credits",
          variant: "destructive",
        });
      },
    },
  );

  const { data: userCredits } = useQuery(
    ["userCredits", selectedUserId],
    () =>
      selectedUserId
        ? apiClient.getUserCreditsById({ userId: selectedUserId })
        : null,
    {
      enabled: !!selectedUserId,
    },
  );

  const handleToggleSuperAdmin = (email: string, currentStatus: boolean) => {
    setSuperAdminMutation.mutate({
      email,
      isSuperAdmin: !currentStatus,
    });
  };

  const handleManageCredits = (userId: string) => {
    setSelectedUserId(userId);
    setShowCreditDialog(true);
  };

  const handleUpdateCredits = () => {
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || !selectedUserId) {
      toast({
        title: "Error",
        description: "Please enter a valid credit amount",
        variant: "destructive",
      });
      return;
    }

    updateCreditsMutation.mutate({
      userId: selectedUserId,
      creditsToAdd: amount,
      reason: creditReason || undefined,
    });
  };

  if (!users) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-secondary/20">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts and superadmin permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground max-w-sm">
                No users are currently registered in the system
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-6 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || "User"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="font-medium">
                        {user.name || "Unknown User"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      {user.handle && (
                        <div className="text-sm text-muted-foreground">
                          @{user.handle}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {user.isSuperAdmin && (
                      <Badge
                        variant="default"
                        className="bg-primary/10 text-primary"
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Super Admin
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageCredits(user.id)}
                      className="rounded-full"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Credits
                    </Button>
                    <Button
                      variant={user.isSuperAdmin ? "destructive" : "default"}
                      size="sm"
                      onClick={() =>
                        handleToggleSuperAdmin(user.email, user.isSuperAdmin)
                      }
                      disabled={setSuperAdminMutation.isLoading}
                      className="rounded-full"
                    >
                      {setSuperAdminMutation.isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : user.isSuperAdmin ? (
                        "Revoke Admin"
                      ) : (
                        "Make Admin"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage User Credits</DialogTitle>
            <DialogDescription>
              Add or deduct credits for this user. Use negative numbers to
              deduct credits.
            </DialogDescription>
          </DialogHeader>

          {userCredits && (
            <div className="space-y-4">
              <div className="bg-secondary/20 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">
                  Current Credits
                </div>
                <div className="text-2xl font-bold">
                  {userCredits.availableCredits.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {userCredits.totalCredits.toLocaleString()} total,{" "}
                  {userCredits.usedCredits.toLocaleString()} used
                </div>
                <div className="text-sm text-muted-foreground">
                  Plan: {userCredits.subscriptionPlan}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="creditAmount">Credit Amount</Label>
                  <Input
                    id="creditAmount"
                    type="number"
                    placeholder="Enter amount (positive to add, negative to deduct)"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="creditReason">Reason (optional)</Label>
                  <Input
                    id="creditReason"
                    placeholder="Reason for credit adjustment"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreditDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCredits}
              disabled={updateCreditsMutation.isLoading || !creditAmount}
            >
              {updateCreditsMutation.isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    isError: isErrorAccounts,
    error: errorAccounts,
  } = useConnectedAccounts();

  // Brand Guidelines
  const { data: brandGuidelines } = useQuery(["brandGuidelines"], () =>
    apiClient.getBrandGuidelines(),
  );

  // User Settings
  const { data: userSettings } = useUserSettings();

  // Superadmin check
  const { data: isCurrentUserSuperAdmin } = useQuery(
    ["isSuperAdmin"],
    () => apiClient.isSuperAdmin(),
    {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  // User management for superadmins
  const { data: allUsers, refetch: refetchUsers } = useQuery(
    ["allUsers"],
    () => apiClient.listAllUsers(),
    {
      enabled: !!isCurrentUserSuperAdmin,
      retry: false,
    },
  );

  const [brandVoice, setBrandVoice] = useState("professional");
  const [tonePriorities, setTonePriorities] = useState<string[]>([]);
  const [phrasesToUse, setPhrasesToUse] = useState<string[]>([]);
  const [phrasesToAvoid, setPhrasesToAvoid] = useState<string[]>([]);
  const [exampleResponses, setExampleResponses] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [fetchFrequency, setFetchFrequency] = useState("manual");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [priorityThreshold, setPriorityThreshold] = useState(8);

  // Load brand guidelines data when available
  useEffect(() => {
    if (brandGuidelines) {
      setBrandVoice(brandGuidelines.brandVoice);
      setTonePriorities(
        Array.isArray(brandGuidelines.tonePriorities)
          ? brandGuidelines.tonePriorities
          : [],
      );
      setPhrasesToUse(
        Array.isArray(brandGuidelines.phrasesToUse)
          ? brandGuidelines.phrasesToUse
          : [],
      );
      setPhrasesToAvoid(
        Array.isArray(brandGuidelines.phrasesToAvoid)
          ? brandGuidelines.phrasesToAvoid
          : [],
      );
      setExampleResponses(
        Array.isArray(brandGuidelines.exampleResponses)
          ? brandGuidelines.exampleResponses
          : [],
      );
      setAdditionalNotes(brandGuidelines.additionalNotes || "");
    }
  }, [brandGuidelines]);

  // Load user settings when available
  useEffect(() => {
    if (userSettings) {
      setFetchFrequency(userSettings.fetchFrequency);
      setEmailAlertsEnabled(userSettings.emailAlertsEnabled || false);
      setPriorityThreshold(userSettings.emailAlertsPriorityThreshold || 8);
    }
  }, [userSettings]);

  // Save brand guidelines
  const saveBrandGuidelinesMutation = useMutation(
    apiClient.saveBrandGuidelines,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.brandGuidelines());
        toast({
          title: "Brand guidelines saved",
          description: "Your brand guidelines have been updated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to save brand guidelines",
          description:
            error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      },
    },
  );

  // Save user settings
  const saveUserSettingsMutation = useMutation(apiClient.updateUserSettings, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.userSettings());
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save settings",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Facebook OAuth connection
  const [facebookToken, setFacebookToken] = useState("");
  const [availablePages, setAvailablePages] = useState<Array<{
    id: string;
    name: string;
  }> | null>(null);
  const { toast } = useToast();

  const connectFacebookMutation = useMutation(
    (params: {
      accessToken: string;
      platform: "facebook" | "instagram";
      selectedPageIds?: string[];
    }) => apiClient.connectFacebookAccount(params),
    {
      onSuccess: (data) => {
        // Check if we need page selection
        if (data.needsPageSelection && data.availablePages) {
          setAvailablePages(data.availablePages);
          return;
        }

        // Normal success flow
        queryClient.invalidateQueries(queryKeys.connectedAccounts());
        setFacebookToken("");
        setAvailablePages(null);

        // Show success toast
        toast({
          title: "Account connected",
          description: data.pagesCount
            ? `Successfully connected ${data.pagesCount} Facebook ${data.pagesCount === 1 ? "Page" : "Pages"}`
            : "Your Facebook account has been connected successfully",
        });

        // Show warning if returned from the API
        const accountWithWarning = data as { warning?: string };
        if (accountWithWarning.warning) {
          toast({
            title: "Limited functionality",
            description: accountWithWarning.warning,
            variant: "destructive",
          });
        }
      },
      onError: (error: any) => {
        // Show error toast with the specific error message
        const errorMessage =
          error instanceof Error ? error.message : "Failed to connect account";
        console.error("Facebook connection error:", errorMessage);

        toast({
          title: "Connection failed",
          description: errorMessage,
          variant: "destructive",
        });
      },
    },
  );

  // Handle page selection confirmation
  const handlePageSelection = (selectedPageIds: string[]) => {
    if (selectedPageIds.length === 0) {
      toast({
        title: "No Pages Selected",
        description: "Please select at least one Page to connect",
        variant: "destructive",
      });
      return;
    }

    connectFacebookMutation.mutate({
      accessToken: facebookToken,
      platform: "facebook",
      selectedPageIds,
    });
  };

  // Cancel page selection
  const handleCancelPageSelection = () => {
    setAvailablePages(null);
    setFacebookToken("");
  };

  // Manual account connection
  const [manualAccount, setManualAccount] = useState({
    platform: "twitter",
    name: "",
    accountId: "",
    accessToken: "",
    pageId: "",
    pageToken: "",
  });

  const connectManualMutation = useMutation(apiClient.connectManualAccount, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.connectedAccounts());
      setManualAccount({
        platform: "twitter",
        name: "",
        accountId: "",
        accessToken: "",
        pageId: "",
        pageToken: "",
      });
    },
  });

  // Disconnect account
  const disconnectMutation = useMutation(apiClient.disconnectAccount, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.connectedAccounts());
    },
  });

  // Helper function to add items to array state
  const addToArray = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => {
    if (value.trim()) {
      setter((prev) => [...prev, value.trim()]);
      return true;
    }
    return false;
  };

  // Helper function to remove items from array state
  const removeFromArray = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  // Form handlers for tag-like inputs
  const [newTonePriority, setNewTonePriority] = useState("");
  const [newPhraseToUse, setNewPhraseToUse] = useState("");
  const [newPhraseToAvoid, setNewPhraseToAvoid] = useState("");
  const [newExampleResponse, setNewExampleResponse] = useState("");

  const handleAddTonePriority = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (addToArray(setTonePriorities, newTonePriority)) {
        setNewTonePriority("");
      }
    }
  };

  const handleAddPhraseToUse = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (addToArray(setPhrasesToUse, newPhraseToUse)) {
        setNewPhraseToUse("");
      }
    }
  };

  const handleAddPhraseToAvoid = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (addToArray(setPhrasesToAvoid, newPhraseToAvoid)) {
        setNewPhraseToAvoid("");
      }
    }
  };

  const handleAddExampleResponse = () => {
    if (addToArray(setExampleResponses, newExampleResponse)) {
      setNewExampleResponse("");
    }
  };

  const handleSaveBrandGuidelines = () => {
    saveBrandGuidelinesMutation.mutate({
      brandVoice,
      tonePriorities,
      phrasesToUse,
      phrasesToAvoid,
      exampleResponses,
      additionalNotes,
    });
  };

  return (
    <div>
      <MetaTags
        title="Settings | SocialWave"
        description="Manage your connected social media accounts, define your brand voice for the AI, and configure your application preferences."
        keywords="account settings, brand guidelines, social media connection, API settings, notification preferences"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Settings | SocialWave",
          description:
            "Manage your connected social media accounts, define your brand voice for the AI, and configure your application preferences.",
        }}
      />
      <h1 className="text-3xl font-bold mb-2 gradient-text">Settings</h1>
      <p className="text-muted-foreground text-lg mb-8">
        Manage your accounts and brand guidelines
      </p>

      <Tabs defaultValue="accounts" className="mb-8">
        <TabsList className="mb-4 p-1 bg-secondary/50 rounded-lg flex flex-wrap h-auto justify-start">
          <TabsTrigger value="accounts" className="rounded-lg px-4 py-2">
            Social Accounts
          </TabsTrigger>
          <TabsTrigger value="brand" className="rounded-lg px-4 py-2">
            Brand Guidelines
          </TabsTrigger>
          <TabsTrigger value="brandSignals" className="rounded-lg px-4 py-2">
            Brand Signals
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg px-4 py-2">
            Preferences
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-4 py-2">
            My Documents
          </TabsTrigger>
          <TabsTrigger value="credits" className="rounded-lg px-4 py-2">
            Credits & Usage
          </TabsTrigger>
          {isCurrentUserSuperAdmin && (
            <TabsTrigger
              value="userManagement"
              className="rounded-lg px-4 py-2"
            >
              User Management
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="accounts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Connected Accounts */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-secondary/20">
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Manage your connected social media accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingAccounts ? (
                  <div className="p-6">
                    <LoadingSpinner />
                  </div>
                ) : isErrorAccounts ? (
                  <div className="p-6">
                    <Alert variant="destructive">
                      <AlertTitle>Error loading accounts</AlertTitle>
                      <AlertDescription>
                        {(errorAccounts as Error).message}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : accounts && accounts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <MessageSquare className="h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      No accounts connected
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      Connect your social media accounts using the options below
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {accounts &&
                      accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-5 hover:bg-secondary/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {getPlatformIcon(account.platform)}
                            </div>
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {account.platform}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              disconnectMutation.mutate({
                                accountId: account.id,
                              })
                            }
                            className="rounded-full border-primary/20 hover:bg-primary/5"
                          >
                            Disconnect
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connect New Accounts */}
            <div className="space-y-8">
              {/* Connection Guide - Only show for first-time users */}
              {accounts && accounts.length === 0 && (
                <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="border-b bg-primary/10">
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Ready to connect?
                    </CardTitle>
                    <CardDescription>
                      Choose any platform below - we'll guide you through it
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <HelpCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <strong>New here?</strong> Facebook/Instagram are
                        easiest to start with.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* OAuth Connection */}
              <Card id="connect-oauth" className="overflow-hidden">
                <CardHeader className="border-b bg-secondary/20">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    One-Click Connection
                  </CardTitle>
                  <CardDescription>
                    Connect your Facebook, Instagram, Twitter, and YouTube
                    accounts with OAuth
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {availablePages ? (
                    <FacebookPageSelector
                      pages={availablePages}
                      onSelect={handlePageSelection}
                      onCancel={handleCancelPageSelection}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 border rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                  <Facebook className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium">Facebook</h4>
                                  <div className="flex items-center gap-2">
                                    {accounts?.some(
                                      (a) => a.platform === "facebook",
                                    ) ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600">
                                          Connected
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          Not connected
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <FacebookOAuthButton />
                          </div>

                          <div className="p-4 border rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                                  <Instagram className="h-5 w-5 text-pink-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium">Instagram</h4>
                                  <div className="flex items-center gap-2">
                                    {accounts?.some(
                                      (a) => a.platform === "instagram",
                                    ) ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600">
                                          Connected
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          Not connected
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <InstagramOAuthButton />
                          </div>

                          <div className="p-4 border rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                  <Twitter className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium">Twitter</h4>
                                  <div className="flex items-center gap-2">
                                    {accounts?.some(
                                      (a) => a.platform === "twitter",
                                    ) ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600">
                                          Connected
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          Not connected
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <TwitterOAuthButton />
                          </div>

                          <div className="p-4 border rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                  <Youtube className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium">YouTube</h4>
                                  <div className="flex items-center gap-2">
                                    {accounts?.some(
                                      (a) => a.platform === "youtube",
                                    ) ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600">
                                          Connected
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          Not connected
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <YouTubeOAuthButton />
                          </div>
                        </div>

                        {/* Show contextual help only when needed */}
                        {accounts && accounts.length === 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm text-blue-800 dark:text-blue-200">
                                Click any button above - we'll handle the
                                technical setup for you
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator className="my-6" />

                      <div className="space-y-6">
                        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-900 dark:text-amber-100">
                            Advanced Option
                          </AlertTitle>
                          <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Have a Facebook access token? Connect directly
                            below.
                          </AlertDescription>
                        </Alert>

                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between p-0 h-auto"
                            >
                              <span className="font-medium flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                How to get a token
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 mt-3">
                            <div className="bg-background/60 rounded-lg p-3 text-sm">
                              <ol className="list-decimal list-inside space-y-1">
                                <li>
                                  Go to{" "}
                                  <a
                                    href="https://developers.facebook.com/tools/explorer"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    Facebook Graph API Explorer
                                  </a>
                                </li>
                                <li>
                                  Click "Get User Access Token" and select:{" "}
                                  <code className="bg-muted px-1 rounded text-xs">
                                    pages_read_engagement, pages_manage_posts
                                  </code>
                                </li>
                                <li>Copy the token and paste it below</li>
                              </ol>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <Label
                              htmlFor="facebook-token"
                              className="text-sm font-medium flex items-center gap-2"
                            >
                              <Facebook className="h-4 w-4 text-blue-600" />
                              Facebook Page Access Token
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-primary focus:outline-none"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="16" x2="12" y2="12" />
                                      <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs p-4">
                                  <div className="font-semibold mb-2">
                                    How to get a Facebook Page Access Token:
                                  </div>
                                  <ol className="list-decimal pl-4 space-y-1">
                                    <li>
                                      Go to{" "}
                                      <a
                                        href="https://developers.facebook.com/tools/explorer"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline text-primary"
                                      >
                                        Facebook Graph API Explorer
                                      </a>
                                    </li>
                                    <li>
                                      Select your app and click{" "}
                                      <b>Get User Access Token</b>.
                                    </li>
                                    <li>
                                      In permissions, select:{" "}
                                      <span className="font-mono">
                                        pages_show_list
                                      </span>
                                      ,{" "}
                                      <span className="font-mono">
                                        pages_read_engagement
                                      </span>
                                      ,{" "}
                                      <span className="font-mono">
                                        pages_manage_posts
                                      </span>
                                      .
                                    </li>
                                    <li>
                                      Click <b>Generate Access Token</b> and
                                      approve the popup.
                                    </li>
                                    <li>
                                      In the Explorer, GET <b>/me/accounts</b>.
                                    </li>
                                    <li>
                                      Copy the{" "}
                                      <span className="font-mono">
                                        access_token
                                      </span>{" "}
                                      for your Page from the results.
                                    </li>
                                    <li>Paste it here and connect.</li>
                                  </ol>
                                  <div className="mt-2 text-muted-foreground">
                                    Important: For multiple pages, you have two
                                    options:
                                  </div>
                                  <ul className="list-disc pl-4 mt-1 space-y-1">
                                    <li>
                                      <b>User Token:</b> Use your user token to
                                      connect all pages at once.
                                    </li>
                                    <li>
                                      <b>Page Tokens:</b> Connect each page
                                      individually with its own token.
                                    </li>
                                  </ul>
                                  <div className="mt-2 text-muted-foreground">
                                    Tip: Tokens from the Explorer expire
                                    quickly. For long-term use, set up your
                                    Facebook App for production and use
                                    long-lived tokens.
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input
                            id="facebook-token"
                            type="password"
                            placeholder="Enter your Facebook Page access token"
                            value={facebookToken}
                            onChange={(e) => setFacebookToken(e.target.value)}
                            className="border-secondary/50 focus:border-primary"
                          />
                          <p className="text-xs text-muted-foreground">
                            This token should have{" "}
                            <code className="bg-muted px-1 rounded">
                              pages_read_engagement
                            </code>{" "}
                            and{" "}
                            <code className="bg-muted px-1 rounded">
                              pages_manage_posts
                            </code>{" "}
                            permissions
                          </p>
                        </div>

                        {/* Show tips only after user starts engaging */}
                        {facebookToken.length > 10 && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-green-800 dark:text-green-200">
                                Token looks good! Click connect when ready.
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 mt-6">
                          <Button
                            variant="outline"
                            onClick={() =>
                              connectFacebookMutation.mutate({
                                accessToken: facebookToken,
                                platform: "facebook",
                              })
                            }
                            disabled={
                              !facebookToken ||
                              connectFacebookMutation.isLoading
                            }
                            className="rounded-full bg-secondary/30 border-secondary/50"
                          >
                            {connectFacebookMutation.isLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Facebook className="h-4 w-4 mr-2 platform-facebook" />
                                Connect with Token
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() =>
                              connectFacebookMutation.mutate({
                                accessToken: facebookToken,
                                platform: "instagram",
                              })
                            }
                            disabled={
                              !facebookToken ||
                              connectFacebookMutation.isLoading
                            }
                            className="rounded-full bg-secondary/30 border-secondary/50"
                          >
                            {connectFacebookMutation.isLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Instagram className="h-4 w-4 mr-2 platform-instagram" />
                                Connect Instagram
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Token Connection */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-secondary/20">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Manual Token Connection
                  </CardTitle>
                  <CardDescription>
                    Connect Facebook and Instagram using access tokens directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="platform" className="text-sm">
                        Platform
                      </Label>
                      <select
                        id="platform"
                        className="w-full p-3 rounded-lg border border-secondary/50 bg-background focus:border-primary outline-none"
                        value={manualAccount.platform}
                        onChange={(e) =>
                          setManualAccount({
                            ...manualAccount,
                            platform: e.target.value,
                          })
                        }
                      >
                        <option value="twitter">Twitter/X</option>
                        <option value="youtube">YouTube</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="account-name" className="text-sm">
                        Account Name
                      </Label>
                      <Input
                        id="account-name"
                        placeholder="Display name for this account"
                        value={manualAccount.name}
                        onChange={(e) =>
                          setManualAccount({
                            ...manualAccount,
                            name: e.target.value,
                          })
                        }
                        className="border-secondary/50 focus:border-primary"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="account-id" className="text-sm">
                        Account ID
                      </Label>
                      <Input
                        id="account-id"
                        placeholder="Your account ID on the platform"
                        value={manualAccount.accountId}
                        onChange={(e) =>
                          setManualAccount({
                            ...manualAccount,
                            accountId: e.target.value,
                          })
                        }
                        className="border-secondary/50 focus:border-primary"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="access-token" className="text-sm">
                        Access Token
                      </Label>
                      <Input
                        id="access-token"
                        placeholder="Your API access token"
                        value={manualAccount.accessToken}
                        onChange={(e) =>
                          setManualAccount({
                            ...manualAccount,
                            accessToken: e.target.value,
                          })
                        }
                        className="border-secondary/50 focus:border-primary"
                      />
                    </div>

                    <Button
                      onClick={() =>
                        connectManualMutation.mutate(manualAccount)
                      }
                      disabled={
                        !manualAccount.name ||
                        !manualAccount.accountId ||
                        !manualAccount.accessToken ||
                        connectManualMutation.isLoading
                      }
                      className="w-full mt-2 rounded-full py-5 h-auto"
                    >
                      Connect Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brand">
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-secondary/20">
                <CardTitle>Brand Voice & Guidelines</CardTitle>
                <CardDescription>
                  {brandGuidelines && Object.keys(brandGuidelines).length > 0
                    ? "Update your brand voice to ensure AI responses match your style"
                    : "Set up your brand voice so AI-generated responses sound authentically like your brand"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Brand Voice */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="brand-voice"
                      className="text-base font-medium"
                    >
                      Brand Voice
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {brandVoice === "professional"
                        ? "AI responses will be formal and business-focused"
                        : brandVoice === "casual"
                          ? "AI responses will be friendly and conversational"
                          : brandVoice === "enthusiastic"
                            ? "AI responses will be energetic and excited"
                            : brandVoice === "helpful"
                              ? "AI responses will be informative and solution-focused"
                              : brandVoice === "witty"
                                ? "AI responses will include appropriate humor"
                                : "How should AI sound when responding to your customers?"}
                    </p>
                    <select
                      id="brand-voice"
                      className="w-full p-3 rounded-lg border border-secondary/50 bg-background focus:border-primary outline-none"
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                    >
                      <option value="professional">
                        Professional & Formal
                      </option>
                      <option value="casual">Casual & Friendly</option>
                      <option value="enthusiastic">
                        Enthusiastic & Energetic
                      </option>
                      <option value="helpful">Helpful & Informative</option>
                      <option value="witty">Witty & Humorous</option>
                    </select>
                  </div>

                  {/* Tone Priorities */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="tone-priorities"
                      className="text-base font-medium"
                    >
                      Tone Priorities{" "}
                      {tonePriorities.length > 0 &&
                        `(${tonePriorities.length} added)`}
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {tonePriorities.length === 0
                        ? "Describe your ideal tone (press Enter after each word)"
                        : `These ${tonePriorities.length} words guide your AI responses`}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {tonePriorities.map((priority, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 flex items-center gap-1"
                        >
                          {priority}
                          <X
                            className="h-3 w-3 cursor-pointer ml-1"
                            onClick={() =>
                              removeFromArray(setTonePriorities, index)
                            }
                          />
                        </Badge>
                      ))}
                    </div>

                    <Input
                      id="tone-priorities"
                      placeholder="e.g., Empathetic, Direct, Thoughtful"
                      value={newTonePriority}
                      onChange={(e) => setNewTonePriority(e.target.value)}
                      onKeyDown={handleAddTonePriority}
                      className="border-secondary/50 focus:border-primary"
                    />
                  </div>

                  {/* Phrases to Use */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="phrases-to-use"
                      className="text-base font-medium"
                    >
                      Phrases to Use
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {phrasesToUse.length === 0
                        ? "Add your signature phrases (press Enter after each one)"
                        : `${phrasesToUse.length} phrases will appear in AI responses`}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {phrasesToUse.map((phrase, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 flex items-center gap-1"
                        >
                          {phrase}
                          <X
                            className="h-3 w-3 cursor-pointer ml-1"
                            onClick={() =>
                              removeFromArray(setPhrasesToUse, index)
                            }
                          />
                        </Badge>
                      ))}
                    </div>

                    <Input
                      id="phrases-to-use"
                      placeholder="e.g., Thank you for reaching out, We appreciate your feedback"
                      value={newPhraseToUse}
                      onChange={(e) => setNewPhraseToUse(e.target.value)}
                      onKeyDown={handleAddPhraseToUse}
                      className="border-secondary/50 focus:border-primary"
                    />
                  </div>

                  {/* Phrases to Avoid */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="phrases-to-avoid"
                      className="text-base font-medium"
                    >
                      Phrases to Avoid
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {phrasesToAvoid.length === 0
                        ? "Phrases to avoid in responses (press Enter after each one)"
                        : `AI will avoid these ${phrasesToAvoid.length} phrases`}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {phrasesToAvoid.map((phrase, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 flex items-center gap-1"
                        >
                          {phrase}
                          <X
                            className="h-3 w-3 cursor-pointer ml-1"
                            onClick={() =>
                              removeFromArray(setPhrasesToAvoid, index)
                            }
                          />
                        </Badge>
                      ))}
                    </div>

                    <Input
                      id="phrases-to-avoid"
                      placeholder="e.g., Sorry for the inconvenience, Unfortunately"
                      value={newPhraseToAvoid}
                      onChange={(e) => setNewPhraseToAvoid(e.target.value)}
                      onKeyDown={handleAddPhraseToAvoid}
                      className="border-secondary/50 focus:border-primary"
                    />
                  </div>

                  {/* Example Responses */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="example-responses"
                      className="text-base font-medium"
                    >
                      Example Responses
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {exampleResponses.length === 0
                        ? "Show AI how you'd respond with examples"
                        : `${exampleResponses.length} examples training your AI voice`}
                    </p>

                    <div className="space-y-3 mb-3">
                      {exampleResponses.map((response, index) => (
                        <div
                          key={index}
                          className="p-3 bg-secondary/20 rounded-lg relative pr-10"
                        >
                          <p className="text-sm">{response}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() =>
                              removeFromArray(setExampleResponses, index)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col space-y-2">
                      <Textarea
                        id="example-responses"
                        placeholder="e.g., Thanks for your question! We're happy to help you with that. Here's what you need to know..."
                        value={newExampleResponse}
                        onChange={(e) => setNewExampleResponse(e.target.value)}
                        className="border-secondary/50 focus:border-primary min-h-[80px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddExampleResponse}
                        disabled={!newExampleResponse.trim()}
                        className="self-end"
                      >
                        Add Example
                      </Button>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="additional-notes"
                      className="text-base font-medium"
                    >
                      Additional Guidelines
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {additionalNotes.length === 0
                        ? "Any other guidelines for AI responses"
                        : "Additional guidelines active"}
                    </p>
                    <Textarea
                      id="additional-notes"
                      placeholder="e.g., Always mention our satisfaction guarantee when discussing products. Use emojis sparingly."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="border-secondary/50 focus:border-primary min-h-[100px]"
                    />
                  </div>

                  <Button
                    onClick={handleSaveBrandGuidelines}
                    disabled={saveBrandGuidelinesMutation.isLoading}
                    className="w-full mt-4 rounded-full py-6 h-auto font-medium text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {saveBrandGuidelinesMutation.isLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Brand Guidelines"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brandSignals">
          <BrandSignalsDashboard />
        </TabsContent>

        <TabsContent value="preferences">
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-secondary/20">
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>
                  {accounts && accounts.length > 0
                    ? "Customize how SocialWave manages your connected accounts"
                    : "Set your preferences - you can change these anytime after connecting accounts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Fetch Frequency */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="fetch-frequency"
                      className="text-base font-medium"
                    >
                      Comment Fetch Frequency
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {fetchFrequency === "manual"
                        ? "Manual fetching - you're in control"
                        : `Auto-fetching ${fetchFrequency}`}
                    </p>
                    <select
                      id="fetch-frequency"
                      className="w-full p-3 rounded-lg border border-secondary/50 bg-background focus:border-primary outline-none"
                      value={fetchFrequency}
                      onChange={(e) => setFetchFrequency(e.target.value)}
                    >
                      <option value="manual">
                        Manual Only (Fetch when I click the button)
                      </option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  {/* Email Alerts */}
                  <div className="space-y-3 mt-6">
                    <Label
                      htmlFor="email-alerts"
                      className="text-base font-medium"
                    >
                      Email Alerts for High-Priority Comments
                    </Label>
                    <p className="text-sm text-muted-foreground break-words">
                      {emailAlertsEnabled
                        ? `Alerting for priority ${priorityThreshold}+ comments`
                        : "Email alerts disabled"}
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="email-alerts"
                        checked={emailAlertsEnabled}
                        onChange={(e) =>
                          setEmailAlertsEnabled(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label
                        htmlFor="email-alerts"
                        className="text-sm font-normal"
                      >
                        Enable email alerts for high-priority comments
                      </Label>
                    </div>

                    {emailAlertsEnabled && (
                      <div className="pl-6 mt-3 space-y-3">
                        <Label htmlFor="priority-threshold" className="text-sm">
                          Priority Threshold (1-10)
                        </Label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            id="priority-threshold"
                            min="1"
                            max="10"
                            step="1"
                            value={priorityThreshold}
                            onChange={(e) =>
                              setPriorityThreshold(parseInt(e.target.value))
                            }
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-sm font-medium bg-primary text-primary-foreground px-2 py-1 rounded-md">
                            {priorityThreshold}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {priorityThreshold <= 3
                            ? "Very sensitive - you'll get alerts for most comments"
                            : priorityThreshold <= 6
                              ? "Moderate - alerts for important and urgent comments"
                              : priorityThreshold <= 8
                                ? "Conservative - only urgent comments will trigger alerts"
                                : "Very selective - only the most critical comments will notify you"}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() =>
                      saveUserSettingsMutation.mutate({
                        fetchFrequency,
                        emailAlertsEnabled,
                        emailAlertsPriorityThreshold: priorityThreshold,
                      })
                    }
                    disabled={saveUserSettingsMutation.isLoading}
                    className="mt-6"
                  >
                    {saveUserSettingsMutation.isLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="documents">
          <DocumentUpload />
        </TabsContent>

        <TabsContent value="credits">
          <CreditUsageTab />
        </TabsContent>

        {isCurrentUserSuperAdmin && (
          <TabsContent value="userManagement">
            <UserManagementTab users={allUsers} refetchUsers={refetchUsers} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// --- REMOVED: InsightsDebugAllData and all related code ---

// --- InsightsNewPage: Standalone, robust, comments-based only ---

const AudienceInsightsSchemaForProp = z.object({
  keyInsightsSummary: z.string(),
  personas: z.array(
    z.object({
      id: z.string(),
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
});
type AudienceInsightsDataForProp = z.infer<
  typeof AudienceInsightsSchemaForProp
>;

function AudienceInsightsTab({
  insights,
  onFeedback,
  highlightedPersonaId,
}: {
  insights: AudienceInsightsDataForProp | undefined;
  onFeedback: (
    persona: any,
    feedbackType: "love" | "like" | "neutral" | "dislike",
  ) => void;
  highlightedPersonaId?: string | null;
}) {
  const highlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedPersonaId]);

  if (
    !insights ||
    !Array.isArray(insights.personas) ||
    insights.personas.length === 0
  ) {
    return (
      <Card className="overflow-hidden mb-8">
        <CardHeader className="border-b bg-secondary/20">
          <CardTitle>Audience Insights</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No Audience Insights Found"
            description="Could not generate audience insights at this time. Please check back later or try adjusting your filters."
          />
        </CardContent>
      </Card>
    );
  }

  const {
    keyInsightsSummary,
    personas,
    overallSentiment,
    competitiveMentions,
  } = insights;

  return (
    <div className="space-y-8">
      {keyInsightsSummary && (
        <Alert className="bg-primary/5 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Key Insights Summary</AlertTitle>
          <AlertDescription>{keyInsightsSummary}</AlertDescription>
        </Alert>
      )}

      <div>
        <h3 className="text-2xl font-bold mb-4 gradient-text">
          Audience Personas
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {personas.map((persona, index) => (
            <Card
              ref={persona.id === highlightedPersonaId ? highlightedRef : null}
              key={index}
              className={`overflow-hidden ${
                persona.id === highlightedPersonaId ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="bg-secondary/20">
                <CardTitle>{persona.personaName}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground break-words">
                  {persona.description}
                </p>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="motivations">
                    <AccordionTrigger>Motivations</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {persona.motivations.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="pain-points">
                    <AccordionTrigger>Pain Points</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {persona.painPoints.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="communication-tips">
                    <AccordionTrigger>Communication Tips</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {persona.communicationTips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Engagement</h4>
                  <p className="text-sm text-muted-foreground break-words">
                    {persona.engagementPatterns}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {persona.preferredContentFormats.map((format, i) => (
                      <Badge key={i} variant="secondary">
                        {format}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {persona.channels.map((channel, i) => (
                      <Badge key={i} variant="outline">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 flex justify-end">
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-red-500"
                          onClick={() => onFeedback(persona, "love")}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Love this!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-green-500"
                          onClick={() => onFeedback(persona, "like")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>I like this</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-yellow-500"
                          onClick={() => onFeedback(persona, "neutral")}
                        >
                          <Meh className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>It's okay</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-gray-500"
                          onClick={() => onFeedback(persona, "dislike")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Not for me</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Overall Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center flex-col">
              <p className="text-4xl font-bold">
                {overallSentiment.score.toFixed(2)}
              </p>
              <p
                className={`text-sm font-semibold ${overallSentiment.trend === "Improving" ? "text-green-500" : overallSentiment.trend === "Declining" ? "text-red-500" : "text-muted-foreground"}`}
              >
                {overallSentiment.trend}
              </p>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {overallSentiment.analysis}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitor Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            {competitiveMentions && competitiveMentions.length > 0 ? (
              <ul className="space-y-2">
                {competitiveMentions.map((mention, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>{mention.competitor}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          mention.sentiment.toLowerCase() === "positive"
                            ? "default"
                            : mention.sentiment.toLowerCase() === "negative"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {mention.sentiment}
                      </Badge>
                      <Badge variant="outline">{mention.count} mentions</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No competitor mentions found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InsightsTab({
  setPreviewContentId,
  initialSubTab,
  highlightedItemId,
}: {
  setPreviewContentId: (id: string | null) => void;
  initialSubTab?: "topics" | "viral" | "audience";
  highlightedItemId?: string | null;
}) {
  const { data: connectedAccounts, isLoading: isLoadingAccounts } =
    useConnectedAccounts();
  const { data: pagesData } = usePages();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    pagesData?.[0]?.id || null,
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [feedbackInfo, setFeedbackInfo] = useState<{
    post: any;
    type: "neutral" | "dislike";
  } | null>(null);
  const [postedInfo, setPostedInfo] = useState<{
    post: any;
    type: "love" | "like";
  } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [activeSubTab, setActiveSubTab] = useState(initialSubTab || "topics");

  const [generatingTopic, setGeneratingTopic] = useState<{
    topicId: string;
    format: string;
  } | null>(null);
  const [generatingPotential, setGeneratingPotential] = useState<string | null>(
    null,
  );
  // Removed unused upgrade dialog state

  const generateFromTopicMutation = useMutation(
    apiClient.generateContentFromTrendingTopic,
    {
      onMutate: ({ topic, format }) => {
        setGeneratingTopic({ topicId: topic.id, format });
      },
      onSuccess: (data) => {
        setPreviewContentId(data.contentId);
        queryClient.invalidateQueries(queryKeys.contentPillars());
        queryClient.invalidateQueries(queryKeys.generatedContent());
        setGeneratingTopic(null);
      },
      onError: (error: Error) => {
        if (
          error.message.toLowerCase().includes("insufficient credits") ||
          error.message.toLowerCase().includes("credit")
        ) {
          // setUpgradeDialogOpen(true); // Removed upgrade dialog
        } else {
          toast({
            title: "Generation Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        setGeneratingTopic(null);
      },
    },
  );

  const generateFromPotentialMutation = useMutation(
    apiClient.generateContentFromViralPotential,
    {
      onMutate: ({ post }) => {
        setGeneratingPotential(post.id);
      },
      onSuccess: (data) => {
        setPreviewContentId(data.contentId);
        queryClient.invalidateQueries(queryKeys.contentPillars());
        queryClient.invalidateQueries(queryKeys.generatedContent());
        setGeneratingPotential(null);
      },
      onError: (error: Error) => {
        if (
          error.message.toLowerCase().includes("insufficient credits") ||
          error.message.toLowerCase().includes("credit")
        ) {
          // setUpgradeDialogOpen(true); // Removed upgrade dialog
        } else {
          toast({
            title: "Generation Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        setGeneratingPotential(null);
      },
    },
  );

  const submitFeedbackMutation = useMutation({
    mutationFn: apiClient.submitRecommendationFeedback,
    onSuccess: () => {
      toast({
        title: `Feedback submitted!`,
        description: `Thanks for your feedback. We're now generating fresh insights based on it.`,
      });
      triggerGeneration({ pageId: selectedPageId || undefined });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    data: insights,
    isLoading: isLoadingInsights,
    refetch,
  } = useQuery<any>(
    ["advancedInsights", selectedPageId],
    () =>
      apiClient.getAdvancedInsights({ pageId: selectedPageId || undefined }),
    {
      refetchInterval: (data: any) => {
        if (data?.status === "GENERATING" || data?.status === "PENDING") {
          return 15000; // 15 seconds instead of 5 - reduce ACU consumption
        }
        return false;
      },
      staleTime: 60000, // 1 minute
      cacheTime: 600000, // 10 minutes
    },
  );

  // Separate query for cached trending topics
  const { data: cachedTrendingTopics } = useQuery<any>(
    ["cachedTrendingTopics"],
    () => apiClient.getTrendingTopicsResults(),
    {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    },
  );

  // Mutation for refreshing trending topics
  const { mutate: refreshTrendingTopics, isLoading: isRefreshingTrends } =
    useMutation(apiClient.detectRealTimeTrendingTopics, {
      onSuccess: () => {
        queryClient.invalidateQueries(["cachedTrendingTopics"]);
        toast({
          title: "Trending Topics Refreshed",
          description: "Latest trending topics have been fetched and cached.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to refresh trending topics",
          description: (error as Error).message,
          variant: "destructive",
        });
      },
    });

  const { mutate: triggerGeneration, isLoading: isGenerating } = useMutation(
    apiClient.triggerAdvancedInsightsGeneration,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.advancedInsights(selectedPageId || undefined),
        });
        toast({
          title: "Insights Generation Started",
          description:
            "This may take a few minutes. We'll automatically update when it's ready.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to start generation",
          description: (error as Error).message,
          variant: "destructive",
        });
      },
    },
  );

  useEffect(() => {
    if (pagesData && pagesData.length > 0 && !selectedPageId) {
      setSelectedPageId(pagesData[0]!.id);
    }
  }, [pagesData, selectedPageId]);

  if (isLoadingAccounts) {
    return <LoadingSpinner className="py-12" />;
  }

  if (!connectedAccounts || connectedAccounts.length === 0) {
    return (
      <EmptyState
        icon={<LinkIcon className="h-12 w-12" />}
        title="Connect Your Social Media Accounts"
        description="To generate advanced insights, you need to connect at least one social media account. Connect your accounts to get started with personalized insights."
      >
        <Button asChild>
          <a href="/settings">Connect Accounts</a>
        </Button>
      </EmptyState>
    );
  }

  if (isLoadingInsights) {
    return <LoadingSpinner className="py-12" />;
  }

  if (!insights) {
    return (
      <EmptyState
        icon={<Sparkles className="h-12 w-12" />}
        title="Generate Advanced Insights"
        description="Get deep insights into your audience, content, and trends."
      >
        <Button
          onClick={() =>
            triggerGeneration({ pageId: selectedPageId || undefined })
          }
          disabled={isGenerating}
        >
          {isGenerating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Insights
        </Button>
      </EmptyState>
    );
  }

  if (insights.status === "GENERATING" || insights.status === "PENDING") {
    return (
      <div className="text-center p-8">
        <LoadingSpinner />
        <p className="mt-4 text-muted-foreground">
          Generating insights... Last updated:{" "}
          {new Date(insights.lastUpdated).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  if (insights.status === "FAILED") {
    const getFriendlyErrorMessage = (
      error: string | null | undefined,
    ): string => {
      if (!error) return "An unknown error occurred during generation.";
      if (error.includes("exceeds the supported page limit")) {
        return "One of your documents is too large for analysis. Please upload a document with fewer than 1000 pages and try again.";
      }
      try {
        const jsonMatch = error.match(/{.*}/);
        if (jsonMatch && jsonMatch[0]) {
          const errorObj = JSON.parse(jsonMatch[0]) as {
            error?: { message?: string };
          };
          if (errorObj.error?.message) {
            return errorObj.error.message;
          }
        }
      } catch {
        // Fallback to original error if parsing fails
      }
      return error;
    };

    return (
      <Alert variant="destructive">
        <AlertTitle>Insights Generation Failed</AlertTitle>
        <AlertDescription>
          {getFriendlyErrorMessage(insights.error)}
        </AlertDescription>
        <Button
          className="mt-4"
          onClick={() => {
            triggerGeneration({ pageId: selectedPageId || undefined });
            refetch();
          }}
          disabled={isGenerating}
        >
          {isGenerating ? "Retrying..." : "Retry Generation"}
        </Button>
      </Alert>
    );
  }

  const {
    trendingTopics,
    viralContentPotential,
    audienceInsights,
    lastUpdated,
  } = insights;

  return (
    <div>
      <div
        className={`${isMobile ? "space-y-4" : "flex justify-between items-center"} mb-4`}
      >
        <div
          className={`flex items-center ${isMobile ? "justify-between" : "gap-4"}`}
        >
          <h1 className={`font-bold ${isMobile ? "text-xl" : "text-2xl"}`}>
            Advanced Insights
          </h1>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                triggerGeneration({ pageId: selectedPageId || undefined });
                refetch();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Refresh
            </Button>
          )}
        </div>

        <div
          className={`flex items-center ${isMobile ? "flex-col space-y-2" : "gap-4"}`}
        >
          <select
            value={selectedPageId || ""}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className={`px-3 py-2 rounded-md border border-input bg-background text-sm ${isMobile ? "w-full" : ""}`}
          >
            <option value="">All Pages</option>
            {pagesData?.map((page) => (
              <option key={page.id} value={page.id}>
                {page.pageName}
              </option>
            ))}
          </select>

          {lastUpdated && (
            <p
              className={`text-muted-foreground break-words ${isMobile ? "text-xs text-center" : "text-sm"}`}
            >
              {isMobile
                ? `Updated: ${new Date(lastUpdated).toLocaleDateString()}`
                : `Last updated: ${new Date(lastUpdated).toLocaleString()}`}
            </p>
          )}

          {!isMobile && (
            <Button
              variant="outline"
              onClick={() => {
                triggerGeneration({ pageId: selectedPageId || undefined });
                refetch();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Insights
            </Button>
          )}
        </div>
      </div>
      <Tabs
        value={activeSubTab}
        onValueChange={(value) =>
          setActiveSubTab(value as "topics" | "viral" | "audience")
        }
        className="w-full"
      >
        <TabsList
          className={`flex h-auto justify-start ${isMobile ? "w-full" : "flex-wrap"}`}
        >
          <TabsTrigger
            value="topics"
            className={`${isMobile ? "flex-1 text-xs" : ""}`}
          >
            {isMobile ? "Topics" : "Trending Topics"}
          </TabsTrigger>
          <TabsTrigger
            value="viral"
            className={`${isMobile ? "flex-1 text-xs" : ""}`}
          >
            {isMobile ? "Viral" : "Viral Potential"}
          </TabsTrigger>
          <TabsTrigger
            value="audience"
            className={`${isMobile ? "flex-1 text-xs" : ""}`}
          >
            {isMobile ? "Audience" : "Audience Insights"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="topics" className="mt-4">
          <TrendingTopicsTab
            topics={trendingTopics}
            onRefresh={() => refreshTrendingTopics({})}
            isRefreshing={isRefreshingTrends}
            onFeedback={(p, feedbackType) => {
              if (feedbackType === "love" || feedbackType === "like") {
                setPostedInfo({ post: p, type: feedbackType });
              } else {
                setFeedbackInfo({ post: p, type: feedbackType });
              }
            }}
            onGenerate={(topic, format) =>
              generateFromTopicMutation.mutate({ topic, format })
            }
            isGenerating={generateFromTopicMutation.isLoading}
            generatingParams={generatingTopic}
            highlightedTopicId={
              activeSubTab === "topics" ? highlightedItemId : null
            }
            cacheInfo={{
              lastUpdated: cachedTrendingTopics?.lastUpdated,
              isFromCache: cachedTrendingTopics?.cached,
            }}
          />
        </TabsContent>
        <TabsContent value="viral" className="mt-4">
          <ViralPotentialTab
            potentialPosts={viralContentPotential}
            onFeedback={(p, feedbackType) => {
              if (feedbackType === "love" || feedbackType === "like") {
                setPostedInfo({ post: p, type: feedbackType });
              } else {
                setFeedbackInfo({ post: p, type: feedbackType });
              }
            }}
            onGenerate={(post) =>
              generateFromPotentialMutation.mutate({ post })
            }
            isGenerating={generateFromPotentialMutation.isLoading}
            generatingPostId={generatingPotential}
            highlightedPostId={
              activeSubTab === "viral" ? highlightedItemId : null
            }
          />
        </TabsContent>
        <TabsContent value="audience" className="mt-4">
          <AudienceInsightsTab
            insights={audienceInsights}
            onFeedback={(p, feedbackType) => {
              if (feedbackType === "love" || feedbackType === "like") {
                setPostedInfo({ post: p, type: feedbackType });
              } else {
                setFeedbackInfo({ post: p, type: feedbackType });
              }
            }}
            highlightedPersonaId={
              activeSubTab === "audience" ? highlightedItemId : null
            }
          />
        </TabsContent>
      </Tabs>
      {feedbackInfo && (
        <FeedbackDialog
          isOpen={!!feedbackInfo}
          onOpenChange={(isOpen) => !isOpen && setFeedbackInfo(null)}
          feedbackType={feedbackInfo.type}
          onSubmit={(feedbackData) => {
            submitFeedbackMutation.mutate({
              recommendationId: feedbackInfo.post.id,
              source: "viral-potential",
              feedbackType: feedbackInfo.type,
              ...feedbackData,
            });
            setFeedbackInfo(null);
          }}
        />
      )}
      {postedInfo && (
        <IPostedThisDialog
          isOpen={!!postedInfo}
          onOpenChange={(isOpen) => !isOpen && setPostedInfo(null)}
          post={postedInfo.post}
          onSubmit={() => {
            submitFeedbackMutation.mutate({
              recommendationId: postedInfo.post.id,
              source: "viral-potential",
              feedbackType: postedInfo.type,
            });
            setPostedInfo(null);
          }}
        />
      )}
    </div>
  );
}

function ViralThreadsTab({
  onContentGenerated,
}: {
  onContentGenerated: () => void;
}) {
  const safeJsonParse = (str: string | null): any => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error("Failed to parse JSON string:", str, e);
      return null;
    }
  };

  const [source, setSource] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentTone, setContentTone] = useState("Educational");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveThreadMutation = useMutation(apiClient.saveViralThreadAsContent, {
    onSuccess: (data) => {
      toast({
        title: "Thread Saved!",
        description: `"${data.title}" has been added to your content library.`,
      });
      onContentGenerated();
      setSelectedThreadId(null); // Close the detail view
    },
    onError: (error) => {
      toast({
        title: "Failed to save thread",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "engagementScore">(
    "createdAt",
  );
  const [filterByPattern, setFilterByPattern] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedTweets, setEditedTweets] = useState<{ content: string }[]>([]);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { data: tags } = useQuery({
    queryKey: ["viralThreadTags"],
    queryFn: apiClient.listViralThreadTags,
  });

  // Repurpose state
  type RepurposeThreadInput = inferRPCInputType<"repurposeThread">;
  const [repurposeState, setRepurposeState] = useState<{
    thread: any | null;
    taskId: string | null;
    platform: string | null;
    isDialogOpen: boolean;
  }>({
    thread: null,
    taskId: null,
    platform: null,
    isDialogOpen: false,
  });

  const [schedulingThread, setSchedulingThread] = useState<any | null>(null);

  const schedulePostMutation = useMutation({
    mutationFn: apiClient.schedulePost,
    onSuccess: () => {
      toast({ title: "Thread scheduled successfully!" });
      setSchedulingThread(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduledPosts(),
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule thread",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const repurposeMutation = useMutation({
    mutationFn: apiClient.repurposeThread,
    onSuccess: (data, variables: RepurposeThreadInput) => {
      setRepurposeState((prev) => ({
        ...prev,
        taskId: data.taskId,
        platform: variables.platform,
        isDialogOpen: false,
      }));
      toast({ title: "Repurposing started!" });
    },
    onError: (error) => {
      toast({
        title: "Failed to start repurposing",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const { data: repurposeStatus } = useQuery({
    queryKey: ["repurposeStatus", repurposeState.taskId],
    queryFn: () => {
      if (
        !repurposeState.taskId ||
        !repurposeState.thread?.id ||
        !repurposeState.platform
      ) {
        return Promise.resolve(null);
      }
      return apiClient.getRepurposeResults({
        taskId: repurposeState.taskId,
        threadId: repurposeState.thread.id,
        platform: repurposeState.platform,
      });
    },
    enabled: !!repurposeState.taskId,
    refetchInterval: (data: any) => {
      if (!data) return false;
      return data.status === "PENDING" || data.status === "GENERATING"
        ? 2000
        : false;
    },
  });

  useEffect(() => {
    if (repurposeStatus?.status === "COMPLETED") {
      toast({ title: "Content repurposed and added to library!" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentPillars(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.generatedContent(),
      });
      if (repurposeStatus.newContentId) {
        onContentGenerated();
      }
      setRepurposeState((prev) => ({ ...prev, taskId: null }));
    } else if (repurposeStatus?.status === "FAILED") {
      toast({
        title: "Repurposing failed",
        variant: "destructive",
      });
      setRepurposeState((prev) => ({ ...prev, taskId: null }));
    }
  }, [repurposeStatus, toast, queryClient, onContentGenerated]);

  const { mutate: hideThread } = useMutation({
    mutationFn: apiClient.hideViralThread,
    onSuccess: () => {
      toast({ title: "Thread archived" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.viralThreads(),
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to archive thread",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const bulkHideMutation = useMutation(apiClient.bulkHideViralThreads, {
    onSuccess: (data) => {
      toast({ title: `${data.count} threads archived` });
      setSelectedThreadIds([]);
      queryClient.invalidateQueries(queryKeys.viralThreads());
    },
    onError: (error) => {
      toast({
        title: "Failed to archive threads",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleBulkHide = () => {
    if (selectedThreadIds.length > 0) {
      bulkHideMutation.mutate({ threadIds: selectedThreadIds });
    }
  };

  const updateThreadMutation = useMutation(apiClient.updateViralThread, {
    onSuccess: () => {
      toast({ title: "Thread updated successfully!" });
      queryClient.invalidateQueries(queryKeys.viralThreads());
      queryClient.invalidateQueries(
        queryKeys.viralThread(selectedThreadId ?? ""),
      );
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update thread",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    if (selectedThreadId) {
      updateThreadMutation.mutate({
        threadId: selectedThreadId,
        title: editedTitle,
        tweets: editedTweets,
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: threadsData, isLoading: isLoadingThreads } = useQuery({
    queryKey: [
      "viralThreads",
      debouncedSearchTerm,
      sortBy,
      filterByPattern,
      selectedTagIds,
    ],
    queryFn: () =>
      apiClient.listViralThreads({
        searchTerm: debouncedSearchTerm,
        sortBy: sortBy,
        filterByPattern: filterByPattern,
        tagIds: selectedTagIds,
      }),
    // Optimize refresh interval: only refresh when actively generating
    refetchInterval: (data: any) => {
      // Check if there are any threads currently being generated
      if (
        data?.threads?.some(
          (thread: any) =>
            thread.status === "GENERATING" || thread.status === "PENDING",
        )
      ) {
        return 10000; // 10 seconds when actively generating
      }
      return false; // No automatic refresh otherwise
    },
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });

  const {
    mutate: generateThread,
    isLoading: isGenerating,
    data: generationTask,
  } = useMutation(apiClient.generateViralThread, {
    onSuccess: () => {
      toast({
        title: "Thread generation started!",
        description:
          "Your thread is being generated and will appear below shortly.",
      });
      queryClient.invalidateQueries(queryKeys.viralThreads());
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const { data: generationStatus } = useQuery(
    ["viralThreadStatus", generationTask?.taskId],
    () => apiClient.getViralThreadStatus({ taskId: generationTask!.taskId }),
    {
      enabled: !!generationTask?.taskId,
      refetchInterval: (data: any) =>
        data?.status === "PENDING" || data?.status === "GENERATING"
          ? 2000
          : false,
      onSuccess: (data: any) => {
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          queryClient.invalidateQueries(queryKeys.viralThreads());
        }
      },
    },
  );

  const { data: selectedThread, isLoading: isLoadingSelectedThread } = useQuery(
    ["viralThread", selectedThreadId],
    () => apiClient.getViralThread({ threadId: selectedThreadId! }),
    {
      enabled: !!selectedThreadId,
      onSuccess: (data) => {
        if (data) {
          setEditedTitle((data as any).title || "");
          setEditedTweets((data as any).tweets || []);
        }
      },
    },
  );

  const psychologicalTriggers = selectedThread
    ? safeJsonParse((selectedThread as any).psychologicalTriggers)
    : null;
  const optimizationSuggestions = selectedThread
    ? safeJsonParse((selectedThread as any).optimizationSuggestions)
    : null;

  const handleGenerate = () => {
    generateThread({
      source,
      targetAudience,
      contentTone,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Start Creating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="source">
                  Keyword, URL, or Social Media Post
                </Label>
                <Textarea
                  id="source"
                  placeholder="Enter a keyword (e.g., AI automation), a YouTube/article/social media post URL, or just a simple idea..."
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Entrepreneurs, Tech enthusiasts"
                />
              </div>
              <div>
                <Label htmlFor="tone">Content Tone</Label>
                <select
                  id="tone"
                  value={contentTone}
                  onChange={(e) => setContentTone(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option>Educational</option>
                  <option>Inspirational</option>
                  <option>Humorous</option>
                  <option>Professional</option>
                  <option>Casual</option>
                </select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !source}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
              {generationStatus &&
                ((generationStatus as any).status === "PENDING" ||
                  (generationStatus as any).status === "GENERATING") && (
                  <div className="text-sm text-muted-foreground pt-2">
                    <p>Status: {(generationStatus as any).status}</p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Previously Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Input
                  placeholder="Search threads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow"
                />
                <div className="flex gap-4">
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "createdAt" | "engagementScore",
                      )
                    }
                    className="p-2 border rounded-md bg-background"
                  >
                    <option value="createdAt">Sort by Date</option>
                    <option value="engagementScore">Sort by Engagement</option>
                  </select>
                  <Input
                    placeholder="Filter by pattern..."
                    value={filterByPattern}
                    onChange={(e) => setFilterByPattern(e.target.value)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Tag className="h-4 w-4 mr-2" />
                        Filter by Tag ({selectedTagIds.length} selected)
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {tags?.map((tag) => (
                        <DropdownMenuCheckboxItem
                          key={tag.id}
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTagIds((prev) =>
                              checked
                                ? [...prev, tag.id]
                                : prev.filter((id) => id !== tag.id),
                            );
                          }}
                        >
                          {tag.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {tags && tags.length > 0 && <DropdownMenuSeparator />}
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setSelectedTagIds([])}
                        >
                          Clear selection
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {isLoadingThreads ? (
                <LoadingSpinner />
              ) : threadsData && (threadsData as any).threads.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2 border-b">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-threads"
                        checked={
                          (threadsData as any).threads.length > 0 &&
                          selectedThreadIds.length ===
                            (threadsData as any).threads.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedThreadIds(
                              (threadsData as any).threads.map(
                                (t: any) => t.id,
                              ),
                            );
                          } else {
                            setSelectedThreadIds([]);
                          }
                        }}
                      />
                      <Label
                        htmlFor="select-all-threads"
                        className="text-sm font-medium"
                      >
                        Select All
                      </Label>
                    </div>
                    {selectedThreadIds.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkHide}
                        disabled={bulkHideMutation.isLoading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Archive Selected ({selectedThreadIds.length})
                      </Button>
                    )}
                  </div>
                  <div className="max-h-[550px] overflow-y-auto space-y-4">
                    {(threadsData as any).threads.map((thread: any) => (
                      <div key={thread.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`select-thread-${thread.id}`}
                          checked={selectedThreadIds.includes(thread.id)}
                          onCheckedChange={(checked) => {
                            setSelectedThreadIds((prev) =>
                              checked
                                ? [...prev, thread.id]
                                : prev.filter((id) => id !== thread.id),
                            );
                          }}
                        />
                        <Card
                          className={`flex-grow cursor-pointer hover:bg-secondary/20 group relative ${selectedThreadId === thread.id ? "bg-secondary/20 border-primary" : ""}`}
                          onClick={() => setSelectedThreadId(thread.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold pr-8">
                                {thread.title}
                              </p>
                              {typeof thread.engagementScore === "number" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge
                                        variant="outline"
                                        className="flex-shrink-0"
                                      >
                                        <TrendingUp className="h-4 w-4 mr-1 text-primary/80" />
                                        {thread.engagementScore.toFixed(1)}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Engagement Score</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                              {thread.tweets[0]?.content}
                            </p>
                          </CardContent>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (thread.id === selectedThreadId) {
                                      setSelectedThreadId(null);
                                    }
                                    hideThread({ threadId: thread.id });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Archive thread</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={
                    debouncedSearchTerm || filterByPattern
                      ? "No threads found"
                      : "No threads generated yet"
                  }
                  description={
                    debouncedSearchTerm || filterByPattern
                      ? "No threads match your filters."
                      : "Your generated threads will appear here."
                  }
                />
              )}
            </CardContent>
          </Card>

          {selectedThreadId && (
            <Card className="mt-4">
              {isLoadingSelectedThread ? (
                <CardContent className="p-6 text-center">
                  <LoadingSpinner />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading thread...
                  </p>
                </CardContent>
              ) : !selectedThread ? (
                <CardContent className="p-6 text-center">
                  <p className="text-destructive">
                    Could not load thread details.
                  </p>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {selectedThread.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {selectedThreadId && !isEditing && (
                          <ViralThreadTagManager threadId={selectedThreadId} />
                        )}
                        {!isEditing && selectedThread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSchedulingThread(selectedThread)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                        )}
                        {!isEditing && selectedThread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                          >
                            <PenSquare className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        {!isEditing && selectedThread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setRepurposeState((prev) => ({
                                ...prev,
                                thread: selectedThread,
                                isDialogOpen: true,
                              }))
                            }
                            disabled={repurposeMutation.isLoading}
                          >
                            {repurposeMutation.isLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Repurpose
                          </Button>
                        )}
                        {!isEditing && selectedThread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              saveThreadMutation.mutate({
                                threadId: selectedThreadId,
                              })
                            }
                            disabled={saveThreadMutation.isLoading}
                          >
                            {saveThreadMutation.isLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            Save to Library
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedThreadId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                      {typeof selectedThread.engagementScore === "number" && (
                        <Badge variant="secondary">
                          Engagement Score:{" "}
                          {selectedThread.engagementScore.toFixed(1)}
                        </Badge>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {selectedThread.tags?.map(({ tag }) => (
                          <Badge key={tag.id} variant="outline">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label
                            htmlFor="thread-title-edit"
                            className="text-base font-semibold"
                          >
                            Title
                          </Label>
                          <Input
                            id="thread-title-edit"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">
                            Tweets
                          </Label>
                          {editedTweets.map((tweet, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Textarea
                                value={tweet.content}
                                onChange={(e) => {
                                  const newTweets = [...editedTweets];
                                  if (newTweets[index]) {
                                    newTweets[index]!.content = e.target.value;
                                    setEditedTweets(newTweets);
                                  }
                                }}
                                className="min-h-[100px] flex-grow"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setEditedTweets(
                                    editedTweets.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditedTweets([
                                ...editedTweets,
                                { content: "" },
                              ])
                            }
                          >
                            Add Tweet
                          </Button>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIsEditing(false);
                              setEditedTitle(selectedThread.title || "");
                              setEditedTweets(selectedThread.tweets || []);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveChanges}
                            disabled={updateThreadMutation.isLoading}
                          >
                            {updateThreadMutation.isLoading && (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="space-y-3">
                          {selectedThread.tweets.map(
                            (tweet: any, index: number) => (
                              <div
                                key={index}
                                className="p-4 bg-muted/50 rounded-lg border border-border/50 flex items-start gap-3"
                              >
                                <Avatar className="h-8 w-8 mt-1">
                                  <AvatarFallback>{index + 1}</AvatarFallback>
                                </Avatar>
                                <p className="flex-1 whitespace-pre-wrap text-sm break-all">
                                  {tweet.content}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="mt-6 space-y-4 pt-4 border-t">
                          <h4 className="text-md font-semibold">
                            Thread Insights
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Pattern</p>
                              <p className="font-medium">
                                {selectedThread.pattern}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">
                                Word Count
                              </p>
                              <p className="font-medium">
                                {selectedThread.wordCount ?? "N/A"}
                              </p>
                            </div>
                          </div>
                          {Array.isArray(psychologicalTriggers) &&
                            psychologicalTriggers.length > 0 && (
                              <div className="space-y-1 mt-4">
                                <p className="text-muted-foreground">
                                  Psychological Triggers
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {psychologicalTriggers.map(
                                    (trigger: string, i: number) => (
                                      <Badge key={i} variant="outline">
                                        {trigger}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          {Array.isArray(optimizationSuggestions) &&
                            optimizationSuggestions.length > 0 && (
                              <div className="mt-4">
                                <Accordion type="single" collapsible>
                                  <AccordionItem value="item-1">
                                    <AccordionTrigger>
                                      Optimization Suggestions
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <ul className="list-disc list-inside text-sm space-y-1">
                                        {optimizationSuggestions.map(
                                          (suggestion: string, i: number) => (
                                            <li key={i}>{suggestion}</li>
                                          ),
                                        )}
                                      </ul>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
      {repurposeState.isDialogOpen && (
        <RepurposeThreadDialog
          isOpen={repurposeState.isDialogOpen}
          onOpenChange={(isOpen) =>
            setRepurposeState((prev) => ({
              ...prev,
              isDialogOpen: isOpen,
              thread: null,
            }))
          }
          threadId={repurposeState.thread.id}
          onRepurpose={(input) => {
            repurposeMutation.mutate({
              threadId: input.threadId,
              platform: input.platform,
            });
          }}
        />
      )}
      {schedulingThread && (
        <SchedulePostDialog
          isOpen={!!schedulingThread}
          onOpenChange={() => setSchedulingThread(null)}
          item={schedulingThread}
          sourceType="VIRAL_THREAD"
          onSchedule={(data) =>
            schedulePostMutation.mutate({
              ...data,
              imageUrl: undefined,
            })
          }
          isScheduling={schedulePostMutation.isLoading}
        />
      )}
    </>
  );
}

function CreatePage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "generatedContent",
  );
  const [highlightedPillar, setHighlightedPillar] = useState<string | null>(
    null,
  );
  const [inlinePreviewContentId, setInlinePreviewContentId] = useState<
    string | null
  >(null);

  const handleImageGenerated = (pillarId: string) => {
    setActiveTab("generatedContent");
    setHighlightedPillar(pillarId);
  };

  const handleVideoGenerated = () => {
    setActiveTab("generatedContent");
    setHighlightedPillar(null);
  };

  const handleContentGenerated = () => {
    setActiveTab("generatedContent");
    setHighlightedPillar(null); // Don't highlight any specific pillar
  };

  return (
    <div>
      <MetaTags
        title="Create | SocialWave"
        description="Generate viral threads, images, and videos with AI. Manage your content library and schedule posts across all platforms."
        keywords="AI content generator, social media scheduler, content library, image generation, video scriptwriting"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Create | SocialWave",
          description:
            "Generate viral threads, images, and videos with AI, and manage your content library.",
        }}
      />
      <h1 className="text-3xl font-bold mb-2 gradient-text">Create</h1>
      <p className="text-muted-foreground text-lg mb-8">
        Generate content ideas, captions, and images tailored to your brand.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="generatedContent">Generated Content</TabsTrigger>
          <TabsTrigger value="image">Image Generation</TabsTrigger>
          <TabsTrigger value="video">Video Generation</TabsTrigger>
          <TabsTrigger value="viralThreads">Viral Threads</TabsTrigger>

          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "generatedContent" && (
        <GeneratedContentTab
          highlightedPillarId={highlightedPillar}
          inlinePreviewContentId={inlinePreviewContentId}
          onPreviewClose={() => setInlinePreviewContentId(null)}
        />
      )}
      {activeTab === "image" && (
        <ImageGenerationTab onImageGenerated={handleImageGenerated} />
      )}
      {activeTab === "video" && (
        <VideoGenerationTab onVideoGenerated={handleVideoGenerated} />
      )}
      {activeTab === "viralThreads" && (
        <ViralThreadsTab onContentGenerated={handleContentGenerated} />
      )}

      {activeTab === "scheduler" && <SchedulerPage />}
    </div>
  );
}

type GeneratedContent = inferRPCOutputType<"listGeneratedContent">[number];

function GeneratedContentCard({ item }: { item: GeneratedContent }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedContent, setEditedContent] = useState(item.content);
  const [isScheduling, setIsScheduling] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: itemStatus } = useQuery({
    queryKey: ["generatedContentStatus", item.id],
    queryFn: () => apiClient.getGeneratedContentStatus({ contentId: item.id }),
    enabled: item.status === "PENDING" || item.status === "GENERATING",
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (itemStatus && itemStatus.status !== item.status) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.generatedContent(item.pillarId),
      });
    }
  }, [itemStatus, item.status, item.pillarId, queryClient]);

  const updateMutation = useMutation({
    mutationFn: apiClient.updateGeneratedContent,
    onSuccess: () => {
      toast({ title: "Content updated!" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.generatedContent(item.pillarId),
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update content",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const schedulePostMutation = useMutation({
    mutationFn: apiClient.schedulePost,
    onSuccess: () => {
      toast({ title: "Content scheduled successfully!" });
      setIsScheduling(false);
      queryClient.invalidateQueries(queryKeys.scheduledPosts());
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule content",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteGeneratedContent,
    onSuccess: () => {
      toast({ title: "Content deleted" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.generatedContent(item.pillarId),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: apiClient.retryVideoGeneration,
    onSuccess: () => {
      toast({ title: "Retrying video generation..." });
      queryClient.invalidateQueries({
        queryKey: queryKeys.generatedContent(item.pillarId),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to retry generation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setThumbnailMutation = useMutation({
    mutationFn: apiClient.setCustomContentThumbnail,
    onSuccess: () => {
      toast({ title: "Custom thumbnail uploaded successfully!" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.generatedContent(item.pillarId),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload thumbnail",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleThumbnailUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const thumbnailBase64 = await encodeFileAsBase64DataURL(file);
      if (thumbnailBase64) {
        setThumbnailMutation.mutate({ contentId: item.id, thumbnailBase64 });
      }
    } catch (uploadError: any) {
      console.error("Thumbnail upload error:", uploadError);
      toast({
        title: "Error reading file",
        description: "Could not process the selected image file.",
        variant: "destructive",
      });
    }
  };

  const currentStatus = itemStatus?.status || item.status;
  const contentUrl = itemStatus?.content || item.content;
  const customThumbnailUrl =
    itemStatus?.customThumbnailUrl || item.customThumbnailUrl;
  const thumbnailUrl = itemStatus?.thumbnailUrl || item.thumbnailUrl;
  const displayThumbnail = customThumbnailUrl || thumbnailUrl;

  if (item.status === "GENERATING" || currentStatus === "GENERATING") {
    return (
      <Card className="overflow-hidden animate-pulse">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Content is being generated...</span>
          </div>
          <Skeleton className="h-20 w-full mt-2" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-1/4" />
        </CardFooter>
      </Card>
    );
  }

  if (item.status === "FAILED") {
    return (
      <Card className="overflow-hidden border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Generation Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground bg-destructive/20 p-3 rounded-md">
            {item.content}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Failed on {formatDate(item.updatedAt)}
          </p>
          {item.type === "VIDEO" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => retryMutation.mutate({ contentId: item.id })}
              disabled={retryMutation.isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  const handleSave = () => {
    const data: {
      contentId: string;
      title: string;
      content?: string;
    } = {
      contentId: item.id,
      title: editedTitle,
    };
    if (item.type === "TEXT") {
      data.content = editedContent;
    }
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(item.title);
    setEditedContent(item.content);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-start">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="font-bold text-lg"
              />
            ) : (
              <CardTitle>{item.title}</CardTitle>
            )}
            <Badge variant="outline" className="w-fit">
              {item.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing && item.type === "TEXT" ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[150px]"
            />
          ) : item.type === "IMAGE" ? (
            <img
              src={item.content}
              alt={item.title}
              className="rounded-lg border max-w-full h-auto"
            />
          ) : item.type === "VIDEO" ? (
            <div className="aspect-video bg-secondary flex items-center justify-center relative">
              {currentStatus === "DRAFT" && contentUrl && displayThumbnail ? (
                <a
                  href={contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full relative group"
                >
                  <img
                    src={displayThumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Youtube className="h-12 w-12 text-white" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleThumbnailUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                    disabled={setThumbnailMutation.isLoading}
                  >
                    {setThumbnailMutation.isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </a>
              ) : (
                <div className="text-center p-4">
                  {currentStatus === "PENDING" && (
                    <>
                      <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm font-semibold">Pending...</p>
                    </>
                  )}
                  {currentStatus === "GENERATING" && (
                    <>
                      <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="mt-2 text-sm font-semibold">
                        Generating...
                      </p>
                    </>
                  )}
                  {currentStatus === "FAILED" && (
                    <>
                      <XCircle className="h-8 w-8 mx-auto text-destructive" />
                      <p className="mt-2 text-sm font-semibold text-destructive">
                        Failed
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {item.content}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Generated on {formatDate(item.createdAt)}
            </p>
            <Badge
              variant={
                currentStatus === "DRAFT"
                  ? "default"
                  : currentStatus === "FAILED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {currentStatus}
            </Badge>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={updateMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <>
                <TagManager content={item} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {currentStatus === "FAILED" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => retryMutation.mutate({ contentId: item.id })}
                    disabled={retryMutation.isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
                {currentStatus === "DRAFT" && contentUrl && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsScheduling(true)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        copy(contentUrl);
                        toast({ title: "Content link copied to clipboard!" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    {item.type === "VIDEO" && (
                      <a
                        href={contentUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    )}
                  </>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate({ contentId: item.id })}
                  disabled={deleteMutation.isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
      {isScheduling && (
        <SchedulePostDialog
          isOpen={isScheduling}
          onOpenChange={setIsScheduling}
          item={item}
          sourceType="GENERATED_CONTENT"
          onSchedule={schedulePostMutation.mutate}
          isScheduling={schedulePostMutation.isLoading}
        />
      )}
    </>
  );
}

function InlineContentPreview({
  contentId,
  onClose,
}: {
  contentId: string | null;
  onClose?: () => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: contentItem,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["generatedContentStatus", contentId],
    queryFn: () =>
      apiClient.getGeneratedContentStatus({ contentId: contentId! }),
    enabled: !!contentId,
    refetchInterval: (data) =>
      data?.status === "GENERATING" || data?.status === "PENDING"
        ? 2000
        : false,
    onSuccess: (data) => {
      if (data && (data.status === "DRAFT" || data.status === "FAILED")) {
        queryClient.invalidateQueries(
          queryKeys.generatedContent(data.pillarId),
        );
      }
    },
  });

  const [isScheduling, setIsScheduling] = useState(false);

  const schedulePostMutation = useMutation(apiClient.schedulePost, {
    onSuccess: () => {
      toast({ title: "Content scheduled successfully!" });
      setIsScheduling(false);
      if (onClose) onClose();
      queryClient.invalidateQueries(queryKeys.scheduledPosts());
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule content",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
      setIsScheduling(false);
    },
  });

  const handleEdit = () => {
    navigate("/create");
    if (onClose) onClose();
  };

  const renderContent = () => {
    if (
      isLoading ||
      !contentItem ||
      contentItem.status === "GENERATING" ||
      contentItem.status === "PENDING"
    ) {
      return (
        <div className="text-center p-8 space-y-4">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Generating your content...</p>
        </div>
      );
    }

    if (isError || contentItem.status === "FAILED") {
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Generation Failed</AlertTitle>
          <AlertDescription>
            {contentItem?.content || "An error occurred."}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{contentItem.title}</h3>
          <Badge variant="outline">{contentItem.type}</Badge>
        </div>
        <div className="border rounded-lg p-4">
          {contentItem.type === "IMAGE" ? (
            <img
              src={contentItem.content}
              alt={contentItem.title}
              className="rounded-lg border max-w-full h-auto"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  p: ({ children }) => (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                      {children}
                    </p>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-semibold mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-md font-semibold mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold mb-1">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-muted-foreground mb-1">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {contentItem.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Content Generated!</CardTitle>
          <CardDescription>
            Here's a preview of your new content. You can edit it further in the
            Content Hub or schedule it to be posted.
          </CardDescription>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renderContent()}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit in Content Hub
            </Button>
            <Button
              onClick={() => setIsScheduling(true)}
              disabled={!contentItem || contentItem.status !== "DRAFT"}
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </div>
      </CardContent>

      {contentItem && (
        <SchedulePostDialog
          isOpen={isScheduling}
          onOpenChange={setIsScheduling}
          item={contentItem}
          sourceType="GENERATED_CONTENT"
          onSchedule={(data) => {
            let content = contentItem.content;
            if (contentItem.type === "IMAGE") {
              content = `${contentItem.title}`;
            }
            schedulePostMutation.mutate({
              ...data,
              content,
              imageUrl:
                contentItem.type === "IMAGE" ? contentItem.content : undefined,
            });
          }}
          isScheduling={schedulePostMutation.isLoading}
        />
      )}
    </Card>
  );
}

function GeneratedContentTab({
  highlightedPillarId,
  inlinePreviewContentId,
  onPreviewClose,
}: {
  highlightedPillarId: string | null;
  inlinePreviewContentId?: string | null;
  onPreviewClose?: () => void;
}) {
  const {
    data: pillars,
    isLoading: isLoadingPillars,
    isError: isErrorPillars,
  } = useContentPillars();
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedPillarId) {
      setSelectedPillarId(highlightedPillarId);
    } else if (pillars && pillars.length > 0 && !selectedPillarId) {
      setSelectedPillarId(pillars[0]!.id);
    }
  }, [pillars, selectedPillarId, highlightedPillarId]);

  const {
    data: generatedContent,
    isLoading: isLoadingContent,
    isError: isErrorContent,
  } = useGeneratedContent(selectedPillarId || undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
        <CardDescription>
          Content generated from your recommendations, organized by pillar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <h4 className="font-semibold mb-2">Content Pillars</h4>
            {isLoadingPillars ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : isErrorPillars ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Could not load content pillars.
                </AlertDescription>
              </Alert>
            ) : pillars && pillars.length > 0 ? (
              <div className="flex flex-col space-y-2">
                {pillars.map((pillar) => (
                  <Button
                    key={pillar.id}
                    variant={
                      selectedPillarId === pillar.id ? "secondary" : "ghost"
                    }
                    className="justify-start"
                    onClick={() => setSelectedPillarId(pillar.id)}
                  >
                    {pillar.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground break-words">
                No content pillars found. Start by generating content from the
                Strategy Hub.
              </p>
            )}
          </div>
          <div className="md:col-span-3">
            {/* Inline Preview for New Content */}
            {inlinePreviewContentId && (
              <InlineContentPreview
                contentId={inlinePreviewContentId}
                onClose={onPreviewClose}
              />
            )}

            {isLoadingContent ? (
              <LoadingSpinner />
            ) : isErrorContent ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Could not load content for this pillar.
                </AlertDescription>
              </Alert>
            ) : generatedContent && generatedContent.length > 0 ? (
              <div className="space-y-4">
                {generatedContent.map((item) => (
                  <GeneratedContentCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<PenSquare className="h-12 w-12" />}
                title="No Content Yet"
                description="No content has been generated for this pillar. Generate some from the Strategy Hub!"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImageGenerationTab({
  onImageGenerated,
}: {
  onImageGenerated: (pillarId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  // Removed unused upgrade dialog state
  const { toast } = useToast();

  const generateImageMutation = useMutation({
    mutationFn: (prompt: string) =>
      apiClient.generateImageFromPrompt({
        prompt,
      }),
    onSuccess: (data: inferRPCOutputType<"generateImageFromPrompt">) => {
      toast({
        title: "Image Generated Successfully!",
        description:
          "Your new image has been added to the Generated Content library.",
      });
      onImageGenerated(data.pillarId); // Notify parent to switch tab
    },
    onError: (error: Error) => {
      if (
        error.message?.includes("credit") ||
        error.message?.includes("insufficient")
      ) {
        // setUpgradeDialogOpen(true); // Removed upgrade dialog
      } else {
        toast({
          title: "Failed to generate image",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    },
  });

  const handleGenerate = () => {
    if (prompt) {
      generateImageMutation.mutate(prompt);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Image Generation</CardTitle>
        <CardDescription>
          Create stunning images for your social media posts with a simple text
          prompt. Generated images will be added to your "Generated Content"
          library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="image-prompt">Image Prompt</Label>
          <Textarea
            id="image-prompt"
            placeholder="e.g., A futuristic cityscape at sunset, with flying cars and neon lights"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateImageMutation.isLoading || !prompt}
        >
          {generateImageMutation.isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate & Add to Library
        </Button>
        {generateImageMutation.isLoading && (
          <div className="flex justify-center items-center p-8">
            <LoadingSpinner />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VideoGenerationTab({
  onVideoGenerated,
}: {
  onVideoGenerated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  // Removed unused upgrade dialog state
  const { toast } = useToast();

  const generateVideoMutation = useMutation({
    mutationFn: apiClient.generateVideoFromScript,
    onSuccess: () => {
      toast({
        title: "Video Generation Started!",
        description:
          "Your new video is being generated and will be available in the Generated Content library.",
      });
      onVideoGenerated(); // Notify parent to switch tab
    },
    onError: (error: Error) => {
      if (
        error.message.includes("credit") ||
        error.message.includes("insufficient")
      ) {
        // setUpgradeDialogOpen(true); // Removed upgrade dialog
      } else {
        toast({
          title: "Failed to generate video",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    },
  });

  const handleGenerate = () => {
    if (title && script) {
      generateVideoMutation.mutate({ title, script });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Video Generation</CardTitle>
        <CardDescription>
          Create engaging videos from a script. Generated videos will be added
          to your "Generated Content" library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="video-title">Video Title</Label>
          <Input
            id="video-title"
            placeholder="e.g., How to improve your social media engagement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="video-script">Video Script</Label>
          <Textarea
            id="video-script"
            placeholder="Enter your video script here..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="min-h-[200px]"
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateVideoMutation.isLoading || !title || !script}
        >
          {generateVideoMutation.isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate & Add to Library
        </Button>
      </CardContent>
    </Card>
  );
}

function TagManager({ content }: { content: GeneratedContent }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");

  const { data: allTags } = useQuery(
    ["contentTags"],
    apiClient.listContentTags,
  );

  const addTagMutation = useMutation(apiClient.addTagToContent, {
    onSuccess: (_, variables) => {
      const tagName = allTags?.find((t) => t.id === variables.tagId)?.name;
      toast({ title: `Tag "${tagName || "New"}" applied` });
      queryClient.invalidateQueries({
        queryKey: ["generatedContent", content.pillarId],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTagMutation = useMutation(apiClient.removeTagFromContent, {
    onSuccess: (_, variables) => {
      const tagName = allTags?.find((t) => t.id === variables.tagId)?.name;
      toast({ title: `Tag "${tagName || "New"}" removed` });
      queryClient.invalidateQueries({
        queryKey: ["generatedContent", content.pillarId],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTagMutation = useMutation(apiClient.createContentTag, {
    onSuccess: (newTagData) => {
      toast({ title: `Tag "${newTagData.name}" created.` });
      queryClient.invalidateQueries({ queryKey: queryKeys.contentTags() });
      addTagMutation.mutate({ contentId: content.id, tagId: newTagData.id });
      setNewTag("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const contentTagIds = new Set(content.tags.map((t) => t.tagId));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Tag className="h-4 w-4 mr-2" />
          Tags
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Apply Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-40 overflow-y-auto px-1">
          {allTags?.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={contentTagIds.has(tag.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  addTagMutation.mutate({
                    contentId: content.id,
                    tagId: tag.id,
                  });
                } else {
                  removeTagMutation.mutate({
                    contentId: content.id,
                    tagId: tag.id,
                  });
                }
              }}
            >
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Input
            placeholder="Create new tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTag.trim()) {
                createTagMutation.mutate({ name: newTag.trim() });
              }
            }}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DiscoverOverview({
  smartRecommendations,
  onNavigate,
  searchQuery,
}: DiscoverOverviewProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredRecommendations = smartRecommendations.filter(
    (rec) =>
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={`space-y-6 ${isMobile ? "space-y-4" : "space-y-6"}`}>
      {/* Hero Section - Mobile Optimized */}
      <div
        className={`relative bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-xl ${isMobile ? "p-4" : "p-6"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2
              className={`font-bold text-foreground mb-2 ${isMobile ? "text-xl" : "text-2xl"}`}
            >
              Discover Intelligence
            </h2>
            <p
              className={`text-muted-foreground ${isMobile ? "text-sm max-w-xs" : "max-w-md"}`}
            >
              {isMobile
                ? "AI insights tailored to your brand's goals."
                : "AI-powered insights and recommendations tailored to your brand's unique voice and goals."}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Recommendations Grid - Enhanced Mobile Layout */}
      <div
        className={`grid gap-3 ${isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"} ${isMobile ? "gap-3" : "gap-4"}`}
      >
        {filteredRecommendations.map((rec) => {
          const IconComponent = rec.icon;
          const priorityColors = {
            high: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
            medium:
              "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
            low: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
          };

          return (
            <Card
              key={rec.id}
              className={`group cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary bg-gradient-to-r from-background to-background/50 backdrop-blur-sm ${isMobile ? "hover:shadow-md active:scale-[0.98]" : "hover:scale-[1.02]"}`}
              onClick={rec.action}
            >
              <CardContent className={isMobile ? "p-4" : "p-6"}>
                <div
                  className={`flex items-start justify-between ${isMobile ? "mb-3" : "mb-4"}`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors ${isMobile ? "w-8 h-8" : "w-10 h-10"}`}
                    >
                      <IconComponent
                        className={`text-primary ${isMobile ? "h-4 w-4" : "h-5 w-5"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold text-foreground group-hover:text-primary transition-colors truncate ${isMobile ? "text-sm" : "text-base"}`}
                      >
                        {rec.title}
                      </h3>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs flex-shrink-0 ml-2 ${priorityColors[rec.priority]} ${isMobile ? "px-1.5 py-0.5" : "px-2 py-1"}`}
                  >
                    {rec.priority}
                  </Badge>
                </div>
                <p
                  className={`text-muted-foreground ${isMobile ? "text-xs mb-3 line-clamp-2" : "text-sm mb-4"}`}
                >
                  {rec.description}
                </p>
                <div
                  className={`flex items-center text-primary group-hover:text-primary/80 transition-colors ${isMobile ? "text-xs" : "text-sm"}`}
                >
                  <span className="font-medium">Explore now</span>
                  <ArrowRight
                    className={`ml-1 group-hover:translate-x-1 transition-transform ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions - Mobile Optimized Grid */}
      <div
        className={`grid gap-3 ${isMobile ? "grid-cols-2" : "md:grid-cols-4"}`}
      >
        <Button
          variant="outline"
          className={`flex-col space-y-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group ${isMobile ? "h-16" : "h-20"}`}
          onClick={() => onNavigate("insights-topics")}
        >
          <TrendingUp
            className={`text-primary group-hover:scale-110 transition-transform ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
          />
          <span className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
            Trending Topics
          </span>
        </Button>
        <Button
          variant="outline"
          className={`flex-col space-y-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group ${isMobile ? "h-16" : "h-20"}`}
          onClick={() => onNavigate("content-discovery")}
        >
          <Calendar
            className={`text-primary group-hover:scale-110 transition-transform ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
          />
          <span className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
            Content Strategy
          </span>
        </Button>
        <Button
          variant="outline"
          className={`flex-col space-y-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group ${isMobile ? "h-16" : "h-20"}`}
          onClick={() => onNavigate("insights-viral")}
        >
          <Zap
            className={`text-primary group-hover:scale-110 transition-transform ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
          />
          <span className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
            Viral Potential
          </span>
        </Button>
        <Button
          variant="outline"
          className={`flex-col space-y-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group ${isMobile ? "h-16" : "h-20"}`}
          onClick={() => onNavigate("analytics")}
        >
          <BarChart3
            className={`text-primary group-hover:scale-110 transition-transform ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
          />
          <span className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
            Analytics
          </span>
        </Button>
      </div>

      {searchQuery && filteredRecommendations.length === 0 && (
        <div className={`text-center ${isMobile ? "py-8" : "py-12"}`}>
          <Search
            className={`text-muted-foreground mx-auto mb-4 ${isMobile ? "h-8 w-8" : "h-12 w-12"}`}
          />
          <h3
            className={`font-semibold text-foreground mb-2 ${isMobile ? "text-base" : "text-lg"}`}
          >
            No results found
          </h3>
          <p
            className={`text-muted-foreground ${isMobile ? "text-sm px-4" : "text-base"}`}
          >
            {isMobile
              ? "Try different search terms or explore recommendations above."
              : "Try adjusting your search terms or explore our recommendations above."}
          </p>
        </div>
      )}
    </div>
  );
}

function DiscoverPage() {
  const location = useLocation();
  const [activeView, setActiveView] = useState(
    location.state?.activeTab || "overview",
  );
  const [previewContentId, setPreviewContentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewHistory, setViewHistory] = useState<string[]>(["overview"]);
  const [isContextSidebarOpen, setIsContextSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [quickFilters, setQuickFilters] = useState<DiscoverFilters>(() => {
    // Load filters from localStorage for persistence
    try {
      const saved = localStorage.getItem("discover-filters");
      return saved
        ? (JSON.parse(saved) as DiscoverFilters)
        : {
            timeframe: "week" as const,
            priority: "all" as const,
            type: "all" as const,
          };
    } catch {
      return {
        timeframe: "week" as const,
        priority: "all" as const,
        type: "all" as const,
      };
    }
  });

  // Smart navigation based on user context and data availability
  const { data: insights } = useQuery<any>(
    ["advancedInsights", null],
    () => apiClient.getAdvancedInsights({ pageId: undefined }),
    { staleTime: 300000 }, // 5 minutes
  );

  const { data: contentStrategy } = useQuery(
    ["contentStrategy"],
    () => apiClient.generateContentStrategy(),
    { staleTime: 300000 },
  );

  // Responsive breakpoint handling
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);

      // Auto-close sidebar on mobile when switching views
      if (width < 768 && isContextSidebarOpen) {
        setIsContextSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isContextSidebarOpen]);

  // Touch gesture handling for mobile navigation
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        setTouchStartX(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartX || !e.changedTouches || !e.changedTouches[0]) return;

      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      // Swipe threshold
      if (Math.abs(diff) > 100) {
        if (diff > 0) {
          // Swipe left - next view
          const views = [
            "overview",
            "insights",
            "content-discovery",
            "analytics",
          ];
          const currentIndex = views.indexOf(activeView);
          if (currentIndex < views.length - 1) {
            setActiveView(views[currentIndex + 1]);
          }
        } else {
          // Swipe right - previous view
          const views = [
            "overview",
            "insights",
            "content-discovery",
            "analytics",
          ];
          const currentIndex = views.indexOf(activeView);
          if (currentIndex > 0) {
            setActiveView(views[currentIndex - 1]);
          }
        }
      }

      setTouchStartX(null);
    };

    if (isMobile) {
      document.addEventListener("touchstart", handleTouchStart);
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [touchStartX, activeView, isMobile]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem("discover-filters", JSON.stringify(quickFilters));
  }, [quickFilters]);

  // Smart search suggestions based on available content and user behavior
  useEffect(() => {
    if (searchQuery.length > 1) {
      // Dynamic suggestions based on current data and user context
      const baseSuggestions = [
        "trending topics",
        "viral content",
        "brand insights",
        "content strategy",
        "engagement analytics",
        "audience insights",
        "performance metrics",
        "social media trends",
      ];

      // Add contextual suggestions based on current view
      const contextualSuggestions: string[] = [];
      if (activeView.startsWith("insights")) {
        contextualSuggestions.push(
          "trending hashtags",
          "viral posts",
          "competitor analysis",
        );
      } else if (activeView === "content-discovery") {
        contextualSuggestions.push(
          "content calendar",
          "post ideas",
          "content pillars",
        );
      } else if (activeView === "analytics") {
        contextualSuggestions.push(
          "engagement rates",
          "reach metrics",
          "growth trends",
        );
      }

      // Add smart suggestions based on available data
      if (insights?.trendingTopics?.length > 0) {
        contextualSuggestions.push(
          `${insights.trendingTopics.length} trending topics`,
        );
      }
      if (insights?.viralContentPotential?.length > 0) {
        contextualSuggestions.push(
          `${insights.viralContentPotential.length} viral opportunities`,
        );
      }

      const allSuggestions = [
        ...baseSuggestions,
        ...contextualSuggestions,
      ].filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      setSearchSuggestions(allSuggestions.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, activeView, insights]);

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "k":
            e.preventDefault();
            document.getElementById("discover-search")?.focus();
            break;
          case "1":
            e.preventDefault();
            handleViewChange("overview");
            break;
          case "2":
            e.preventDefault();
            handleViewChange("insights");
            break;
          case "3":
            e.preventDefault();
            handleViewChange("content-discovery");
            break;
          case "4":
            e.preventDefault();
            handleViewChange("analytics");
            break;
          case "b":
            e.preventDefault();
            goBack();
            break;
          case "/":
            e.preventDefault();
            setIsContextSidebarOpen(!isContextSidebarOpen);
            break;
        }
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setPreviewContentId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, isContextSidebarOpen]);

  // Smart view change with history tracking
  const handleViewChange = (newView: string) => {
    setActiveView(newView);
    setViewHistory((prev) => {
      const newHistory = [...prev];
      if (newHistory[newHistory.length - 1] !== newView) {
        newHistory.push(newView);
        // Keep only last 10 views
        return newHistory.slice(-10);
      }
      return newHistory;
    });
  };

  // Navigation helpers
  const goBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];
      setActiveView(previousView);
      setViewHistory(newHistory);
    }
  };

  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{ label: string; view: string }> = [];
    const viewNames: Record<string, string> = {
      overview: "Overview",
      insights: "AI Insights",
      "insights-topics": "Trending Topics",
      "insights-viral": "Viral Opportunities",
      "insights-audience": "Audience Insights",
      "content-discovery": "Content Strategy",
      analytics: "Performance Analytics",
    };

    if (activeView !== "overview") {
      breadcrumbs.push({ label: "Overview", view: "overview" });
    }

    if (activeView.includes("-")) {
      const parentView = activeView.split("-")[0];
      if (parentView !== "overview") {
        breadcrumbs.push({
          label: viewNames[parentView] || parentView,
          view: parentView,
        });
      }
    }

    breadcrumbs.push({
      label: viewNames[activeView] || activeView,
      view: activeView,
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const subTab = location.state?.subTab;
  const highlightedItemId = location.state?.highlightedItemId;

  // Intelligent view recommendations based on available data
  const getSmartRecommendations = (): SmartRecommendation[] => {
    const recs: SmartRecommendation[] = [];
    if (insights?.trendingTopics?.length > 0) {
      recs.push({
        id: "trending",
        title: "Hot Topics",
        description: `${insights.trendingTopics.length} trending topics detected`,
        icon: TrendingUp,
        priority: "high",
        action: () => setActiveView("insights-topics"),
      });
    }
    if (
      contentStrategy &&
      "calendar" in contentStrategy &&
      contentStrategy.calendar?.length > 0
    ) {
      recs.push({
        id: "strategy",
        title: "Content Strategy",
        description: "7-day content calendar ready",
        icon: Calendar,
        priority: "high",
        action: () => setActiveView("content-discovery"),
      });
    }
    if (insights?.viralContentPotential?.length > 0) {
      recs.push({
        id: "viral",
        title: "Viral Opportunities",
        description: `${insights.viralContentPotential.length} high-potential posts found`,
        icon: Zap,
        priority: "medium",
        action: () => setActiveView("insights-viral"),
      });
    }
    return recs;
  };

  const smartRecs = getSmartRecommendations();

  return (
    <div className="space-y-6">
      <MetaTags
        title="Discover | SocialWave"
        description="Uncover viral trends, get AI-powered content recommendations, and develop your content strategy with SocialWave's Discover hub."
        keywords="content strategy, viral marketing, trend analysis, social media insights, AI recommendations"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Discover | SocialWave",
          description:
            "Uncover viral trends, get AI-powered content recommendations, and develop your content strategy.",
        }}
      />

      {/* Sophisticated Header with Breadcrumb Navigation */}
      <div className="space-y-4">
        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 1 && (
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.view} className="flex items-center space-x-2">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                <button
                  onClick={() => handleViewChange(crumb.view)}
                  className={`hover:text-foreground transition-colors ${
                    index === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "hover:underline"
                  }`}
                >
                  {crumb.label}
                </button>
              </div>
            ))}
          </nav>
        )}

        {/* Header with Context Actions - Mobile Optimized */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1
                  className={`font-bold gradient-text ${isMobile ? "text-2xl" : "text-3xl"}`}
                >
                  Discover
                </h1>
                {viewHistory.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBack}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {!isMobile && <span className="ml-1">Back</span>}
                  </Button>
                )}
              </div>
              {/* Mobile Context Button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsContextSidebarOpen(!isContextSidebarOpen)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p
              className={`text-muted-foreground ${isMobile ? "text-sm" : "text-base"}`}
            >
              {isMobile
                ? "AI insights & strategy"
                : "AI-powered insights and content strategy at your fingertips"}
            </p>
            {/* Keyboard shortcuts hint - Desktop only */}
            {!isMobile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Keyboard className="h-3 w-3" />
                <span>Press</span>
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd>
                <span>to search,</span>
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘B</kbd>
                <span>to go back</span>
              </div>
            )}
          </div>

          {/* Smart Action Bar with Enhanced Search - Mobile Optimized */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Mobile Search */}
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="discover-search"
                placeholder={
                  isMobile
                    ? "Search..."
                    : "Search insights, trends, content... (⌘K)"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(searchQuery.length > 1)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className={`pl-10 bg-background/50 border-border/50 ${isMobile ? "w-full" : "w-72"}`}
              />
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      <Search className="h-3 w-3 mr-2 inline text-muted-foreground" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Filter Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  className={isMobile ? "px-3" : ""}
                >
                  <Filter className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Filters</span>}
                  {/* Active filters indicator */}
                  {(quickFilters.timeframe !== "week" ||
                    quickFilters.priority !== "all" ||
                    quickFilters.type !== "all") && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`${isMobile ? "w-80 max-w-[calc(100vw-2rem)]" : "w-56"}`}
              >
                <div className="p-3">
                  <div className="mb-4">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                      Timeframe
                    </Label>
                    <div className="flex gap-1">
                      {["today", "week", "month"].map((period) => (
                        <Button
                          key={period}
                          variant={
                            quickFilters.timeframe === period
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              timeframe: period as any,
                            }))
                          }
                        >
                          {period === "today"
                            ? "Today"
                            : period === "week"
                              ? "Week"
                              : "Month"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                      Priority
                    </Label>
                    <div className="grid grid-cols-2 gap-1">
                      {["all", "high", "medium", "low"].map((priority) => (
                        <Button
                          key={priority}
                          variant={
                            quickFilters.priority === priority
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="text-xs h-8"
                          onClick={() =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              priority: priority as any,
                            }))
                          }
                        >
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                      Content Type
                    </Label>
                    <div className="grid grid-cols-2 gap-1">
                      {["all", "trends", "content", "insights"].map((type) => (
                        <Button
                          key={type}
                          variant={
                            quickFilters.type === type ? "default" : "outline"
                          }
                          size="sm"
                          className="text-xs h-8"
                          onClick={() =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              type: type as any,
                            }))
                          }
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Clear filters button for mobile */}
                  {isMobile &&
                    (quickFilters.timeframe !== "week" ||
                      quickFilters.priority !== "all" ||
                      quickFilters.type !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setQuickFilters({
                            timeframe: "week",
                            priority: "all",
                            type: "all",
                          })
                        }
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all filters
                      </Button>
                    )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Smart Navigation with Progressive Disclosure - Mobile Optimized */}
      <div className="border-b border-border/40">
        {/* Mobile Tab Navigation */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="flex items-center space-x-2 flex-1">
              {[
                { id: "overview", icon: LayoutDashboard, label: "Overview" },
                {
                  id: "insights",
                  icon: Brain,
                  label: "Insights",
                  badge: smartRecs.length > 0 ? smartRecs.length : undefined,
                },
                { id: "content-discovery", icon: Sparkles, label: "Strategy" },
                { id: "analytics", icon: BarChart3, label: "Analytics" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeView.startsWith(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex flex-col items-center justify-center min-w-0 flex-1 py-3 px-2 rounded-lg transition-all duration-200 relative ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5 mb-1" />
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-destructive-foreground leading-none">
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium truncate max-w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav
          className="hidden md:flex space-x-8 overflow-x-auto pb-3"
          role="tablist"
        >
          {[
            {
              id: "overview",
              label: "Overview",
              icon: LayoutDashboard,
              description: "Your personalized dashboard",
            },
            {
              id: "insights",
              label: "AI Insights",
              icon: Brain,
              description: "Trending topics & viral opportunities",
              badge: smartRecs.length > 0 ? smartRecs.length : undefined,
            },
            {
              id: "content-discovery",
              label: "Content Strategy",
              icon: Sparkles,
              description: "AI-generated content calendar",
            },
            {
              id: "analytics",
              label: "Performance",
              icon: BarChart3,
              description: "Deep-dive analytics",
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeView.startsWith(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-all duration-200 whitespace-nowrap group relative ${
                  isActive
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary"
                  >
                    {item.badge}
                  </Badge>
                )}

                {/* Enhanced tooltip with contextual information */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-lg border opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap max-w-xs">
                  <div className="font-medium mb-1">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                  {item.badge && (
                    <div className="text-xs text-primary font-medium mt-1">
                      {item.badge} new items
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 opacity-75">
                    Press ⌘
                    {item.id === "overview"
                      ? "1"
                      : item.id === "insights"
                        ? "2"
                        : item.id === "content-discovery"
                          ? "3"
                          : "4"}{" "}
                    to navigate
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dynamic Content Area with Smart Layouts and Context Sidebar */}
      <div className="flex gap-6">
        {/* Main Content Area */}
        <div
          className={`transition-all duration-300 ${isContextSidebarOpen ? "flex-1" : "w-full"} min-h-[600px]`}
        >
          {activeView === "overview" && (
            <DiscoverOverview
              smartRecommendations={smartRecs}
              onNavigate={setActiveView}
              searchQuery={searchQuery}
              filters={quickFilters}
            />
          )}

          {activeView === "insights" && (
            <InsightsTab
              setPreviewContentId={setPreviewContentId}
              initialSubTab={subTab}
              highlightedItemId={highlightedItemId}
            />
          )}

          {activeView.startsWith("insights-") && (
            <InsightsTab
              setPreviewContentId={setPreviewContentId}
              initialSubTab={
                activeView.split("-")[1] as "topics" | "viral" | "audience"
              }
              highlightedItemId={highlightedItemId}
            />
          )}

          {activeView === "content-discovery" && (
            <ContentDiscoveryTab setPreviewContentId={setPreviewContentId} />
          )}

          {activeView === "analytics" && <AnalyticsPage />}
        </div>

        {/* Smart Context Sidebar */}
        {isContextSidebarOpen && (
          <div className="w-80 bg-background/50 border border-border/50 rounded-lg p-4 space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Context & Actions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsContextSidebarOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Quick Navigation with Smart Indicators */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Navigation
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "overview",
                    label: "Overview",
                    icon: LayoutDashboard,
                    hasNewContent: smartRecs.length > 0,
                    description: "Your personalized dashboard",
                  },
                  {
                    id: "insights",
                    label: "Insights",
                    icon: Brain,
                    hasNewContent: insights?.trendingTopics?.length > 0,
                    description: "AI-powered trend analysis",
                  },
                  {
                    id: "content-discovery",
                    label: "Strategy",
                    icon: Sparkles,
                    hasNewContent:
                      contentStrategy && "calendar" in contentStrategy,
                    description: "Content planning & strategy",
                  },
                  {
                    id: "analytics",
                    label: "Analytics",
                    icon: BarChart3,
                    hasNewContent: false,
                    description: "Performance metrics",
                  },
                ].map((nav) => {
                  const Icon = nav.icon;
                  const isActive = activeView.startsWith(nav.id);
                  return (
                    <div key={nav.id} className="relative group">
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleViewChange(nav.id)}
                        className="justify-start h-8 text-xs w-full group-hover:scale-105 transition-all duration-200"
                      >
                        <Icon className="h-3 w-3 mr-1.5" />
                        {nav.label}
                        {nav.hasNewContent && !isActive && (
                          <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                      </Button>

                      {/* Contextual tooltip */}
                      <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
                        {nav.description}
                        {nav.hasNewContent && (
                          <div className="text-primary font-medium">
                            • New content available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Recommendations with Contextual Actions */}
            {smartRecs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recommended
                  </Label>
                  {smartRecs.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleViewChange("overview")}
                    >
                      View all {smartRecs.length}
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  {smartRecs.slice(0, 3).map((rec) => {
                    const Icon = rec.icon;
                    return (
                      <div key={rec.id} className="group relative">
                        <button
                          onClick={rec.action}
                          className="w-full p-2 text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-200 border border-border/50 bg-background/50 group-hover:border-primary/30 group-hover:shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="h-4 w-4 mt-0.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                {rec.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80 transition-colors">
                                {rec.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={
                                  rec.priority === "high"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs px-1.5 py-0.5 group-hover:bg-primary/20 transition-colors"
                              >
                                {rec.priority}
                              </Badge>
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                            </div>
                          </div>
                        </button>

                        {/* Smart tooltip with additional context */}
                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap max-w-xs">
                          <div className="font-medium mb-1">{rec.title}</div>
                          <div className="text-muted-foreground">
                            Click to explore {rec.title.toLowerCase()} insights
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current View Context with Smart Actions */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current Context
              </Label>
              <div className="p-3 bg-muted/50 rounded-md border border-border/50 hover:bg-muted/70 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  {activeView === "overview" && (
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                  )}
                  {activeView.startsWith("insights") && (
                    <Brain className="h-4 w-4 text-primary" />
                  )}
                  {activeView === "content-discovery" && (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                  {activeView === "analytics" && (
                    <BarChart3 className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium text-sm flex-1">
                    {activeView === "overview" && "Overview Dashboard"}
                    {activeView.startsWith("insights") && "AI Insights Hub"}
                    {activeView === "content-discovery" && "Content Strategy"}
                    {activeView === "analytics" && "Performance Analytics"}
                  </span>

                  {/* Smart contextual action button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      // Smart action based on current view
                      if (activeView === "overview") {
                        console.log("Refresh overview data");
                      } else if (activeView.startsWith("insights")) {
                        console.log("Refresh insights data");
                      } else if (activeView === "content-discovery") {
                        console.log("Generate new content ideas");
                      } else if (activeView === "analytics") {
                        console.log("Refresh analytics data");
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {activeView === "overview" &&
                    "Get a bird's eye view of your content performance and opportunities."}
                  {activeView.startsWith("insights") &&
                    "Discover trending topics and viral content opportunities."}
                  {activeView === "content-discovery" &&
                    "Plan and strategize your content with AI recommendations."}
                  {activeView === "analytics" &&
                    "Deep dive into your content performance metrics."}
                </p>

                {/* Smart contextual suggestions */}
                <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeView === "overview" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleViewChange("insights")}
                      >
                        View Insights
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleViewChange("content-discovery")}
                      >
                        Plan Content
                      </Button>
                    </>
                  )}
                  {activeView.startsWith("insights") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleViewChange("content-discovery")}
                      >
                        Create Content
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleViewChange("analytics")}
                      >
                        View Performance
                      </Button>
                    </>
                  )}
                  {activeView === "content-discovery" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleViewChange("insights")}
                      >
                        Get Ideas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => console.log("Schedule content")}
                      >
                        Schedule
                      </Button>
                    </>
                  )}
                  {activeView === "analytics" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleViewChange("insights")}
                      >
                        Find Trends
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => console.log("Export data")}
                      >
                        Export
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(quickFilters.timeframe !== "week" ||
              quickFilters.priority !== "all" ||
              quickFilters.type !== "all") && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Active Filters
                </Label>
                <div className="flex flex-wrap gap-1">
                  {quickFilters.timeframe !== "week" && (
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {quickFilters.timeframe}
                    </Badge>
                  )}
                  {quickFilters.priority !== "all" && (
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {quickFilters.priority} priority
                    </Badge>
                  )}
                  {quickFilters.type !== "all" && (
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {quickFilters.type}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setQuickFilters({
                        timeframe: "week",
                        priority: "all",
                        type: "all",
                      })
                    }
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}

            {/* View History */}
            {viewHistory.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recent Views
                </Label>
                <div className="space-y-1">
                  {viewHistory
                    .slice(-4, -1)
                    .reverse()
                    .map((view, index) => {
                      const viewNames: Record<string, string> = {
                        overview: "Overview",
                        insights: "AI Insights",
                        "content-discovery": "Content Strategy",
                        analytics: "Performance",
                      };
                      return (
                        <button
                          key={`${view}-${index}`}
                          onClick={() => handleViewChange(view)}
                          className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        >
                          {viewNames[view] || view}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Shortcuts
              </Label>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Search</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    ⌘K
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Go back</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    ⌘B
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Toggle context</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    ⌘/
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Close dialogs</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Content Preview with Smart Positioning */}
      {previewContentId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <InlineContentPreview
              contentId={previewContentId}
              onClose={() => setPreviewContentId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents, isLoading: isLoadingDocuments } =
    useUploadedDocuments();

  const uploadMutation = useMutation({
    mutationFn: apiClient.uploadDocument,
    onSuccess: () => {
      toast({ title: "Document uploaded successfully!" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.uploadedDocuments(),
      });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteUploadedDocument,
    onSuccess: () => {
      toast({ title: "Document deleted successfully." });
      queryClient.invalidateQueries({
        queryKey: queryKeys.uploadedDocuments(),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = () => {
      const base64Content = reader.result as string;
      if (!base64Content) {
        toast({
          title: "File read error",
          description: "Could not read the selected file.",
          variant: "destructive",
        });
        return;
      }
      uploadMutation.mutate({
        fileName: selectedFile.name,
        fileContent: base64Content,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });
    };
    reader.onerror = () => {
      toast({
        title: "File read error",
        description: "Could not read the selected file.",
        variant: "destructive",
      });
    };
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes < 1) return `0 Bytes`;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Documents</CardTitle>
        <CardDescription>
          Upload additional documents like chat or search logs to help the AI
          generate more powerful insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <Input
              type="file"
              onChange={handleFileChange}
              className="flex-grow"
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isLoading}
            >
              {uploadMutation.isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Upload Document
            </Button>
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
            </div>
          )}
        </div>
        <Separator className="my-6" />
        <div>
          <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
          {isLoadingDocuments ? (
            <LoadingSpinner />
          ) : documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground break-words">
                      {doc.fileType} - {formatBytes(doc.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      deleteMutation.mutate({ documentId: doc.id })
                    }
                    disabled={
                      deleteMutation.isLoading &&
                      deleteMutation.variables?.documentId === doc.id
                    }
                  >
                    {deleteMutation.isLoading &&
                    deleteMutation.variables?.documentId === doc.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No documents uploaded yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PostingActivityHeatmap({
  data,
  isLoading,
}: {
  data: { day: number; hour: number; activity: number }[];
  isLoading: boolean;
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  if (isLoading) {
    return (
      <Card className={isMobile ? "" : "lg:col-span-7"}>
        <CardHeader className={isMobile ? "pb-3" : ""}>
          <CardTitle className={isMobile ? "text-base" : "text-lg"}>
            Best Times to Post
          </CardTitle>
          <CardDescription className={isMobile ? "text-sm" : ""}>
            {isMobile
              ? "Your audience activity patterns"
              : "Visualizing your audience's activity by day and hour."}
          </CardDescription>
        </CardHeader>
        <CardContent
          className={`flex items-center justify-center ${isMobile ? "h-64" : "h-96"}`}
        >
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={isMobile ? "" : "lg:col-span-7"}>
        <CardHeader className={isMobile ? "pb-3" : ""}>
          <CardTitle className={isMobile ? "text-base" : "text-lg"}>
            Best Times to Post
          </CardTitle>
          <CardDescription className={isMobile ? "text-sm" : ""}>
            {isMobile
              ? "Your audience activity patterns"
              : "Visualizing your audience's activity by day and hour."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BarChart3 />}
            title="Not Enough Data"
            description={
              isMobile
                ? "Need more data for heatmap"
                : "We need more comment data to generate an activity heatmap."
            }
          />
        </CardContent>
      </Card>
    );
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxActivity = Math.max(...data.map((d) => d.activity), 1);

  const activityGrid: number[][] = Array(7)
    .fill(0)
    .map(() => Array(24).fill(0));
  data.forEach((d) => {
    if (d.day >= 0 && d.day < 7 && d.hour >= 0 && d.hour < 24) {
      activityGrid[d.day]![d.hour] = d.activity;
    }
  });

  return (
    <Card className={isMobile ? "" : "lg:col-span-7"}>
      <CardHeader className={isMobile ? "pb-3" : ""}>
        <CardTitle className={isMobile ? "text-base" : "text-lg"}>
          Best Times to Post
        </CardTitle>
        <CardDescription className={isMobile ? "text-sm" : ""}>
          {isMobile
            ? "Darker = higher engagement"
            : "Darker squares indicate higher engagement. All times are in UTC."}
        </CardDescription>
      </CardHeader>
      <CardContent className={`overflow-x-auto ${isMobile ? "p-3" : ""}`}>
        <div className="inline-block min-w-full">
          <div className={`flex justify-end ${isMobile ? "pr-4" : "pr-8"}`}>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: isMobile
                  ? "repeat(24, minmax(1rem, 1fr))"
                  : "repeat(24, minmax(2rem, 1fr))",
              }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className={`text-center text-muted-foreground ${isMobile ? "text-xs" : "text-xs"}`}
                >
                  {isMobile
                    ? hour % 8 === 0
                      ? `${hour}`
                      : ""
                    : hour % 6 === 0
                      ? `${hour}`
                      : ""}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-rows-7 gap-1">
            {days.map((day, dayIndex) => (
              <div key={dayIndex} className="flex items-center gap-2">
                <div
                  className={`text-xs text-muted-foreground text-right ${isMobile ? "w-6" : "w-8"}`}
                >
                  {isMobile ? day.substring(0, 1) : day}
                </div>
                <div
                  className="grid gap-1 flex-1"
                  style={{
                    gridTemplateColumns: isMobile
                      ? "repeat(24, minmax(1rem, 1fr))"
                      : "repeat(24, minmax(2rem, 1fr))",
                  }}
                >
                  {hours.map((hourIndex) => {
                    const activity = activityGrid[dayIndex]?.[hourIndex] || 0;
                    const opacity =
                      maxActivity > 0 ? activity / maxActivity : 0;
                    return (
                      <TooltipProvider key={hourIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-full aspect-square ${isMobile ? "rounded-sm" : "rounded-sm"}`}
                              style={{
                                backgroundColor: `hsla(var(--primary), ${opacity})`,
                                minHeight: isMobile ? "12px" : "16px",
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className={isMobile ? "text-xs" : ""}>
                              {activity} interactions on {day} at {hourIndex}:00
                              UTC
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: apiClient.getConnectedAccounts,
  });

  const connectedPlatforms = accounts
    ? [...new Set(accounts.map((a) => a.platform))]
    : [];

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const facebookPages = React.useMemo(() => {
    return (
      accounts
        ?.filter(
          (a) =>
            a.platform === "facebook" &&
            a.pages.length > 0 &&
            (!selectedPlatform || selectedPlatform === "facebook"),
        )
        ?.flatMap((a) => a.pages) ?? []
    );
  }, [accounts, selectedPlatform]);

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  useEffect(() => {
    if (facebookPages && facebookPages.length > 0 && !selectedPageId) {
      setSelectedPageId(facebookPages[0]!.pageId);
    } else if (selectedPlatform !== "facebook") {
      setSelectedPageId(null);
    }
  }, [facebookPages, selectedPlatform]);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["analyticsSummary", selectedPageId, selectedPlatform],
    queryFn: () =>
      apiClient.getAnalyticsSummary({
        pageId: selectedPageId || undefined,
        platform: selectedPlatform || undefined,
      }),
  });

  const { data: heatmapData, isLoading: isLoadingHeatmap } = useQuery({
    queryKey: ["postingActivityHeatmap", selectedPageId, selectedPlatform],
    queryFn: () =>
      apiClient.getPostingActivityHeatmap({
        pageId: selectedPageId || undefined,
        platform: selectedPlatform || undefined,
      }),
  });

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["pageAnalytics", selectedPageId],
    queryFn: () => apiClient.getPageAnalytics({ pageId: selectedPageId! }),
    enabled: !!selectedPageId && selectedPlatform === "facebook",
  });

  const { mutate: refreshAnalytics, isLoading: isRefreshing } = useMutation({
    mutationFn: apiClient.refreshAnalyticsData,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pageAnalytics", selectedPageId],
      });
      toast({ title: "Analytics data is being refreshed." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to refresh analytics",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const lineChartData = {
    labels: analyticsData?.map((d) => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: "Impressions",
        data: analyticsData?.map((d) => d.impressions),
        borderColor: "hsl(var(--primary))",
        backgroundColor: "hsla(var(--primary), 0.2)",
        fill: true,
        tension: 0.3,
        yAxisID: "y",
      },
      {
        label: "Reach",
        data: analyticsData?.map((d) => d.reach),
        borderColor: "hsl(var(--foreground))",
        backgroundColor: "hsla(var(--foreground), 0.2)",
        tension: 0.3,
        yAxisID: "y",
      },
      {
        label: "Engagement Rate (%)",
        data: analyticsData?.map((d) => d.engagementRate),
        borderColor: "hsl(var(--destructive))",
        backgroundColor: "hsla(var(--destructive), 0.2)",
        tension: 0.3,
        yAxisID: "y1",
      },
    ],
  };

  const lineChartOptions = {
    maintainAspectRatio: false,
    scales: {
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
      },
    },
  };

  const sentimentData = {
    labels: Object.keys(summary?.sentimentBreakdown || {}),
    datasets: [
      {
        data: Object.values(summary?.sentimentBreakdown || {}),
        backgroundColor: [
          "hsl(var(--primary))",
          "hsl(var(--muted-foreground))",
          "hsl(var(--destructive))",
        ],
        borderColor: "hsl(var(--background))",
        borderWidth: 2,
      },
    ],
  };

  const AnalyticsStatsCard = ({
    title,
    value,
    change,
    icon,
    description,
  }: {
    title: string;
    value: string;
    change?: number;
    icon: React.ReactNode;
    description: string;
  }) => (
    <Card className="stats-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
      {change !== undefined && change !== null && (
        <CardFooter>
          <p
            className={`text-xs font-medium flex items-center ${
              change >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {change.toFixed(1)}% from last period
          </p>
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className={`${isMobile ? "space-y-4" : "space-y-6"}`}>
      <div
        className={`${isMobile ? "space-y-4" : "flex justify-between items-center"}`}
      >
        <div>
          <h1
            className={`font-bold gradient-text ${isMobile ? "text-2xl" : "text-3xl"}`}
          >
            Analytics
          </h1>
          <p
            className={`text-muted-foreground ${isMobile ? "text-sm" : "text-lg"}`}
          >
            {isMobile
              ? "Track social media performance"
              : "Track your social media performance and audience engagement."}
          </p>
        </div>

        <div
          className={`flex items-center ${isMobile ? "flex-col space-y-3" : "gap-4"}`}
        >
          <div
            className={`flex items-center gap-2 ${isMobile ? "w-full" : ""}`}
          >
            <select
              value={selectedPlatform || "all"}
              onChange={(e) => {
                setSelectedPlatform(
                  e.target.value === "all" ? null : e.target.value,
                );
                if (e.target.value !== "facebook") {
                  setSelectedPageId(null);
                }
              }}
              className={`px-3 py-2 rounded-md border border-input bg-background ${isMobile ? "flex-1" : ""}`}
            >
              <option value="all">All Platforms</option>
              {connectedPlatforms.map((platform) => (
                <option key={platform} value={platform} className="capitalize">
                  {platform}
                </option>
              ))}
            </select>

            {selectedPlatform === "facebook" &&
              facebookPages &&
              facebookPages.length > 0 && (
                <select
                  value={selectedPageId || ""}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className={`px-3 py-2 rounded-md border border-input bg-background ${isMobile ? "flex-1" : ""}`}
                >
                  {facebookPages.map((page: any) => (
                    <option key={page.pageId} value={page.pageId}>
                      {isMobile
                        ? page.pageName.length > 20
                          ? page.pageName.substring(0, 20) + "..."
                          : page.pageName
                        : page.pageName}
                    </option>
                  ))}
                </select>
              )}
          </div>

          {selectedPlatform === "facebook" && (
            <Button
              onClick={() => {
                if (selectedPageId) {
                  refreshAnalytics({ pageId: selectedPageId });
                }
              }}
              disabled={isRefreshing || !selectedPageId}
              size={isMobile ? "sm" : "default"}
              className={isMobile ? "w-full" : ""}
            >
              {isRefreshing ? (
                <RefreshCw
                  className={`animate-spin ${isMobile ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4"}`}
                />
              ) : (
                <RefreshCw
                  className={isMobile ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4"}
                />
              )}
              {isMobile ? "Refresh" : "Refresh Data"}
            </Button>
          )}
        </div>
      </div>
      {isLoadingAccounts ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="h-96">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="h-80">
                <Skeleton className="h-full w-full rounded-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : isLoadingSummary ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Loading...
                  </CardTitle>
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <LoadingSpinner className="py-8" />
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          icon={<BarChart3 />}
          title="Connect Your Social Media Accounts"
          description="To view analytics, you need to connect at least one social media account. Connect your Facebook, Twitter, YouTube, or Instagram accounts to start tracking your performance."
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Connect Accounts
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          <div
            className={`grid gap-4 ${isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-4"}`}
          >
            <AnalyticsStatsCard
              title="Total Engagement"
              value={summary?.totalEngagement.toLocaleString() || "0"}
              icon={<ThumbsUp className="h-4 w-4 text-muted-foreground" />}
              description="Likes, comments, shares"
            />
            <AnalyticsStatsCard
              title="Response Rate"
              value={`${summary?.responseRate.toFixed(1) || "0"}%`}
              icon={<Percent className="h-4 w-4 text-muted-foreground" />}
              description={`${summary?.totalComments || "0"} total comments`}
            />
            <AnalyticsStatsCard
              title="Followers"
              value={summary?.followerCount.current?.toLocaleString() || "N/A"}
              change={summary?.followerCount.change ?? undefined}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              description="Only available for Facebook Pages"
            />
            <AnalyticsStatsCard
              title="Total Comments"
              value={summary?.totalComments.toLocaleString() || "0"}
              icon={<MessageCircle className="h-4 w-4 text-muted-foreground" />}
              description="Across selected platforms"
            />
          </div>
          {/* Mobile: Stack Charts Vertically, Desktop: Side by Side */}
          <div
            className={`grid gap-4 ${isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-7"}`}
          >
            <Card className={isMobile ? "" : "lg:col-span-4"}>
              <CardHeader className={isMobile ? "pb-3" : ""}>
                <CardTitle className={isMobile ? "text-base" : "text-lg"}>
                  Impressions & Reach
                </CardTitle>
                <CardDescription className={isMobile ? "text-sm" : ""}>
                  Only available for Facebook Pages.
                </CardDescription>
              </CardHeader>
              <CardContent className={isMobile ? "h-64" : "h-96"}>
                {selectedPlatform === "facebook" && selectedPageId ? (
                  isLoadingAnalytics ? (
                    <LoadingSpinner />
                  ) : analyticsData && analyticsData.length > 0 ? (
                    <Line
                      data={lineChartData}
                      options={{
                        ...lineChartOptions,
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: {
                            position: isMobile ? "bottom" : "top",
                            labels: {
                              boxWidth: isMobile ? 12 : 15,
                              font: {
                                size: isMobile ? 10 : 12,
                              },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <EmptyState
                      icon={<BarChart3 />}
                      title="No Analytics Data"
                      description={
                        isMobile
                          ? "No data for this page yet."
                          : "We don't have any analytics data for this page yet. Try refreshing the data."
                      }
                    />
                  )
                ) : (
                  <EmptyState
                    icon={<BarChart3 />}
                    title="Select a Facebook Page"
                    description={
                      isMobile
                        ? "Only available for Facebook."
                        : "This chart is only available for Facebook Pages."
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card className={isMobile ? "" : "lg:col-span-3"}>
              <CardHeader className={isMobile ? "pb-3" : ""}>
                <CardTitle className={isMobile ? "text-base" : "text-lg"}>
                  Sentiment Breakdown
                </CardTitle>
                <CardDescription className={isMobile ? "text-sm" : ""}>
                  Sentiment analysis of all comments.
                </CardDescription>
              </CardHeader>
              <CardContent
                className={`flex justify-center items-center ${isMobile ? "h-64" : "h-80"}`}
              >
                {summary &&
                Object.values(summary.sentimentBreakdown).some((v) => v > 0) ? (
                  <Doughnut
                    data={sentimentData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            boxWidth: isMobile ? 12 : 15,
                            font: {
                              size: isMobile ? 10 : 12,
                            },
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={<PieChart />}
                    title="No Sentiment Data"
                    description={
                      isMobile
                        ? "No comments found."
                        : "No comments with sentiment data found."
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <PostingActivityHeatmap
            data={heatmapData || []}
            isLoading={isLoadingHeatmap}
          />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router>
          <Routes>
            <Route
              path="/blog"
              element={
                <PublicLayout>
                  <BlogPage />
                </PublicLayout>
              }
            />
            <Route
              path="/blog/:slug"
              element={
                <PublicLayout>
                  <BlogPostPage />
                </PublicLayout>
              }
            />
            <Route path="/*" element={<MainApp />} />
          </Routes>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

function MainApp() {
  const auth = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: apiClient.getCurrentUser,
    enabled: auth.status === "authenticated",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Show onboarding for new users who haven't completed the tour
  // Use localStorage as backup to prevent re-showing on refresh
  useEffect(() => {
    if (currentUser && !hasCheckedOnboarding && !isUserLoading) {
      setHasCheckedOnboarding(true);

      // Check localStorage first to prevent showing on refresh
      const hasSeenOnboarding = localStorage.getItem(
        `socialwave_onboarding_${currentUser.id}`,
      );

      if (!currentUser.hasCompletedTour && !hasSeenOnboarding) {
        setShowOnboarding(true);
        // Mark as seen in localStorage immediately to prevent re-showing
        localStorage.setItem(`socialwave_onboarding_${currentUser.id}`, "seen");
      }
    }
  }, [currentUser, hasCheckedOnboarding, isUserLoading]);

  // Listen for custom events to trigger onboarding
  useEffect(() => {
    const handleShowOnboarding = () => {
      setShowOnboarding(true);
    };

    const handleStartOnboarding = () => {
      setShowOnboarding(true);
    };

    window.addEventListener("showOnboarding", handleShowOnboarding);
    window.addEventListener("startOnboarding", handleStartOnboarding);

    return () => {
      window.removeEventListener("showOnboarding", handleShowOnboarding);
      window.removeEventListener("startOnboarding", handleStartOnboarding);
    };
  }, []);

  if (auth.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/engage" element={<EngagePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>

      {/* Onboarding Guide */}
      <OnboardingGuide
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        currentUser={currentUser}
        onComplete={() => {
          setShowOnboarding(false);
          // Clear localStorage flag and refresh user data
          if (currentUser) {
            localStorage.removeItem(`socialwave_onboarding_${currentUser.id}`);
            localStorage.setItem(
              `socialwave_onboarding_completed_${currentUser.id}`,
              "true",
            );
          }
          queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        }}
      />
    </Layout>
  );
}

const StrategySummary = ({ summary }: { summary: any }) => {
  if (!summary) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="gradient-text">
          Content Strategy Summary
        </CardTitle>
        <CardDescription>
          Your high-level plan for the upcoming week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Key Themes</h4>
          <div className="flex flex-wrap gap-2">
            {summary.keyThemes.map((theme: string, index: number) => (
              <Badge key={index} variant="secondary">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Target Audience</h4>
          <p className="text-sm text-muted-foreground break-words">
            {summary.targetAudience}
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Content Mix</h4>
          <div className="flex items-center gap-4">
            {Object.entries(summary.contentMix).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className="text-sm font-medium mr-2">{key}:</span>
                <span className="text-sm text-primary font-semibold">
                  {value as number}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">
            Key Performance Indicators (KPIs)
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {summary.kpis.map((kpi: string, index: number) => (
              <li key={index}>{kpi}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

function ContentDiscoveryTab({
  setPreviewContentId,
}: {
  setPreviewContentId: (id: string | null) => void;
}) {
  const location = useLocation();
  const highlightedPostId = location.state?.highlightedPostId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [feedbackInfo, setFeedbackInfo] = useState<{
    post: any;
    type: "neutral" | "dislike";
  } | null>(null);
  const [postedInfo, setPostedInfo] = useState<{
    post: any;
    type: "love" | "like";
  } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data, isLoading, error, refetch } = useQuery(
    ["contentStrategy"],
    () => apiClient.generateContentStrategy(),
    {
      refetchInterval: (data: any) => {
        if (
          [
            "GENERATING",
            "PENDING",
            "FETCHING_DATA",
            "GENERATING_CALENDAR",
          ].includes(data?.status)
        ) {
          return 5000;
        }
        return false;
      },
    },
  );

  const { mutate: refreshStrategyMutation, isLoading: isRefreshingStrategy } =
    useMutation({
      mutationFn: () => apiClient.refreshContentStrategy(),
      onSuccess: () => {
        refetch();
        toast({
          title: "Content strategy being generated",
          description:
            "Your content strategy is being refreshed and will be available shortly.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to refresh strategy",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
          variant: "destructive",
        });
      },
    });

  const { mutate: resetStrategyMutation, isLoading: isResettingStrategy } =
    useMutation({
      mutationFn: () => apiClient.resetContentStrategyStatus(),
      onSuccess: () => {
        refetch();
        toast({
          title: "Content strategy reset",
          description: "You can now generate a new strategy.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to reset strategy",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
          variant: "destructive",
        });
      },
    });

  const generateContentMutation = useMutation<
    inferRPCOutputType<"generateContentFromRecommendation">,
    unknown,
    inferRPCInputType<"generateContentFromRecommendation">
  >(apiClient.generateContentFromRecommendation, {
    onSuccess: (data) => {
      setPreviewContentId(
        (data as { taskId: string; contentId: string }).contentId,
      );
      queryClient.invalidateQueries(queryKeys.generatedContent());
    },
    onError: (error) => {
      toast({
        title: "Failed to generate content",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: apiClient.submitRecommendationFeedback,
    onSuccess: () => {
      toast({
        title: `Feedback submitted!`,
        description: `Thanks for your feedback. We're now generating fresh insights based on it.`,
      });
      refreshStrategyMutation();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingSpinner className="py-12" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Strategy</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const isGenerating = [
    "GENERATING",
    "PENDING",
    "FETCHING_DATA",
    "GENERATING_CALENDAR",
  ].includes(data?.status);

  if (!data || data.status === "NONE" || isGenerating) {
    const getGeneratingMessage = () => {
      switch (data?.status) {
        case "PENDING":
          return "Queued for generation...";
        case "FETCHING_DATA":
          return "Analyzing your latest social data...";
        case "GENERATING_CALENDAR":
          return "Building your 7-day content plan...";
        case "GENERATING":
        default:
          return "Generating Strategy...";
      }
    };

    return (
      <EmptyState
        icon={
          isGenerating ? (
            <RefreshCw className="h-12 w-12 animate-spin" />
          ) : (
            <Sparkles className="h-12 w-12" />
          )
        }
        title={
          isGenerating
            ? getGeneratingMessage()
            : "Generate Your Content Strategy"
        }
        description={
          isGenerating
            ? "This may take a few moments. The page will update automatically."
            : "Get started by generating your personalized AI-powered content strategy."
        }
      >
        {!isGenerating && (
          <Button
            onClick={() => refreshStrategyMutation()}
            disabled={isRefreshingStrategy}
          >
            {isRefreshingStrategy ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Strategy Now
          </Button>
        )}
        {isGenerating && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => resetStrategyMutation()}
            disabled={isResettingStrategy}
          >
            {isResettingStrategy ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancel
          </Button>
        )}
      </EmptyState>
    );
  }

  if (data.status === "FAILED") {
    return (
      <EmptyState
        icon={<XCircle className="h-12 w-12 text-destructive" />}
        title="Strategy Generation Failed"
        description={
          (data as { error?: string }).error ||
          "There was an error generating your content strategy."
        }
      >
        <Button
          onClick={() => refreshStrategyMutation()}
          disabled={isRefreshingStrategy}
        >
          {isRefreshingStrategy ? "Retrying..." : "Try Again"}
        </Button>
      </EmptyState>
    );
  }

  if (!("calendar" in data) || !("strategySummary" in data)) {
    return (
      <EmptyState
        icon={<XCircle className="h-12 w-12 text-destructive" />}
        title="Incomplete Strategy Data"
        description="The content strategy data is incomplete. Please try refreshing."
      >
        <Button
          onClick={() => refreshStrategyMutation()}
          disabled={isRefreshingStrategy}
        >
          {isRefreshingStrategy ? "Refreshing..." : "Refresh Strategy"}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className={`${isMobile ? "space-y-4" : "space-y-8"}`}>
      <div
        className={`flex items-center gap-2 ${isMobile ? "justify-between" : "justify-end gap-4"}`}
      >
        {data.updatedAt && (
          <p
            className={`text-muted-foreground break-words ${isMobile ? "text-xs flex-1" : "text-sm"}`}
          >
            {isMobile
              ? `Updated: ${new Date(data.updatedAt).toLocaleDateString()}`
              : `Last updated: ${formatDate(data.updatedAt)}`}
          </p>
        )}
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={() => refreshStrategyMutation()}
          disabled={isRefreshingStrategy}
        >
          {isRefreshingStrategy ? (
            <RefreshCw
              className={`animate-spin ${isMobile ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4"}`}
            />
          ) : (
            <RefreshCw className={isMobile ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4"} />
          )}
          {isMobile ? "Refresh" : "Refresh Strategy"}
        </Button>
      </div>

      <StrategySummary summary={data.strategySummary} />

      {/* Mobile: Stack Days Vertically, Desktop: Grid Layout */}
      {isMobile ? (
        <div className="space-y-4">
          {data.calendar.map((day, dayIndex) => (
            <Card key={dayIndex} className="overflow-hidden">
              <CardHeader className="pb-3 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{day.dayOfWeek}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {day.posts.length} post{day.posts.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-md mb-3">
                  {day.dailyRationale}
                </p>
                <div className="space-y-2">
                  {day.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      highlighted={post.id === highlightedPostId}
                      onGenerate={() =>
                        generateContentMutation.mutate({ recommendation: post })
                      }
                      isGenerating={
                        generateContentMutation.isLoading &&
                        generateContentMutation.variables?.recommendation.id ===
                          post.id
                      }
                      onFeedback={(p, feedbackType) => {
                        if (
                          feedbackType === "love" ||
                          feedbackType === "like"
                        ) {
                          setPostedInfo({ post: p, type: feedbackType });
                        } else {
                          setFeedbackInfo({ post: p, type: feedbackType });
                        }
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-border overflow-hidden rounded-lg border border-border md:grid-cols-7">
          {data.calendar.map((day, dayIndex) => (
            <div key={dayIndex} className="flex flex-col bg-background">
              <div className="p-3 border-b bg-secondary/20">
                <p className="font-semibold text-center text-sm">
                  {day.dayOfWeek}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="p-2 space-y-2 flex-1">
                <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-md">
                  {day.dailyRationale}
                </p>
                {day.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    highlighted={post.id === highlightedPostId}
                    onGenerate={() =>
                      generateContentMutation.mutate({ recommendation: post })
                    }
                    isGenerating={
                      generateContentMutation.isLoading &&
                      generateContentMutation.variables?.recommendation.id ===
                        post.id
                    }
                    onFeedback={(p, feedbackType) => {
                      if (feedbackType === "love" || feedbackType === "like") {
                        setPostedInfo({ post: p, type: feedbackType });
                      } else {
                        setFeedbackInfo({ post: p, type: feedbackType });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.engagementTactics && data.engagementTactics.length > 0 && (
        <Card>
          <CardHeader className={isMobile ? "pb-3" : ""}>
            <CardTitle className={isMobile ? "text-base" : "text-lg"}>
              Engagement Tactics
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "pt-0" : ""}>
            <ul
              className={`list-disc pl-5 space-y-2 ${isMobile ? "text-sm" : "text-sm"}`}
            >
              {data.engagementTactics.map((tactic, index) => (
                <li key={index} className={isMobile ? "leading-relaxed" : ""}>
                  {tactic}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {feedbackInfo && (
        <FeedbackDialog
          isOpen={!!feedbackInfo}
          onOpenChange={(isOpen) => !isOpen && setFeedbackInfo(null)}
          feedbackType={feedbackInfo.type}
          onSubmit={(feedbackData) => {
            submitFeedbackMutation.mutate({
              recommendationId: feedbackInfo.post.id,
              source: "content-strategy",
              feedbackType: feedbackInfo.type,
              ...feedbackData,
            });
            setFeedbackInfo(null);
          }}
        />
      )}
      {postedInfo && (
        <IPostedThisDialog
          isOpen={!!postedInfo}
          onOpenChange={(isOpen) => !isOpen && setPostedInfo(null)}
          post={postedInfo.post}
          onSubmit={() => {
            submitFeedbackMutation.mutate({
              recommendationId: postedInfo.post.id,
              source: "content-strategy",
              feedbackType: postedInfo.type,
            });
            setPostedInfo(null);
          }}
        />
      )}
    </div>
  );
}

const PostCard = ({
  post,
  onGenerate,
  isGenerating,
  onFeedback,
  highlighted,
}: {
  post: any;
  onGenerate: () => void;
  isGenerating: boolean;
  onFeedback: (
    post: any,
    feedbackType: "love" | "like" | "neutral" | "dislike",
  ) => void;
  highlighted?: boolean;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  return (
    <Card
      ref={cardRef}
      className={`bg-card/50 hover:bg-card/80 transition-colors duration-200 flex flex-col justify-between ${highlighted ? "border-primary ring-2 ring-primary ring-offset-2" : ""}`}
    >
      <div>
        <CardHeader className={isMobile ? "p-3 pb-2" : "p-3"}>
          <div
            className={`flex items-start gap-2 ${isMobile ? "flex-col" : "justify-between"}`}
          >
            <CardTitle
              className={`font-bold leading-tight ${isMobile ? "text-sm" : "text-sm"}`}
            >
              {post.title}
            </CardTitle>
            <Badge
              variant="secondary"
              className={`text-xs h-fit ${isMobile ? "self-start" : ""}`}
            >
              {post.format}
            </Badge>
          </div>
        </CardHeader>
        <CardContent
          className={`text-muted-foreground space-y-2 ${isMobile ? "p-3 pt-0 text-xs" : "p-3 pt-0 text-xs"}`}
        >
          <div className="space-y-2">
            <div>
              <span className="text-foreground font-medium text-xs">
                Brief:
              </span>
              <p className="text-xs leading-relaxed mt-1">
                {post.contentBrief}
              </p>
            </div>
            <div>
              <span className="text-foreground font-medium text-xs">CTA:</span>
              <p className="text-xs leading-relaxed mt-1">{post.cta}</p>
            </div>
            <div>
              <span className="text-foreground font-medium text-xs">
                Rationale:
              </span>
              <p className="text-xs leading-relaxed mt-1">{post.rationale}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 pt-2 ${isMobile ? "justify-center" : ""}`}
          >
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">
                Score: {post.viralityScore}/10
              </span>
            </div>
          </div>
        </CardContent>
      </div>
      <CardFooter
        className={`mt-auto ${isMobile ? "p-3 pt-2 flex-col gap-3" : "p-3 flex flex-wrap gap-2 items-center justify-between"}`}
      >
        <Button
          size={isMobile ? "default" : "sm"}
          variant="outline"
          className={`text-xs font-medium ${isMobile ? "w-full h-9" : "h-7"}`}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <RefreshCw
              className={`animate-spin ${isMobile ? "mr-2 h-4 w-4" : "h-3 w-3 mr-1"}`}
            />
          ) : (
            <Sparkles className={isMobile ? "mr-2 h-4 w-4" : "h-3 w-3 mr-1"} />
          )}
          Generate Content
        </Button>

        <div
          className={`flex gap-1 ${isMobile ? "justify-center w-full" : ""}`}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-red-500 ${isMobile ? "h-8 w-8" : "h-7 w-7"}`}
                  onClick={() => onFeedback(post, "love")}
                >
                  <Heart className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Love this!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-green-500 ${isMobile ? "h-8 w-8" : "h-7 w-7"}`}
                  onClick={() => onFeedback(post, "like")}
                >
                  <ThumbsUp className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>I like this</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-yellow-500 ${isMobile ? "h-8 w-8" : "h-7 w-7"}`}
                  onClick={() => onFeedback(post, "neutral")}
                >
                  <Meh className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>It's okay</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-gray-500 ${isMobile ? "h-8 w-8" : "h-7 w-7"}`}
                  onClick={() => onFeedback(post, "dislike")}
                >
                  <ThumbsDown className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Not for me</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
};

function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-secondary/30 p-12 text-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 flex items-center justify-center bg-primary rounded-lg text-primary-foreground shadow-md">
            <MessageSquare className="h-7 w-7" />
          </div>
          <span className="text-3xl font-bold gradient-text">SocialWave</span>
        </div>
        <h2 className="text-3xl font-bold mt-4">
          From Insight to Impact, Instantly.
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Join thousands of creators and brands who use SocialWave to automate,
          analyze, and amplify their social media presence.
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-10 w-10 flex items-center justify-center bg-primary rounded-lg text-primary-foreground shadow-md">
                <MessageSquare className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold gradient-text">
                SocialWave
              </span>
            </div>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-2">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === "12345") {
      setIsCodeValid(true);
      toast({
        title: "Access granted",
        description: "Please proceed with your login.",
      });
    } else {
      toast({
        title: "Invalid access code",
        description: "Please enter the correct access code to continue.",
        variant: "destructive",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await auth.signIn({ provider: "AC1", email });
      toast({
        title: "Check your email",
        description: "We've sent a magic link to your email address.",
      });
    } catch {
      toast({
        title: "Login Failed",
        description: "Please check your email and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={!isCodeValid ? "Access Required" : "Welcome Back"}
      description={
        !isCodeValid
          ? "Please enter the access code to continue."
          : "Sign in to access your SocialWave dashboard."
      }
    >
      {!isCodeValid ? (
        <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <Input
              id="accessCode"
              type="text"
              placeholder="Enter access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full h-12">
            Verify Access Code
          </Button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Sign In with Email
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => auth.signIn({ provider: "GOOGLE" })}
          >
            <GoogleIcon />
            Sign In with Google
          </Button>
        </>
      )}
      <div className="mt-6 text-center text-sm">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-semibold text-primary hover:underline"
        >
          Sign Up
        </Link>
      </div>
    </AuthLayout>
  );
}

function SignUpPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === "12345") {
      setIsCodeValid(true);
      toast({
        title: "Access granted",
        description: "Please proceed with your sign up.",
      });
    } else {
      toast({
        title: "Invalid access code",
        description: "Please enter the correct access code to continue.",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await auth.signIn({ provider: "AC1", email });
      toast({
        title: "Check your email",
        description:
          "We've sent a magic link to your email address to complete sign up.",
      });
    } catch {
      toast({
        title: "Sign Up Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={!isCodeValid ? "Access Required" : "Create an Account"}
      description={
        !isCodeValid
          ? "Please enter the access code to continue."
          : "Join SocialWave and supercharge your social media."
      }
    >
      {!isCodeValid ? (
        <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <Input
              id="accessCode"
              type="text"
              placeholder="Enter access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full h-12">
            Verify Access Code
          </Button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up with Email
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => auth.signIn({ provider: "GOOGLE" })}
          >
            <GoogleIcon />
            Sign Up with Google
          </Button>
        </>
      )}
      <div className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:underline"
        >
          Log In
        </Link>
      </div>
    </AuthLayout>
  );
}

export default App;

function ViralThreadTagManager({ threadId }: { threadId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");

  const { data: allTags } = useQuery(
    ["viralThreadTags"],
    apiClient.listViralThreadTags,
  );
  const { data: thread } = useQuery(["viralThread", threadId], () =>
    apiClient.getViralThread({ threadId }),
  );

  const threadTagIds = new Set(thread?.tags?.map((t: any) => t.tagId) || []);

  const addTagMutation = useMutation(apiClient.addTagToViralThread, {
    onSuccess: (_, variables) => {
      const tagName = allTags?.find((t) => t.id === variables.tagId)?.name;
      toast({ title: `Tag "${tagName || "New"}" applied` });
      queryClient.invalidateQueries({
        queryKey: queryKeys.viralThread(threadId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.viralThreads() });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTagMutation = useMutation(apiClient.removeTagFromViralThread, {
    onSuccess: (_, variables) => {
      const tagName = allTags?.find((t) => t.id === variables.tagId)?.name;
      toast({ title: `Tag "${tagName || "New"}" removed` });
      queryClient.invalidateQueries({
        queryKey: queryKeys.viralThread(threadId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.viralThreads() });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTagMutation = useMutation(apiClient.createViralThreadTag, {
    onSuccess: (newTagData) => {
      toast({ title: `Tag "${newTagData.name}" created.` });
      queryClient.invalidateQueries({ queryKey: queryKeys.viralThreadTags() });
      addTagMutation.mutate({ threadId: threadId, tagId: newTagData.id });
      setNewTag("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Tag className="h-4 w-4 mr-2" />
          Manage Tags
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Apply Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-40 overflow-y-auto px-1">
          {allTags?.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={threadTagIds.has(tag.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  addTagMutation.mutate({ threadId: threadId, tagId: tag.id });
                } else {
                  removeTagMutation.mutate({
                    threadId: threadId,
                    tagId: tag.id,
                  });
                }
              }}
            >
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Input
            placeholder="Create new tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTag.trim()) {
                createTagMutation.mutate({ name: newTag.trim() });
              }
            }}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SchedulePostDialog({
  isOpen,
  onOpenChange,
  item,
  sourceType,
  onSchedule,
  isScheduling,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: any;
  sourceType: "GENERATED_CONTENT" | "VIRAL_THREAD" | "VIDEO";
  onSchedule: (data: {
    content: string;
    platform: string;
    accountId: string;
    pageId?: string;
    scheduledAt: Date;
    sourceType: string;
    sourceId: string;
    imageUrl?: string;
  }) => void;
  isScheduling: boolean;
}) {
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: apiClient.getConnectedAccounts,
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);

  const selectedAccount = accounts?.find((acc) => acc.id === selectedAccountId);
  const facebookPages =
    selectedAccount?.platform === "facebook" ? selectedAccount.pages : [];

  useEffect(() => {
    if (isOpen && accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]!.id);
    }
  }, [isOpen, accounts, selectedAccountId]);

  useEffect(() => {
    if (selectedAccount?.platform === "facebook" && facebookPages.length > 0) {
      setSelectedPageId(facebookPages[0]?.id || null);
    } else {
      setSelectedPageId(null);
    }
  }, [selectedAccountId, selectedAccount, facebookPages]);

  const handleSchedule = () => {
    if (!selectedAccount || !scheduledAt) return;

    let contentText = "";
    let imageUrl: string | undefined = undefined;

    if (sourceType === "GENERATED_CONTENT") {
      if (item.type === "IMAGE") {
        contentText = item.title;
        imageUrl = item.content;
      } else {
        contentText = item.content;
      }
    } else if (sourceType === "VIRAL_THREAD") {
      contentText = item.tweets.map((t: any) => t.content).join("\n\n");
    } else if (sourceType === "VIDEO") {
      contentText = `${item.title}\n\nWatch the video: ${item.content}`;
    }

    onSchedule({
      content: contentText,
      platform: selectedAccount.platform,
      accountId: selectedAccount.id,
      pageId: selectedPageId || undefined,
      scheduledAt,
      sourceType,
      sourceId: item.id,
      imageUrl,
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Schedule{" "}
            {sourceType === "GENERATED_CONTENT"
              ? "Content"
              : sourceType === "VIRAL_THREAD"
                ? "Thread"
                : "Video"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Schedule this{" "}
            {sourceType === "GENERATED_CONTENT"
              ? "content"
              : sourceType === "VIRAL_THREAD"
                ? "thread"
                : "video"}{" "}
            to be posted later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <Card>
            <CardContent className="p-4">
              <p className="font-bold">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                {sourceType === "VIRAL_THREAD"
                  ? item.tweets[0]?.content
                  : sourceType === "VIDEO"
                    ? item.content.startsWith("http")
                      ? "Video will be attached."
                      : "Video is processing..."
                    : item.content}
              </p>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Label htmlFor="account-select">Select Account</Label>
            <select
              id="account-select"
              value={selectedAccountId || ""}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.platform})
                </option>
              ))}
            </select>
          </div>
          {selectedAccount?.platform === "facebook" &&
            facebookPages.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="page-select">Select Facebook Page</Label>
                <select
                  id="page-select"
                  value={selectedPageId || ""}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  {facebookPages.map((page: any) => (
                    <option key={page.id} value={page.id}>
                      {page.pageName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          <div className="space-y-2">
            <Label htmlFor="schedule-time">Schedule Time</Label>
            <Input
              id="schedule-time"
              type="datetime-local"
              onChange={(e) => setScheduledAt(new Date(e.target.value))}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSchedule}
            disabled={
              !selectedAccountId ||
              !scheduledAt ||
              (selectedAccount?.platform === "facebook" && !selectedPageId) ||
              isScheduling ||
              (sourceType === "VIDEO" && !item.content.startsWith("http"))
            }
          >
            {isScheduling && (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            )}
            Confirm Schedule
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RepurposeThreadDialog({
  isOpen,
  onOpenChange,
  threadId,
  onRepurpose,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  threadId: string;
  onRepurpose: (input: {
    threadId: string;
    platform: "facebook" | "instagram" | "linkedin";
  }) => void;
}) {
  const [platform, setPlatform] = React.useState<
    "facebook" | "instagram" | "linkedin"
  >("linkedin");

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Repurpose Thread</AlertDialogTitle>
          <AlertDialogDescription>
            Repurpose this thread for another platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Target Platform</Label>
            <select
              id="platform"
              value={platform}
              onChange={(e) =>
                setPlatform(
                  e.target.value as "facebook" | "instagram" | "linkedin",
                )
              }
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="linkedin">LinkedIn (as a post)</option>
              <option value="facebook">Facebook (as a post)</option>
              <option value="instagram">Instagram (as a caption)</option>
            </select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onRepurpose({ threadId, platform });
              onOpenChange(false);
            }}
          >
            Repurpose
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FeedbackDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  feedbackType,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  feedbackType: "neutral" | "dislike";
  onSubmit: (feedback: {
    feedbackTags: string[];
    feedbackComment: string;
  }) => void;
}) {
  const { toast } = useToast();
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState("");

  const title =
    feedbackType === "dislike"
      ? "Why wasn't this helpful?"
      : "What are your thoughts on this?";
  const description =
    feedbackType === "dislike"
      ? "Your feedback helps our AI learn your brand and improve future suggestions."
      : "Your feedback helps us understand your preferences better.";

  useEffect(() => {
    // Reset state when dialog is re-opened for a new post
    if (isOpen) {
      setFeedbackTags([]);
      setFeedbackComment("");
    }
  }, [isOpen]);

  const handleTagToggle = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = () => {
    onSubmit({ feedbackTags, feedbackComment });
  };

  const feedbackOptions =
    feedbackType === "dislike"
      ? [
          "Not relevant to my brand",
          "Tone is off",
          "Topic is uninteresting",
          "Content is inaccurate",
          "Already posted something similar",
          "Other",
        ]
      : [
          "It's good, but not great",
          "I'd change a few things",
          "Not the right time for this",
          "Missing some key information",
          "Too generic",
          "Other",
        ];

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2">
            {feedbackOptions.map((option) => (
              <Button
                key={option}
                variant={
                  feedbackTags.includes(option) ? "secondary" : "outline"
                }
                size="sm"
                onClick={() => handleTagToggle(option)}
                className="rounded-full"
              >
                {feedbackTags.includes(option) && (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {option}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="Tell us more... (optional)"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              // Logic to generate new suggestion would go here
              toast({
                title: "Request noted!",
                description:
                  "We'll work on generating a new suggestion for this slot.",
              });
              onOpenChange(false);
            }}
          >
            Generate New Suggestion
          </Button>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>
            Submit Feedback
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function IPostedThisDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  post,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: () => void;
  post: any;
}) {
  const { toast } = useToast();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Did you post this content?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirming helps our AI learn which suggestions are most effective.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Card className="bg-secondary/20 border-secondary/50">
          <CardContent className="p-4 text-sm">
            <p className="font-semibold">{post.title || post.text}</p>
            <p className="text-muted-foreground mt-1 line-clamp-3">
              {post.contentBrief}
            </p>
          </CardContent>
        </Card>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onSubmit();
              toast({
                title: "Great!",
                description: "We've logged that this content was posted.",
              });
            }}
          >
            Yes, I posted it!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SchedulerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: connectedAccounts, isLoading: accountsLoading } =
    useConnectedAccounts();

  const { data: scheduledPosts, isLoading } = useQuery({
    queryKey: ["scheduledPosts"],
    queryFn: apiClient.listScheduledPosts,
  });

  const deleteMutation = useMutation(apiClient.deleteScheduledPost, {
    onSuccess: () => {
      toast({ title: "Post unscheduled successfully!" });
      queryClient.invalidateQueries(queryKeys.scheduledPosts());
    },
    onError: (error) => {
      toast({
        title: "Failed to unschedule post",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  if (accountsLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!connectedAccounts || connectedAccounts.length === 0) {
    return (
      <EmptyState
        title="No Connected Accounts"
        description="Connect your social media accounts to schedule and manage your posts."
      >
        <Button asChild>
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 gradient-text">Scheduler</h1>
      <p className="text-muted-foreground text-lg mb-8">
        Manage your scheduled posts across all platforms.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : !scheduledPosts || scheduledPosts.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-12 w-12" />}
              title="No Posts Scheduled"
              description="You haven't scheduled any posts yet. You can schedule content from the Viral Threads or Video Library tabs."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {post.content}
                    </TableCell>
                    <TableCell className="capitalize">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(post.platform)}
                        {post.platform}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(post.scheduledAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          post.status === "POSTED"
                            ? "default"
                            : post.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              deleteMutation.isLoading &&
                              deleteMutation.variables?.postId === post.id
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the scheduled post. This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteMutation.mutate({ postId: post.id })
                              }
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
