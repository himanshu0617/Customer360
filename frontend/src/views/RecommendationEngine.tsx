import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Sparkles, Send, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface CampaignTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  target_segment: string;
  channel: string;
  expected_lift: string;
  action_text: string;
  current_tier?: string;
  churn_trigger?: string;
}

export const RecommendationEngine: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [simulatedCampaign, setSimulatedCampaign] = useState<string | null>(null);
  const [targetedCounts, setTargetedCounts] = useState<{ [key: string]: number }>({});

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/recommendations');
      setCampaigns(res.data);
      
      // Fetch segment customer counts to show targeted user sizes
      const segRes = await api.get('/segmentation');
      const counts: { [key: string]: number } = {};
      segRes.data.segments.forEach((s: any) => {
        counts[s.segment] = s.count;
      });
      setTargetedCounts(counts);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch campaign recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleLaunchCampaign = (camp: CampaignTemplate) => {
    setSimulatedCampaign(camp.id);
    
    // Simulate sending time
    setTimeout(() => {
      setSimulatedCampaign(null);
      alert(`SUCCESS!\n\nSimulated campaign "${camp.title}" was launched via ${camp.channel}.\n\nTargeted ${targetedCounts[camp.target_segment]?.toLocaleString() || '5,000'} "${camp.target_segment}" accounts.\nProjected lift: ${camp.expected_lift}.`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Fetching Recommended Actions...</p>
        </div>
      </div>
    );
  }

  if (error || campaigns.length === 0) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <AlertCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Recommendations</h3>
        <p className="text-gray-400 mb-6">{error || 'Could not load campaign recommendations'}</p>
        <button 
          onClick={fetchCampaigns}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition duration-200 mx-auto"
        >
          Retry
        </button>
      </div>
    );
  }

  const tabs = ['All', 'Retention', 'Upsell', 'Cross-sell'];
  const filteredCampaigns = activeTab === 'All' 
    ? campaigns 
    : campaigns.filter(c => c.type.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="space-y-6">
      
      {/* Overview Intro */}
      <div className="premium-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Platform Campaign Recommendation Engine</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
              Our automated recommendation engine processes customer behavior data (RFM scores and Churn Risk probabilities) 
              to identify retention risks, cross-sell options, and upselling tracks. 
              Review the templates below to trigger simulated email drip feeds or direct customer success tasks.
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black rounded-lg shrink-0 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" /> AI Campaign Optimization: Enabled
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-dark-border gap-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold transition duration-200 border-b-2 ${
              activeTab === tab 
                ? 'border-indigo-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map(camp => {
          const targetedSize = targetedCounts[camp.target_segment] || 0;
          const isSimulating = simulatedCampaign === camp.id;
          
          return (
            <div 
              key={camp.id} 
              className="premium-card p-5 flex flex-col justify-between border hover:border-indigo-500/30 transition duration-200 group"
            >
              <div>
                {/* Header Tag */}
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                    camp.type === 'Retention' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    camp.type === 'Upsell' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {camp.type}
                  </span>
                  
                  <span className="text-[10px] text-gray-500 font-medium">Channel: {camp.channel}</span>
                </div>

                {/* Title & Description */}
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition">{camp.title}</h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed min-h-[50px]">{camp.description}</p>
                
                {/* Targeting rationale details */}
                <div className="bg-dark-bg/60 p-3 rounded-lg border border-dark-border/40 text-[10px] space-y-1.5 my-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Target Cohort:</span>
                    <strong className="text-white font-bold">{camp.target_segment} Segment</strong>
                  </div>
                  {camp.current_tier && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Current Tier filter:</span>
                      <strong className="text-white font-bold">{camp.current_tier}</strong>
                    </div>
                  )}
                  {camp.churn_trigger && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trigger Indicator:</span>
                      <strong className="text-red-400 font-bold">{camp.churn_trigger}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Targeted Size:</span>
                    <span className="text-indigo-300 font-black flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {targetedSize.toLocaleString()} Users
                    </span>
                  </div>
                </div>
              </div>

              {/* Action and lift footer */}
              <div className="border-t border-dark-border/40 pt-4 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Lift: {camp.expected_lift}</span>
                </div>
                
                <button
                  onClick={() => handleLaunchCampaign(camp)}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-bold text-[10px] rounded-lg transition duration-200 flex items-center gap-1.5"
                >
                  {isSimulating ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Launching...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" /> {camp.action_text}
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
