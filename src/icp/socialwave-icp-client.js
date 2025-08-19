// SocialWave ICP Integration Client
import { Principal } from "@dfinity/principal";
import { 
  ICPCanisterClient, 
  contentStorageIdl, 
  socialWaveBackendIdl, 
  analyticsIdl,
  CANISTER_CONFIG,
  DEFAULT_CANISTER_IDS 
} from "./canister-interfaces.js";

export class SocialWaveICP {
  constructor(canisterIds = DEFAULT_CANISTER_IDS, options = {}) {
    const isLocal = process.env.NODE_ENV === 'development' || options.local;
    const config = isLocal ? CANISTER_CONFIG.local : CANISTER_CONFIG.mainnet;
    
    this.contentStorageClient = new ICPCanisterClient(
      canisterIds.contentStorage,
      contentStorageIdl,
      config
    );
    
    this.socialwaveBackendClient = new ICPCanisterClient(
      canisterIds.socialwaveBackend,
      socialWaveBackendIdl,
      config
    );
    
    this.analyticsClient = new ICPCanisterClient(
      canisterIds.analytics,
      analyticsIdl,
      config
    );

    this.isLocal = isLocal;
    this.currentUser = null;
  }

  setCurrentUser(principal) {
    this.currentUser = principal;
  }

  getCurrentUser() {
    return this.currentUser || Principal.fromText("2vxsx-fae"); // Default anonymous principal
  }

  // Content Storage Methods
  async storeContent(content, contentType, metadata = [], isPublic = true) {
    try {
      const caller = this.getCurrentUser();
      const request = {
        content,
        contentType,
        metadata,
        isPublic,
      };
      
      const result = await this.contentStorageClient.call("storeContent", caller, request);
      
      if (result.ok) {
        // Track the content creation event
        await this.trackAnalyticsEvent("content_created", null, result.ok, "socialwave", [
          ["content_type", contentType],
          ["is_public", isPublic.toString()],
        ]);
        
        return { success: true, contentId: result.ok };
      } else {
        console.error("Failed to store content:", result.err);
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error storing content:", error);
      return { success: false, error: error.message };
    }
  }

  async getContent(contentId) {
    try {
      const result = await this.contentStorageClient.call("getContent", contentId);
      
      if (result.ok) {
        // Track content view
        await this.recordContentInteraction(contentId, "view");
        return { success: true, content: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error getting content:", error);
      return { success: false, error: error.message };
    }
  }

  async listContent(query = {}) {
    try {
      const content = await this.contentStorageClient.call("listContent", query);
      return { success: true, content };
    } catch (error) {
      console.error("Error listing content:", error);
      return { success: false, error: error.message };
    }
  }

  async updateViralScore(contentId, score) {
    try {
      const caller = this.getCurrentUser();
      const result = await this.contentStorageClient.call("updateViralScore", caller, contentId, score);
      
      if (result.ok) {
        return { success: true };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error updating viral score:", error);
      return { success: false, error: error.message };
    }
  }

  async recordContentInteraction(contentId, interactionType) {
    try {
      const result = await this.contentStorageClient.call("recordInteraction", contentId, interactionType);
      
      if (result.ok) {
        // Also track in analytics
        await this.trackAnalyticsEvent(`content_${interactionType}`, null, contentId, "socialwave", []);
        return { success: true };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error recording interaction:", error);
      return { success: false, error: error.message };
    }
  }

  async getTopContent(limit = 10) {
    try {
      const content = await this.contentStorageClient.call("getTopContent", limit);
      return { success: true, content };
    } catch (error) {
      console.error("Error getting top content:", error);
      return { success: false, error: error.message };
    }
  }

  async getContentStats() {
    try {
      const stats = await this.contentStorageClient.call("getStats");
      return { success: true, stats };
    } catch (error) {
      console.error("Error getting content stats:", error);
      return { success: false, error: error.message };
    }
  }

  // Brand Vibe Methods
  async tagContentWithBrandVibe(contentId, brandVibeData) {
    try {
      const caller = this.getCurrentUser();
      const result = await this.contentStorageClient.call("tagContentWithBrandVibe", caller, contentId, brandVibeData);
      
      if (result.ok) {
        return { success: true };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error tagging content with brand vibe:", error);
      return { success: false, error: error.message };
    }
  }

  async getContentByBrandVibe(brandVibeTag) {
    try {
      const content = await this.contentStorageClient.call("getContentByBrandVibe", brandVibeTag);
      return { success: true, content };
    } catch (error) {
      console.error("Error getting content by brand vibe:", error);
      return { success: false, error: error.message };
    }
  }

  // AI Model Methods
  async storeAIModel(name, version, modelType, capabilities, metadata = []) {
    try {
      const caller = this.getCurrentUser();
      const request = {
        name,
        version,
        modelType,
        capabilities,
        metadata,
      };
      
      const result = await this.socialwaveBackendClient.call("storeModel", caller, request);
      
      if (result.ok) {
        return { success: true, modelId: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error storing AI model:", error);
      return { success: false, error: error.message };
    }
  }

  async getAIModel(modelId) {
    try {
      const result = await this.socialwaveBackendClient.call("getModel", modelId);
      
      if (result.ok) {
        return { success: true, model: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error getting AI model:", error);
      return { success: false, error: error.message };
    }
  }

  async listAIModels(query = {}) {
    try {
      const models = await this.socialwaveBackendClient.call("listModels", query);
      return { success: true, models };
    } catch (error) {
      console.error("Error listing AI models:", error);
      return { success: false, error: error.message };
    }
  }

  // Viral Analysis Methods
  async analyzeViralPotential(contentId, content) {
    try {
      const result = await this.socialwaveBackendClient.call("analyzeViralPotential", contentId, content);
      
      if (result.ok) {
        return { success: true, predictionId: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error analyzing viral potential:", error);
      return { success: false, error: error.message };
    }
  }

  async getViralPrediction(predictionId) {
    try {
      const result = await this.socialwaveBackendClient.call("getViralPrediction", predictionId);
      
      if (result.ok) {
        return { success: true, prediction: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error getting viral prediction:", error);
      return { success: false, error: error.message };
    }
  }

  // Trend Detection Methods
  async detectTrends() {
    try {
      const trends = await this.socialwaveBackendClient.call("detectTrends");
      return { success: true, trends };
    } catch (error) {
      console.error("Error detecting trends:", error);
      return { success: false, error: error.message };
    }
  }

  async getTrendingTopics(limit = 10) {
    try {
      const trends = await this.socialwaveBackendClient.call("getTrendingTopics", limit);
      return { success: true, trends };
    } catch (error) {
      console.error("Error getting trending topics:", error);
      return { success: false, error: error.message };
    }
  }

  // Brand Vibe Intelligence Methods
  async createBrandVibeProfile(name, persona, tone, guidelines, keyPhrases, avoidPhrases) {
    try {
      const caller = this.getCurrentUser();
      const result = await this.socialwaveBackendClient.call(
        "createBrandVibeProfile",
        caller,
        name,
        persona,
        tone,
        guidelines,
        keyPhrases,
        avoidPhrases
      );
      
      if (result.ok) {
        return { success: true, profileId: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error creating brand vibe profile:", error);
      return { success: false, error: error.message };
    }
  }

  async analyzeBrandAlignment(brandVibeId, content) {
    try {
      const result = await this.socialwaveBackendClient.call("analyzeBrandAlignment", brandVibeId, content);
      
      if (result.ok) {
        return { success: true, alignmentScore: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error analyzing brand alignment:", error);
      return { success: false, error: error.message };
    }
  }

  async getBrandVibeProfile(profileId) {
    try {
      const result = await this.socialwaveBackendClient.call("getBrandVibeProfile", profileId);
      
      if (result.ok) {
        return { success: true, profile: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error getting brand vibe profile:", error);
      return { success: false, error: error.message };
    }
  }

  async listBrandVibeProfiles(owner = null) {
    try {
      const profiles = await this.socialwaveBackendClient.call("listBrandVibeProfiles", owner ? [owner] : []);
      return { success: true, profiles };
    } catch (error) {
      console.error("Error listing brand vibe profiles:", error);
      return { success: false, error: error.message };
    }
  }

  // Analytics Methods
  async trackAnalyticsEvent(eventType, userId = null, contentId = null, platform = "socialwave", metadata = []) {
    try {
      const result = await this.analyticsClient.call(
        "trackEvent",
        eventType,
        userId ? [userId] : [],
        contentId ? [contentId] : [],
        platform,
        metadata
      );
      
      if (result.ok) {
        return { success: true, eventId: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error tracking analytics event:", error);
      return { success: false, error: error.message };
    }
  }

  async getUserEngagement(userId) {
    try {
      const result = await this.analyticsClient.call("getUserEngagement", userId);
      
      if (result.ok) {
        return { success: true, engagement: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error getting user engagement:", error);
      return { success: false, error: error.message };
    }
  }

  async getContentPerformance(contentId) {
    try {
      const result = await this.analyticsClient.call("getContentPerformance", contentId);
      
      if (result.ok) {
        return { success: true, performance: result.ok };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Error getting content performance:", error);
      return { success: false, error: error.message };
    }
  }

  async getDashboardStats() {
    try {
      const stats = await this.analyticsClient.call("getDashboardStats");
      return { success: true, stats };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return { success: false, error: error.message };
    }
  }

  async getEngagementTrends(hours = 24) {
    try {
      const trends = await this.analyticsClient.call("getEngagementTrends", hours);
      return { success: true, trends };
    } catch (error) {
      console.error("Error getting engagement trends:", error);
      return { success: false, error: error.message };
    }
  }

  // Combined Analytics
  async getDecentralizedAnalytics() {
    try {
      const [backendStats, contentStats, analyticsStats] = await Promise.all([
        this.socialwaveBackendClient.call("getStats"),
        this.contentStorageClient.call("getStats"),
        this.analyticsClient.call("getDashboardStats"),
      ]);

      return {
        success: true,
        analytics: {
          backend: backendStats,
          content: contentStats,
          analytics: analyticsStats,
        },
      };
    } catch (error) {
      console.error("Error getting decentralized analytics:", error);
      return { success: false, error: error.message };
    }
  }

  // Health Checks
  async checkCanisterHealth() {
    try {
      const [backendHealth, analyticsHealth] = await Promise.all([
        this.socialwaveBackendClient.call("greet", "Health Check"),
        this.analyticsClient.call("getStatus"),
      ]);

      return {
        success: true,
        health: {
          backend: backendHealth,
          analytics: analyticsHealth,
          contentStorage: "Connected", // Content storage doesn't have a health endpoint
        },
      };
    } catch (error) {
      console.error("Error checking canister health:", error);
      return { success: false, error: error.message };
    }
  }

  // Utility Methods
  isConnected() {
    return this.contentStorageClient && this.socialwaveBackendClient && this.analyticsClient;
  }

  getCanisterIds() {
    return {
      contentStorage: this.contentStorageClient.canisterId,
      socialwaveBackend: this.socialwaveBackendClient.canisterId,
      analytics: this.analyticsClient.canisterId,
    };
  }
}

// Create a singleton instance for the app
export const socialWaveICP = new SocialWaveICP();

// Helper functions for easy integration
export async function storeGeneratedContent(content, viralScore, platform = "socialwave", brandVibeData = []) {
  try {
    // Store content on ICP
    const result = await socialWaveICP.storeContent(
      content,
      "social-media-post",
      [["platform", platform], ["generated-by", "socialwave-ai"]],
      true
    );
    
    if (result.success) {
      const contentId = result.contentId;
      
      // Update viral score if provided
      if (viralScore !== null && viralScore !== undefined) {
        await socialWaveICP.updateViralScore(contentId, viralScore);
      }
      
      // Tag with brand vibe data if provided
      if (brandVibeData.length > 0) {
        await socialWaveICP.tagContentWithBrandVibe(contentId, brandVibeData);
      }
      
      console.log("Content stored on ICP with ID:", contentId);
      return { success: true, contentId, icpUrl: `https://ic0.app/content/${contentId}` };
    } else {
      console.error("Failed to store content on ICP:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error storing generated content:", error);
    return { success: false, error: error.message };
  }
}

export async function getDecentralizedAnalytics() {
  try {
    return await socialWaveICP.getDecentralizedAnalytics();
  } catch (error) {
    console.error("Error getting decentralized analytics:", error);
    return { success: false, error: error.message };
  }
}

export async function analyzeContentViralPotential(content) {
  try {
    // Generate a temporary content ID for analysis
    const tempContentId = `temp_${Date.now()}`;
    
    const result = await socialWaveICP.analyzeViralPotential(tempContentId, content);
    
    if (result.success) {
      const prediction = await socialWaveICP.getViralPrediction(result.predictionId);
      if (prediction.success) {
        return {
          success: true,
          viralScore: prediction.prediction.predictedScore,
          confidence: prediction.prediction.confidence,
          factors: prediction.prediction.factors,
        };
      }
    }
    
    return { success: false, error: result.error };
  } catch (error) {
    console.error("Error analyzing viral potential:", error);
    return { success: false, error: error.message };
  }
}

export default socialWaveICP;