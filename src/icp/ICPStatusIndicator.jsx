import React, { useState, useEffect } from 'react';
import { socialWaveICP } from './socialwave-icp-client.js';

const ICPStatusIndicator = ({ className = "" }) => {
  const [icpStatus, setIcpStatus] = useState({
    isConnected: false,
    stats: null,
    health: null,
    error: null,
    lastChecked: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  const checkICPStatus = async () => {
    setIsLoading(true);
    try {
      // Check health and get stats
      const [healthResult, analyticsResult] = await Promise.all([
        socialWaveICP.checkCanisterHealth(),
        socialWaveICP.getDecentralizedAnalytics(),
      ]);

      if (healthResult.success && analyticsResult.success) {
        setIcpStatus({
          isConnected: true,
          stats: analyticsResult.analytics,
          health: healthResult.health,
          error: null,
          lastChecked: new Date(),
        });
      } else {
        setIcpStatus({
          isConnected: false,
          stats: null,
          health: null,
          error: healthResult.error || analyticsResult.error || "Connection failed",
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      console.error("ICP status check failed:", error);
      setIcpStatus({
        isConnected: false,
        stats: null,
        health: null,
        error: error.message,
        lastChecked: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkICPStatus();
    // Check every 30 seconds
    const interval = setInterval(checkICPStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatLastChecked = () => {
    if (!icpStatus.lastChecked) return "Never";
    return icpStatus.lastChecked.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-muted rounded-lg ${className}`}>
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-sm font-medium">ICP: Connecting...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-3 bg-muted rounded-lg ${className}`}>
      {/* Status Indicator */}
      <div 
        className={`w-2 h-2 rounded-full ${
          icpStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} 
      />
      
      {/* Status Text */}
      <div className="flex-1">
        <div className="text-sm font-medium">
          ICP: {icpStatus.isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div className="text-xs text-muted-foreground">
          Last checked: {formatLastChecked()}
        </div>
      </div>

      {/* Stats Display */}
      {icpStatus.isConnected && icpStatus.stats && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            Content: {icpStatus.stats.content?.totalContent || 0}
          </div>
          <div>
            Models: {icpStatus.stats.backend?.totalModels || 0}
          </div>
        </div>
      )}

      {/* Error Display */}
      {!icpStatus.isConnected && icpStatus.error && (
        <div className="text-xs text-red-500 max-w-32 truncate" title={icpStatus.error}>
          {icpStatus.error}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={checkICPStatus}
        disabled={isLoading}
        className="text-xs px-2 py-1 rounded hover:bg-background transition-colors disabled:opacity-50"
        title="Refresh status"
      >
        ↻
      </button>
    </div>
  );
};

export default ICPStatusIndicator;