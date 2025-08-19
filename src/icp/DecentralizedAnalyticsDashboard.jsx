import React, { useState, useEffect } from 'react';
import { socialWaveICP } from './socialwave-icp-client.js';

const DecentralizedAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      const result = await socialWaveICP.getDecentralizedAnalytics();
      
      if (result.success) {
        setAnalytics(result.analytics);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching decentralized analytics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const StatCard = ({ title, value, subtitle, icon, color = "blue" }) => (
    <div className={`p-4 bg-white border rounded-lg shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`text-${color}-600 text-2xl`}>{icon}</div>
      </div>
    </div>
  );

  const CanisterCard = ({ title, data, icon }) => (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      
      <div className="space-y-2">
        {Object.entries(data || {}).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
            </span>
            <span className="font-medium">{typeof value === 'number' ? value.toLocaleString() : value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-red-500">⚠</div>
            <h3 className="font-semibold text-red-800">Analytics Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Decentralized Analytics</h2>
          <p className="text-muted-foreground">
            Real-time insights from Internet Computer Protocol
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-refresh</span>
          </div>
          
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Content"
          value={analytics?.content?.totalContent || 0}
          subtitle={`${analytics?.content?.publicContent || 0} public`}
          icon="📄"
          color="blue"
        />
        
        <StatCard
          title="Total Engagements"
          value={analytics?.content?.totalEngagements || 0}
          subtitle={`${analytics?.content?.totalViews || 0} views`}
          icon="❤️"
          color="red"
        />
        
        <StatCard
          title="AI Models"
          value={analytics?.backend?.totalModels || 0}
          subtitle={`${analytics?.backend?.activeModels || 0} active`}
          icon="🤖"
          color="green"
        />
        
        <StatCard
          title="Analytics Events"
          value={analytics?.analytics?.totalEvents || 0}
          subtitle={`${analytics?.analytics?.recentEvents || 0} recent`}
          icon="📊"
          color="purple"
        />
      </div>

      {/* Detailed Canister Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CanisterCard
          title="Content Storage"
          icon="🗄️"
          data={analytics?.content}
        />
        
        <CanisterCard
          title="AI Backend"
          icon="🧠"
          data={analytics?.backend}
        />
        
        <CanisterCard
          title="Analytics Engine"
          icon="📈"
          data={analytics?.analytics}
        />
      </div>

      {/* ICP Network Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🌐</div>
          <div>
            <h3 className="font-semibold text-lg">Internet Computer Protocol</h3>
            <p className="text-muted-foreground">Decentralized cloud computing platform</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-50 rounded p-3">
            <div className="text-sm font-medium text-muted-foreground">Canister Status</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">All Systems Operational</span>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-50 rounded p-3">
            <div className="text-sm font-medium text-muted-foreground">Network</div>
            <div className="font-medium mt-1">
              {process.env.NODE_ENV === 'development' ? 'Local Replica' : 'Mainnet'}
            </div>
          </div>
          
          <div className="bg-white bg-opacity-50 rounded p-3">
            <div className="text-sm font-medium text-muted-foreground">Data Sovereignty</div>
            <div className="font-medium mt-1">100% On-Chain</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white bg-opacity-50 rounded">
          <div className="text-sm font-medium mb-2">🔐 Decentralized Features Active:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              <span>Content Storage</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              <span>AI Model Storage</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              <span>Analytics Processing</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              <span>Brand Intelligence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {analytics && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">📊 Performance Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Content Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Content Items:</span>
                  <span className="font-medium">{analytics.content?.totalContent || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Public Content:</span>
                  <span className="font-medium">{analytics.content?.publicContent || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Views:</span>
                  <span className="font-medium">{(analytics.content?.totalViews || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Engagement Rate:</span>
                  <span className="font-medium">
                    {analytics.content?.totalViews > 0 
                      ? ((analytics.content?.totalEngagements / analytics.content?.totalViews) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">AI Model Usage</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Models:</span>
                  <span className="font-medium">{analytics.backend?.totalModels || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Models:</span>
                  <span className="font-medium">{analytics.backend?.activeModels || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Usage:</span>
                  <span className="font-medium">{(analytics.backend?.totalUsage || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Brand Profiles:</span>
                  <span className="font-medium">{analytics.backend?.totalBrandProfiles || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecentralizedAnalyticsDashboard;