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

actor ContentStorage {
  // Types
  public type ContentItem = {
    id: Text;
    content: Text;
    contentType: Text;
    hash: Text;
    author: Principal;
    createdAt: Int;
    updatedAt: Int;
    metadata: [(Text, Text)];
    isPublic: Bool;
    viralScore: ?Float;
  };

  public type ContentMetadata = {
    views: Nat;
    likes: Nat;
    shares: Nat;
    comments: Nat;
    engagementRate: Float;
    lastInteraction: Int;
  };

  public type StoreContentRequest = {
    content: Text;
    contentType: Text;
    metadata: [(Text, Text)];
    isPublic: Bool;
  };

  public type ContentSearchQuery = {
    contentType: ?Text;
    author: ?Principal;
    isPublic: ?Bool;
    fromDate: ?Int;
    toDate: ?Int;
  };

  // State
  private stable var contentEntries: [(Text, ContentItem)] = [];
  private stable var metadataEntries: [(Text, ContentMetadata)] = [];
  private var contents = HashMap.HashMap<Text, ContentItem>(0, Text.equal, Text.hash);
  private var contentMetadata = HashMap.HashMap<Text, ContentMetadata>(0, Text.equal, Text.hash);
  private stable var nextContentId: Nat = 1;

  // System functions
  system func preupgrade() {
    contentEntries := Iter.toArray(contents.entries());
    metadataEntries := Iter.toArray(contentMetadata.entries());
  };

  system func postupgrade() {
    contents := HashMap.fromIter<Text, ContentItem>(contentEntries.vals(), contentEntries.size(), Text.equal, Text.hash);
    contentMetadata := HashMap.fromIter<Text, ContentMetadata>(metadataEntries.vals(), metadataEntries.size(), Text.equal, Text.hash);
  };

  // Helper functions
  private func generateContentId(): Text {
    let id = "content_" # Nat.toText(nextContentId);
    nextContentId += 1;
    id
  };

  private func getCurrentTime(): Int {
    Time.now()
  };

  private func generateHash(content: Text): Text {
    // Simple hash function for content
    let chars = Text.toIter(content);
    var hash = 0;
    for (char in chars) {
      let charCode = Nat32.toNat(Char.toNat32(char));
      hash := (hash * 31 + charCode) % 1000000;
    };
    "hash_" # Nat.toText(hash)
  };

  // Public functions
  public func storeContent(caller: Principal, request: StoreContentRequest): async Result.Result<Text, Text> {
    let contentId = generateContentId();
    let now = getCurrentTime();
    let contentHash = generateHash(request.content);
    
    let contentItem: ContentItem = {
      id = contentId;
      content = request.content;
      contentType = request.contentType;
      hash = contentHash;
      author = caller;
      createdAt = now;
      updatedAt = now;
      metadata = request.metadata;
      isPublic = request.isPublic;
      viralScore = null;
    };

    let initialMetadata: ContentMetadata = {
      views = 0;
      likes = 0;
      shares = 0;
      comments = 0;
      engagementRate = 0.0;
      lastInteraction = now;
    };

    contents.put(contentId, contentItem);
    contentMetadata.put(contentId, initialMetadata);
    
    Debug.print("Content stored with ID: " # contentId);
    #ok(contentId)
  };

  public query func getContent(contentId: Text): async Result.Result<ContentItem, Text> {
    switch (contents.get(contentId)) {
      case (?content) { #ok(content) };
      case null { #err("Content not found") };
    }
  };

  public query func listContent(query: ContentSearchQuery): async [ContentItem] {
    let allContent = Iter.toArray(contents.vals());
    
    Array.filter<ContentItem>(allContent, func(content: ContentItem): Bool {
      var matches = true;
      
      switch (query.contentType) {
        case (?cType) { matches := matches and (content.contentType == cType) };
        case null { };
      };
      
      switch (query.author) {
        case (?author) { matches := matches and Principal.equal(content.author, author) };
        case null { };
      };
      
      switch (query.isPublic) {
        case (?isPublic) { matches := matches and (content.isPublic == isPublic) };
        case null { };
      };
      
      switch (query.fromDate) {
        case (?fromDate) { matches := matches and (content.createdAt >= fromDate) };
        case null { };
      };
      
      switch (query.toDate) {
        case (?toDate) { matches := matches and (content.createdAt <= toDate) };
        case null { };
      };
      
      matches
    })
  };

  public func updateViralScore(caller: Principal, contentId: Text, score: Float): async Result.Result<(), Text> {
    switch (contents.get(contentId)) {
      case (?content) {
        if (Principal.equal(content.author, caller)) {
          let updatedContent = {
            content with
            viralScore = ?score;
            updatedAt = getCurrentTime();
          };
          contents.put(contentId, updatedContent);
          Debug.print("Viral score updated for content: " # contentId # " to: " # Float.toText(score));
          #ok(())
        } else {
          #err("Unauthorized: Only content author can update viral score")
        }
      };
      case null { #err("Content not found") };
    }
  };

  public func recordInteraction(contentId: Text, interactionType: Text): async Result.Result<(), Text> {
    switch (contentMetadata.get(contentId)) {
      case (?metadata) {
        let updatedMetadata = switch (interactionType) {
          case ("view") { { metadata with views = metadata.views + 1; lastInteraction = getCurrentTime() } };
          case ("like") { { metadata with likes = metadata.likes + 1; lastInteraction = getCurrentTime() } };
          case ("share") { { metadata with shares = metadata.shares + 1; lastInteraction = getCurrentTime() } };
          case ("comment") { { metadata with comments = metadata.comments + 1; lastInteraction = getCurrentTime() } };
          case (_) { metadata };
        };
        
        let totalInteractions = updatedMetadata.likes + updatedMetadata.shares + updatedMetadata.comments;
        let newEngagementRate = if (updatedMetadata.views > 0) {
          Float.fromInt(totalInteractions) / Float.fromInt(updatedMetadata.views)
        } else { 0.0 };
        
        let finalMetadata = { updatedMetadata with engagementRate = newEngagementRate };
        contentMetadata.put(contentId, finalMetadata);
        Debug.print("Interaction recorded: " # interactionType # " for content: " # contentId);
        #ok(())
      };
      case null { #err("Content metadata not found") };
    }
  };

  public query func getContentMetadata(contentId: Text): async Result.Result<ContentMetadata, Text> {
    switch (contentMetadata.get(contentId)) {
      case (?metadata) { #ok(metadata) };
      case null { #err("Content metadata not found") };
    }
  };

  public query func getTopContent(limit: Nat): async [ContentItem] {
    let allContent = Iter.toArray(contents.vals());
    let publicContent = Array.filter<ContentItem>(allContent, func(content: ContentItem): Bool { content.isPublic });
    
    // Sort by viral score (descending)
    let sortedContent = Array.sort<ContentItem>(publicContent, func(a: ContentItem, b: ContentItem): {#less; #equal; #greater} {
      switch (a.viralScore, b.viralScore) {
        case (?scoreA, ?scoreB) {
          if (scoreA > scoreB) { #greater }
          else if (scoreA < scoreB) { #less }
          else { #equal }
        };
        case (?_, null) { #greater };
        case (null, ?_) { #less };
        case (null, null) { #equal };
      }
    });
    
    let limitedContent = if (sortedContent.size() > limit) {
      Array.tabulate<ContentItem>(limit, func(i: Nat): ContentItem { sortedContent[i] })
    } else { sortedContent };
    
    limitedContent
  };

  public func deleteContent(caller: Principal, contentId: Text): async Result.Result<(), Text> {
    switch (contents.get(contentId)) {
      case (?content) {
        if (Principal.equal(content.author, caller)) {
          contents.delete(contentId);
          contentMetadata.delete(contentId);
          Debug.print("Content deleted: " # contentId);
          #ok(())
        } else {
          #err("Unauthorized: Only content author can delete content")
        }
      };
      case null { #err("Content not found") };
    }
  };

  public query func getStats(): async { totalContent: Nat; publicContent: Nat; totalViews: Nat; totalEngagements: Nat } {
    let allContent = Iter.toArray(contents.vals());
    let publicContent = Array.filter<ContentItem>(allContent, func(content: ContentItem): Bool { content.isPublic });
    
    let allMetadata = Iter.toArray(contentMetadata.vals());
    let totalViews = Array.foldLeft<ContentMetadata, Nat>(allMetadata, 0, func(acc: Nat, metadata: ContentMetadata): Nat { acc + metadata.views });
    let totalEngagements = Array.foldLeft<ContentMetadata, Nat>(allMetadata, 0, func(acc: Nat, metadata: ContentMetadata): Nat { acc + metadata.likes + metadata.shares + metadata.comments });
    
    {
      totalContent = allContent.size();
      publicContent = publicContent.size();
      totalViews = totalViews;
      totalEngagements = totalEngagements;
    }
  };

  // Brand Vibe Intelligence Layer functions
  public func tagContentWithBrandVibe(caller: Principal, contentId: Text, brandVibeData: [(Text, Text)]): async Result.Result<(), Text> {
    switch (contents.get(contentId)) {
      case (?content) {
        if (Principal.equal(content.author, caller)) {
          let existingMetadata = content.metadata;
          let updatedMetadata = Array.append(existingMetadata, brandVibeData);
          let updatedContent = {
            content with
            metadata = updatedMetadata;
            updatedAt = getCurrentTime();
          };
          contents.put(contentId, updatedContent);
          Debug.print("Brand vibe data added to content: " # contentId);
          #ok(())
        } else {
          #err("Unauthorized: Only content author can update brand vibe data")
        }
      };
      case null { #err("Content not found") };
    }
  };

  public query func getContentByBrandVibe(brandVibeTag: Text): async [ContentItem] {
    let allContent = Iter.toArray(contents.vals());
    Array.filter<ContentItem>(allContent, func(content: ContentItem): Bool {
      Array.find<(Text, Text)>(content.metadata, func((key, value): (Text, Text)): Bool {
        key == "brand_vibe" and value == brandVibeTag
      }) != null
    })
  };
};
