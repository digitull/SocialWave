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

actor Analytics {
  // Types
  public type AnalyticsEvent = {
    id: Text;
    eventType: Text; // "content_view", "content_like", "content_share", etc.
    userId: ?Principal;
    contentId: ?Text;
    platform: Text;
    metadata: [(Text, Text)];
    timestamp: Int;
  };

  public type UserEngagement = {
    userId: Principal;
    totalViews: Nat;
    totalLikes: Nat;
    totalShares: Nat;
    totalComments: Nat;
    avgEngagementRate: Float;
    lastActivity: Int;
    topPlatforms: [Text];
  };

  public type ContentPerformance = {
    contentId: Text;
    views: Nat;
    likes: Nat;
    shares: Nat;
    comments: Nat;
    engagementRate: Float;
    viralCoefficient: Float;
    peakEngagement: Int;
    performanceByPlatform: [(Text, Nat)];
  };

  public type PlatformAnalytics = {
    platform: Text;
    totalEvents: Nat;
    uniqueUsers: Nat;
    avgEngagementRate: Float;
    topContentTypes: [Text];
    peakHours: [Nat];
  };

  public type TimeSeriesData = {
    timestamp: Int;
    value: Float;
    platform: ?Text;
    contentType: ?Text;
  };

  // State
  private stable var eventEntries: [(Text, AnalyticsEvent)] = [];
  private stable var userEngagementEntries: [(Principal, UserEngagement)] = [];
  private stable var contentPerformanceEntries: [(Text, ContentPerformance)] = [];
  
  private var events = HashMap.HashMap<Text, AnalyticsEvent>(0, Text.equal, Text.hash);
  private var userEngagements = HashMap.HashMap<Principal, UserEngagement>(0, Principal.equal, Principal.hash);
  private var contentPerformances = HashMap.HashMap<Text, ContentPerformance>(0, Text.equal, Text.hash);
  
  private stable var nextEventId: Nat = 1;

  // System functions
  system func preupgrade() {
    eventEntries := Iter.toArray(events.entries());
    userEngagementEntries := Iter.toArray(userEngagements.entries());
    contentPerformanceEntries := Iter.toArray(contentPerformances.entries());
  };

  system func postupgrade() {
    events := HashMap.fromIter<Text, AnalyticsEvent>(eventEntries.vals(), eventEntries.size(), Text.equal, Text.hash);
    userEngagements := HashMap.fromIter<Principal, UserEngagement>(userEngagementEntries.vals(), userEngagementEntries.size(), Principal.equal, Principal.hash);
    contentPerformances := HashMap.fromIter<Text, ContentPerformance>(contentPerformanceEntries.vals(), contentPerformanceEntries.size(), Text.equal, Text.hash);
  };

  // Helper functions
  private func generateEventId(): Text {
    let id = "event_" # Nat.toText(nextEventId);
    nextEventId += 1;
    id
  };

  private func getCurrentTime(): Int {
    Time.now()
  };

  // Event Tracking
  public func trackEvent(eventType: Text, userId: ?Principal, contentId: ?Text, platform: Text, metadata: [(Text, Text)]): async Result.Result<Text, Text> {
    let eventId = generateEventId();
    let now = getCurrentTime();
    
    let event: AnalyticsEvent = {
      id = eventId;
      eventType = eventType;
      userId = userId;
      contentId = contentId;
      platform = platform;
      metadata = metadata;
      timestamp = now;
    };
    
    events.put(eventId, event);
    
    // Update user engagement if user is provided
    switch (userId) {
      case (?user) { updateUserEngagement(user, eventType, platform, now) };
      case null { };
    };
    
    // Update content performance if content is provided
    switch (contentId) {
      case (?content) { updateContentPerformance(content, eventType, platform) };
      case null { };
    };
    
    Debug.print("Event tracked: " # eventType # " for platform: " # platform);
    #ok(eventId)
  };

  private func updateUserEngagement(userId: Principal, eventType: Text, platform: Text, timestamp: Int) {
    let existingEngagement = switch (userEngagements.get(userId)) {
      case (?engagement) { engagement };
      case null {
        {
          userId = userId;
          totalViews = 0;
          totalLikes = 0;
          totalShares = 0;
          totalComments = 0;
          avgEngagementRate = 0.0;
          lastActivity = timestamp;
          topPlatforms = [];
        }
      };
    };
    
    let updatedEngagement = switch (eventType) {
      case ("content_view") {
        { existingEngagement with totalViews = existingEngagement.totalViews + 1; lastActivity = timestamp }
      };
      case ("content_like") {
        { existingEngagement with totalLikes = existingEngagement.totalLikes + 1; lastActivity = timestamp }
      };
      case ("content_share") {
        { existingEngagement with totalShares = existingEngagement.totalShares + 1; lastActivity = timestamp }
      };
      case ("content_comment") {
        { existingEngagement with totalComments = existingEngagement.totalComments + 1; lastActivity = timestamp }
      };
      case (_) { { existingEngagement with lastActivity = timestamp } };
    };
    
    userEngagements.put(userId, updatedEngagement);
  };

  private func updateContentPerformance(contentId: Text, eventType: Text, platform: Text) {
    let existingPerformance = switch (contentPerformances.get(contentId)) {
      case (?performance) { performance };
      case null {
        {
          contentId = contentId;
          views = 0;
          likes = 0;
          shares = 0;
          comments = 0;
          engagementRate = 0.0;
          viralCoefficient = 0.0;
          peakEngagement = getCurrentTime();
          performanceByPlatform = [];
        }
      };
    };
    
    let updatedPerformance = switch (eventType) {
      case ("content_view") {
        { existingPerformance with views = existingPerformance.views + 1 }
      };
      case ("content_like") {
        { existingPerformance with likes = existingPerformance.likes + 1 }
      };
      case ("content_share") {
        { existingPerformance with shares = existingPerformance.shares + 1 }
      };
      case ("content_comment") {
        { existingPerformance with comments = existingPerformance.comments + 1 }
      };
      case (_) { existingPerformance };
    };
    
    // Calculate engagement rate
    let totalEngagements = updatedPerformance.likes + updatedPerformance.shares + updatedPerformance.comments;
    let newEngagementRate = if (updatedPerformance.views > 0) {
      Float.fromInt(totalEngagements) / Float.fromInt(updatedPerformance.views)
    } else { 0.0 };
    
    let finalPerformance = { updatedPerformance with engagementRate = newEngagementRate };
    contentPerformances.put(contentId, finalPerformance);
  };

  // Analytics Queries
  public query func getUserEngagement(userId: Principal): async Result.Result<UserEngagement, Text> {
    switch (userEngagements.get(userId)) {
      case (?engagement) { #ok(engagement) };
      case null { #err("User engagement data not found") };
    }
  };

  public query func getContentPerformance(contentId: Text): async Result.Result<ContentPerformance, Text> {
    switch (contentPerformances.get(contentId)) {
      case (?performance) { #ok(performance) };
      case null { #err("Content performance data not found") };
    }
  };

  public query func getTopPerformingContent(limit: Nat): async [ContentPerformance] {
    let allPerformances = Iter.toArray(contentPerformances.vals());
    let sortedPerformances = Array.sort<ContentPerformance>(allPerformances, func(a: ContentPerformance, b: ContentPerformance): {#less; #equal; #greater} {
      if (a.engagementRate > b.engagementRate) { #greater }
      else if (a.engagementRate < b.engagementRate) { #less }
      else { #equal }
    });
    
    if (sortedPerformances.size() > limit) {
      Array.tabulate<ContentPerformance>(limit, func(i: Nat): ContentPerformance { sortedPerformances[i] })
    } else { sortedPerformances }
  };

  public query func getPlatformAnalytics(platform: Text): async PlatformAnalytics {
    let allEvents = Iter.toArray(events.vals());
    let platformEvents = Array.filter<AnalyticsEvent>(allEvents, func(event: AnalyticsEvent): Bool {
      event.platform == platform
    });
    
    let uniqueUsers = Array.foldLeft<AnalyticsEvent, [Principal]>(
      platformEvents,
      [],
      func(acc: [Principal], event: AnalyticsEvent): [Principal] {
        switch (event.userId) {
          case (?userId) {
            if (Array.find<Principal>(acc, func(p: Principal): Bool { Principal.equal(p, userId) }) == null) {
              Array.append<Principal>(acc, [userId])
            } else { acc }
          };
          case null { acc };
        }
      }
    );
    
    {
      platform = platform;
      totalEvents = platformEvents.size();
      uniqueUsers = uniqueUsers.size();
      avgEngagementRate = 0.0; // Simplified calculation
      topContentTypes = ["social-media-post", "thread", "story"];
      peakHours = [9, 12, 15, 18, 21]; // Mock peak hours
    }
  };

  public query func getTimeSeriesData(startTime: Int, endTime: Int, platform: ?Text): async [TimeSeriesData] {
    let allEvents = Iter.toArray(events.vals());
    let filteredEvents = Array.filter<AnalyticsEvent>(allEvents, func(event: AnalyticsEvent): Bool {
      var inTimeRange = event.timestamp >= startTime and event.timestamp <= endTime;
      
      switch (platform) {
        case (?p) { inTimeRange and event.platform == p };
        case null { inTimeRange };
      }
    });
    
    // Group events by hour and create time series data
    // Simplified implementation - in practice, you'd want more sophisticated grouping
    Array.map<AnalyticsEvent, TimeSeriesData>(filteredEvents, func(event: AnalyticsEvent): TimeSeriesData {
      {
        timestamp = event.timestamp;
        value = 1.0; // Each event contributes 1 to the metric
        platform = ?event.platform;
        contentType = null;
      }
    })
  };

  public query func getDashboardStats(): async {
    totalEvents: Nat;
    totalUsers: Nat;
    totalContent: Nat;
    avgEngagementRate: Float;
    topPlatforms: [Text];
    recentEvents: Nat;
  } {
    let allEvents = Iter.toArray(events.vals());
    let allUsers = Iter.toArray(userEngagements.vals());
    let allContent = Iter.toArray(contentPerformances.vals());
    
    let now = getCurrentTime();
    let oneDayAgo = now - (24 * 60 * 60 * 1000_000_000); // 24 hours in nanoseconds
    let recentEvents = Array.filter<AnalyticsEvent>(allEvents, func(event: AnalyticsEvent): Bool {
      event.timestamp >= oneDayAgo
    });
    
    let avgEngagementRate = if (allContent.size() > 0) {
      let totalEngagement = Array.foldLeft<ContentPerformance, Float>(
        allContent,
        0.0,
        func(acc: Float, performance: ContentPerformance): Float { acc + performance.engagementRate }
      );
      totalEngagement / Float.fromInt(allContent.size())
    } else { 0.0 };
    
    {
      totalEvents = allEvents.size();
      totalUsers = allUsers.size();
      totalContent = allContent.size();
      avgEngagementRate = avgEngagementRate;
      topPlatforms = ["twitter", "instagram", "linkedin", "tiktok"];
      recentEvents = recentEvents.size();
    }
  };

  // Real-time Analytics
  public func getEngagementTrends(hours: Nat): async [TimeSeriesData] {
    let now = getCurrentTime();
    let timeRange = Int.fromNat(hours) * 60 * 60 * 1000_000_000; // Convert hours to nanoseconds
    let startTime = now - timeRange;
    
    getTimeSeriesData(startTime, now, null)
  };

  public query func getViralContent(threshold: Float): async [ContentPerformance] {
    let allContent = Iter.toArray(contentPerformances.vals());
    Array.filter<ContentPerformance>(allContent, func(content: ContentPerformance): Bool {
      content.engagementRate >= threshold
    })
  };

  // Batch Analytics Processing
  public func processAnalyticsBatch(events: [AnalyticsEvent]): async Result.Result<Nat, Text> {
    var processed = 0;
    
    for (event in events.vals()) {
      let eventId = generateEventId();
      let eventWithId = {
        id = eventId;
        eventType = event.eventType;
        userId = event.userId;
        contentId = event.contentId;
        platform = event.platform;
        metadata = event.metadata;
        timestamp = event.timestamp;
      };
      
      events.put(eventId, eventWithId);
      processed += 1;
    };
    
    Debug.print("Processed " # Nat.toText(processed) # " analytics events");
    #ok(processed)
  };

  // Health check
  public query func getStatus(): async Text {
    "Analytics canister is operational. Events tracked: " # Nat.toText(events.size())
  };
};