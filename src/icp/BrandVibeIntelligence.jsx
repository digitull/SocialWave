import React, { useState, useEffect } from 'react';
import { socialWaveICP } from './socialwave-icp-client.js';

const BrandVibeIntelligence = ({ content, onBrandVibeAnalysis }) => {
  const [brandProfiles, setBrandProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    persona: '',
    tone: '',
    guidelines: '',
    keyPhrases: '',
    avoidPhrases: '',
  });

  // Load brand profiles on component mount
  useEffect(() => {
    loadBrandProfiles();
  }, []);

  const loadBrandProfiles = async () => {
    setIsLoading(true);
    try {
      const result = await socialWaveICP.listBrandVibeProfiles();
      if (result.success) {
        setBrandProfiles(result.profiles);
        if (result.profiles.length > 0 && !selectedProfile) {
          setSelectedProfile(result.profiles[0]);
        }
      }
    } catch (error) {
      console.error("Error loading brand profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze content against selected brand profile
  const analyzeBrandAlignment = async () => {
    if (!selectedProfile || !content) return;

    setIsAnalyzing(true);
    try {
      const result = await socialWaveICP.analyzeBrandAlignment(selectedProfile.id, content);
      if (result.success) {
        const analysis = {
          alignmentScore: result.alignmentScore,
          profile: selectedProfile,
          isOnBrand: result.alignmentScore >= 0.7,
          timestamp: new Date(),
        };
        
        setAnalysisResult(analysis);
        
        // Notify parent component
        if (onBrandVibeAnalysis) {
          onBrandVibeAnalysis(analysis);
        }
      }
    } catch (error) {
      console.error("Error analyzing brand alignment:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create new brand profile
  const createBrandProfile = async (e) => {
    e.preventDefault();
    
    try {
      const keyPhrases = createFormData.keyPhrases
        .split(',')
        .map(phrase => phrase.trim())
        .filter(phrase => phrase.length > 0);
      
      const avoidPhrases = createFormData.avoidPhrases
        .split(',')
        .map(phrase => phrase.trim())
        .filter(phrase => phrase.length > 0);

      const result = await socialWaveICP.createBrandVibeProfile(
        createFormData.name,
        createFormData.persona,
        createFormData.tone,
        createFormData.guidelines,
        keyPhrases,
        avoidPhrases
      );

      if (result.success) {
        // Reload profiles and select the new one
        await loadBrandProfiles();
        setShowCreateForm(false);
        setCreateFormData({
          name: '',
          persona: '',
          tone: '',
          guidelines: '',
          keyPhrases: '',
          avoidPhrases: '',
        });
      }
    } catch (error) {
      console.error("Error creating brand profile:", error);
    }
  };

  // Auto-analyze when content or profile changes
  useEffect(() => {
    if (content && selectedProfile && content.length > 10) {
      const timeoutId = setTimeout(analyzeBrandAlignment, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [content, selectedProfile]);

  const getAlignmentColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Brand Vibe Intelligence</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          + New Profile
        </button>
      </div>

      {/* Brand Profile Selection */}
      {brandProfiles.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Active Brand Profile
          </label>
          <select
            value={selectedProfile?.id || ''}
            onChange={(e) => {
              const profile = brandProfiles.find(p => p.id === e.target.value);
              setSelectedProfile(profile);
            }}
            className="w-full p-2 border rounded-md"
          >
            {brandProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name} - {profile.persona}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mb-4 p-3 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Brand Alignment</span>
            <span 
              className={`px-2 py-1 rounded text-sm font-medium ${getAlignmentColor(analysisResult.alignmentScore)}`}
            >
              {analysisResult.isOnBrand ? '✓ On-brand' : '⚠ Off-brand'} 
              ({Math.round(analysisResult.alignmentScore * 100)}%)
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Profile: {analysisResult.profile.name} | 
            Tone: {analysisResult.profile.tone} | 
            Persona: {analysisResult.profile.persona}
          </div>
          
          {!analysisResult.isOnBrand && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded text-sm">
              💡 Tip: Consider adjusting your content to better match the brand voice and tone.
            </div>
          )}
        </div>
      )}

      {/* Real-time Analysis Status */}
      {content && selectedProfile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isAnalyzing ? (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Analyzing brand alignment...
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Real-time analysis active
            </>
          )}
        </div>
      )}

      {/* No profiles message */}
      {brandProfiles.length === 0 && (
        <div className="text-center p-6 text-muted-foreground">
          <p className="mb-2">No brand profiles found.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Create Your First Brand Profile
          </button>
        </div>
      )}

      {/* Create Profile Modal/Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Brand Profile</h3>
            
            <form onSubmit={createBrandProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Profile Name</label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Tech Startup Brand"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Brand Persona</label>
                <input
                  type="text"
                  value={createFormData.persona}
                  onChange={(e) => setCreateFormData({...createFormData, persona: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Innovative, Friendly, Professional"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tone of Voice</label>
                <input
                  type="text"
                  value={createFormData.tone}
                  onChange={(e) => setCreateFormData({...createFormData, tone: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Conversational, Confident, Inspiring"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Brand Guidelines</label>
                <textarea
                  value={createFormData.guidelines}
                  onChange={(e) => setCreateFormData({...createFormData, guidelines: e.target.value})}
                  className="w-full p-2 border rounded-md h-20"
                  placeholder="Key brand messaging guidelines..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Key Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={createFormData.keyPhrases}
                  onChange={(e) => setCreateFormData({...createFormData, keyPhrases: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="innovation, cutting-edge, user-friendly"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phrases to Avoid (comma-separated)</label>
                <input
                  type="text"
                  value={createFormData.avoidPhrases}
                  onChange={(e) => setCreateFormData({...createFormData, avoidPhrases: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="outdated, complicated, expensive"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Create Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandVibeIntelligence;