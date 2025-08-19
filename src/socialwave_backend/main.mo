import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";

actor SocialWaveBackend {
  // Types
  public type AIModel = {
    id: Text;
    name: Text;
    version: Text;
    modelType: Text; // "content-generation", "viral-analysis", "trend-detection", etc.
    capabilities: [Text];
    owner: Principal;
    createdAt: Int;
    updatedAt: Int;
    isActive: Bool;
    metadata: [(Text, Text)];
  };

  public type ModelMetrics = {
    modelId: Text;
    usageCount: Nat;
    lastUsed: Int;
    avgResponseTime: Nat;
    successRate: Float;
    totalTokensProcessed: Nat;
  };

  public type StoreModelRequest = {
    name: Text;
    version: Text;
    modelType: Text;
    capabilities: [Text];
    metadata: [(Text, Text)];
  };

  public type ModelSearchQuery = {
    name: ?Text;
    modelType: ?Text;
    capabilities: ?[Text];
    owner: ?Principal;
    isActive: ?Bool;
  };

  public type ViralPrediction = {
    contentId: Text;
    predictedScore: Float;
    confidence: Float;
    factors: [(Text, Float)];
    timestamp: Int;
  };

  public type TrendData = {
    id: Text;
    topic: Text;
    score: Float;
    momentum: Float;
    category: Text;
    sources: [Text];
    timestamp: Int;
  };

  public type BrandVibeProfile = {
    id: Text;
    name: Text;
    persona: Text;
    tone: Text;
    guidelines: Text;
    keyPhrases: [Text];
    avoidPhrases: [Text];
    owner: Principal;
    createdAt: Int;
    updatedAt: Int;
  };

  // State
  private stable var modelEntries: [(Text, AIModel)] = [];
  private stable var metricsEntries: [(Text, ModelMetrics)] = [];
  private stable var predictionEntries: [(Text, ViralPrediction)] = [];
  private stable var trendEntries: [(Text, TrendData)] = [];
  private stable var brandVibeEntries: [(Text, BrandVibeProfile)] = [];

  private var models = HashMap.HashMap<Text, AIModel>(0, Text.equal, Text.hash);
  private var metrics = HashMap.HashMap<Text, ModelMetrics>(0, Text.equal, Text.hash);
  private var predictions = HashMap.HashMap<Text, ViralPrediction>(0, Text.equal, Text.hash);
  private var trends = HashMap.HashMap<Text, TrendData>(0, Text.equal, Text.hash);
  private var brandVibes = HashMap.HashMap<Text, BrandVibeProfile>(0, Text.equal, Text.hash);

  private stable var nextModelId: Nat = 1;
  private stable var nextPredictionId: Nat = 1;
  private stable var nextTrendId: Nat = 1;
  private stable var nextBrandVibeId: Nat = 1;

  // System functions
  system func preupgrade() {
    modelEntries := Iter.toArray(models.entries());
    metricsEntries := Iter.toArray(metrics.entries());
    predictionEntries := Iter.toArray(predictions.entries());
    trendEntries := Iter.toArray(trends.entries());
    brandVibeEntries := Iter.toArray(brandVibes.entries());
  };

  system func postupgrade() {
    models := HashMap.fromIter<Text, AIModel>(modelEntries.vals(), modelEntries.size(), Text.equal, Text.hash);
    metrics := HashMap.fromIter<Text, ModelMetrics>(metricsEntries.vals(), metricsEntries.size(), Text.equal, Text.hash);
    predictions := HashMap.fromIter<Text, ViralPrediction>(predictionEntries.vals(), predictionEntries.size(), Text.equal, Text.hash);
    trends := HashMap.fromIter<Text, TrendData>(trendEntries.vals(), trendEntries.size(), Text.equal, Text.hash);
    brandVibes := HashMap.fromIter<Text, BrandVibeProfile>(brandVibeEntries.vals(), brandVibeEntries.size(), Text.equal, Text.hash);
  };

  // Helper functions
  private func generateModelId(): Text {
    let id = "model_" # Nat.toText(nextModelId);
    nextModelId += 1;
    id
  };

  private func generatePredictionId(): Text {
    let id = "prediction_" # Nat.toText(nextPredictionId);
    nextPredictionId += 1;
    id
  };

  private func generateTrendId(): Text {
    let id = "trend_" # Nat.toText(nextTrendId);
    nextTrendId += 1;
    id
  };

  private func generateBrandVibeId(): Text {
    let id = "brandvibe_" # Nat.toText(nextBrandVibeId);
    nextBrandVibeId += 1;
    id
  };

  private func getCurrentTime(): Int {
    Time.now()
  };

  // AI Model Management
  public func storeModel(caller: Principal, request: StoreModelRequest): async Result.Result<Text, Text> {
    let modelId = generateModelId();
    let now = getCurrentTime();
    
    let model: AIModel = {
      id = modelId;
      name = request.name;
      version = request.version;
      modelType = request.modelType;
      capabilities = request.capabilities;
      owner = caller;
      createdAt = now;
      updatedAt = now;
      isActive = true;
      metadata = request.metadata;
    };

    let initialMetrics: ModelMetrics = {
      modelId = modelId;
      usageCount = 0;
      lastUsed = now;
      avgResponseTime = 0;
      successRate = 1.0;
      totalTokensProcessed = 0;
    };

    models.put(modelId, model);
    metrics.put(modelId, initialMetrics);
    
    Debug.print("AI Model stored with ID: " # modelId);
    #ok(modelId)
  };

  public query func getModel(modelId: Text): async Result.Result<AIModel, Text> {
    switch (models.get(modelId)) {
      case (?model) { #ok(model) };
      case null { #err("Model not found") };
    }
  };

  public query func listModels(query: ModelSearchQuery): async [AIModel] {
    let allModels = Iter.toArray(models.vals());
    
    Array.filter<AIModel>(allModels, func(model: AIModel): Bool {
      var matches = true;
      
      switch (query.name) {
        case (?name) { matches := matches and Text.contains(model.name, #text name) };
        case null { };
      };
      
      switch (query.modelType) {
        case (?mType) { matches := matches and (model.modelType == mType) };
        case null { };
      };
      
      switch (query.owner) {
        case (?owner) { matches := matches and Principal.equal(model.owner, owner) };
        case null { };
      };
      
      switch (query.isActive) {
        case (?active) { matches := matches and (model.isActive == active) };
        case null { };
      };
      
      matches
    })
  };

  public func recordModelUsage(modelId: Text, responseTime: Nat, success: Bool, tokensProcessed: Nat): async Result.Result<(), Text> {
    switch (metrics.get(modelId)) {
      case (?currentMetrics) {
        let newUsageCount = currentMetrics.usageCount + 1;
        let newAvgResponseTime = (currentMetrics.avgResponseTime * currentMetrics.usageCount + responseTime) / newUsageCount;
        let newSuccessRate = if (success) {
          (currentMetrics.successRate * Float.fromInt(currentMetrics.usageCount) + 1.0) / Float.fromInt(newUsageCount)
        } else {
          (currentMetrics.successRate * Float.fromInt(currentMetrics.usageCount)) / Float.fromInt(newUsageCount)
        };
        
        let updatedMetrics: ModelMetrics = {
          currentMetrics with
          usageCount = newUsageCount;
          lastUsed = getCurrentTime();
          avgResponseTime = newAvgResponseTime;
          successRate = newSuccessRate;
          totalTokensProcessed = currentMetrics.totalTokensProcessed + tokensProcessed;
        };
        
        metrics.put(modelId, updatedMetrics);
        Debug.print("Model usage recorded for: " # modelId);
        #ok(())
      };
      case null { #err("Model metrics not found") };
    }
  };

  // Viral Content Analysis
  public func analyzeViralPotential(contentId: Text, content: Text): async Result.Result<Text, Text> {
    let predictionId = generatePredictionId();
    let now = getCurrentTime();
    
    // Simple viral score calculation (in real implementation, this would use ML models)
    let contentLength = Text.size(content);
    let hasHashtags = Text.contains(content, #char '#');
    let hasMentions = Text.contains(content, #char '@');
    let hasEmojis = Text.contains(content, #text "😀") or Text.contains(content, #text "🔥");
    
    var score = 0.5; // Base score
    if (contentLength > 50 and contentLength < 280) { score += 0.1 };
    if (hasHashtags) { score += 0.15 };
    if (hasMentions) { score += 0.1 };
    if (hasEmojis) { score += 0.1 };
    
    let prediction: ViralPrediction = {
      contentId = contentId;
      predictedScore = score;
      confidence = 0.75;
      factors = [
        ("length_optimized", if (contentLength > 50 and contentLength < 280) { 0.1 } else { 0.0 }),
        ("has_hashtags", if (hasHashtags) { 0.15 } else { 0.0 }),
        ("has_mentions", if (hasMentions) { 0.1 } else { 0.0 }),
        ("has_emojis", if (hasEmojis) { 0.1 } else { 0.0 }),
      ];
      timestamp = now;
    };
    
    predictions.put(predictionId, prediction);
    Debug.print("Viral analysis completed for content: " # contentId # " with score: " # Float.toText(score));
    #ok(predictionId)
  };

  public query func getViralPrediction(predictionId: Text): async Result.Result<ViralPrediction, Text> {
    switch (predictions.get(predictionId)) {
      case (?prediction) { #ok(prediction) };
      case null { #err("Prediction not found") };
    }
  };

  // Trend Detection
  public func detectTrends(): async [TrendData] {
    // In a real implementation, this would analyze social media data
    // For demo purposes, we'll return some mock trending topics
    let now = getCurrentTime();
    
    let mockTrends = [
      {
        id = generateTrendId();
        topic = "AI Innovation";
        score = 0.85;
        momentum = 0.15;
        category = "Technology";
        sources = ["twitter", "linkedin", "reddit"];
        timestamp = now;
      },
      {
        id = generateTrendId();
        topic = "Sustainable Energy";
        score = 0.72;
        momentum = 0.08;
        category = "Environment";
        sources = ["twitter", "news"];
        timestamp = now;
      },
      {
        id = generateTrendId();
        topic = "Remote Work";
        score = 0.68;
        momentum = -0.05;
        category = "Work";
        sources = ["linkedin", "blogs"];
        timestamp = now;
      },
    ];
    
    for (trend in mockTrends.vals()) {
      trends.put(trend.id, trend);
    };
    
    mockTrends
  };

  public query func getTrendingTopics(limit: Nat): async [TrendData] {
    let allTrends = Iter.toArray(trends.vals());
    let sortedTrends = Array.sort<TrendData>(allTrends, func(a: TrendData, b: TrendData): {#less; #equal; #greater} {
      if (a.score > b.score) { #greater }
      else if (a.score < b.score) { #less }
      else { #equal }
    });
    
    if (sortedTrends.size() > limit) {
      Array.tabulate<TrendData>(limit, func(i: Nat): TrendData { sortedTrends[i] })
    } else { sortedTrends }
  };

  // Brand Vibe Intelligence
  public func createBrandVibeProfile(caller: Principal, name: Text, persona: Text, tone: Text, guidelines: Text, keyPhrases: [Text], avoidPhrases: [Text]): async Result.Result<Text, Text> {
    let profileId = generateBrandVibeId();
    let now = getCurrentTime();
    
    let profile: BrandVibeProfile = {
      id = profileId;
      name = name;
      persona = persona;
      tone = tone;
      guidelines = guidelines;
      keyPhrases = keyPhrases;
      avoidPhrases = avoidPhrases;
      owner = caller;
      createdAt = now;
      updatedAt = now;
    };
    
    brandVibes.put(profileId, profile);
    Debug.print("Brand vibe profile created: " # profileId);
    #ok(profileId)
  };

  public func analyzeBrandAlignment(brandVibeId: Text, content: Text): async Result.Result<Float, Text> {
    switch (brandVibes.get(brandVibeId)) {
      case (?profile) {
        var alignmentScore = 0.5; // Base alignment
        
        // Check for key phrases
        for (phrase in profile.keyPhrases.vals()) {
          if (Text.contains(content, #text phrase)) {
            alignmentScore += 0.1;
          };
        };
        
        // Check for avoid phrases (penalty)
        for (phrase in profile.avoidPhrases.vals()) {
          if (Text.contains(content, #text phrase)) {
            alignmentScore -= 0.2;
          };
        };
        
        // Ensure score is between 0 and 1
        if (alignmentScore > 1.0) { alignmentScore := 1.0 };
        if (alignmentScore < 0.0) { alignmentScore := 0.0 };
        
        Debug.print("Brand alignment score for " # brandVibeId # ": " # Float.toText(alignmentScore));
        #ok(alignmentScore)
      };
      case null { #err("Brand vibe profile not found") };
    }
  };

  public query func getBrandVibeProfile(profileId: Text): async Result.Result<BrandVibeProfile, Text> {
    switch (brandVibes.get(profileId)) {
      case (?profile) { #ok(profile) };
      case null { #err("Brand vibe profile not found") };
    }
  };

  public query func listBrandVibeProfiles(owner: ?Principal): async [BrandVibeProfile] {
    let allProfiles = Iter.toArray(brandVibes.vals());
    
    switch (owner) {
      case (?ownerPrincipal) {
        Array.filter<BrandVibeProfile>(allProfiles, func(profile: BrandVibeProfile): Bool {
          Principal.equal(profile.owner, ownerPrincipal)
        })
      };
      case null { allProfiles };
    }
  };

  // Analytics and Stats
  public query func getStats(): async { 
    totalModels: Nat; 
    activeModels: Nat; 
    totalUsage: Nat; 
    totalPredictions: Nat;
    totalTrends: Nat;
    totalBrandProfiles: Nat;
  } {
    let allModels = Iter.toArray(models.vals());
    let activeModels = Array.filter<AIModel>(allModels, func(model: AIModel): Bool { model.isActive });
    
    let totalUsage = Array.foldLeft<ModelMetrics, Nat>(
      Iter.toArray(metrics.vals()),
      0,
      func(acc: Nat, metric: ModelMetrics): Nat { acc + metric.usageCount }
    );
    
    {
      totalModels = allModels.size();
      activeModels = activeModels.size();
      totalUsage = totalUsage;
      totalPredictions = predictions.size();
      totalTrends = trends.size();
      totalBrandProfiles = brandVibes.size();
    }
  };

  // Health check
  public query func greet(name: Text): async Text {
    "Hello, " # name # "! SocialWave AI Backend is running on ICP."
  };
};
