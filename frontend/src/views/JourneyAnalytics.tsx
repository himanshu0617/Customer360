import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Compass, TrendingDown, ArrowRight, Activity, HelpCircle, Users } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export const JourneyAnalytics: React.FC = () => {
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJourneyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/journey');
      setFunnel(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customer journey analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneyData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Mapping Customer Journeys...</p>
        </div>
      </div>
    );
  }

  if (error || funnel.length === 0) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <Compass className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Journey Funnel</h3>
        <p className="text-gray-400 mb-6">{error || 'Could not load funnel metrics'}</p>
        <button 
          onClick={fetchJourneyData}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition duration-200 mx-auto"
        >
          Reload Journey
        </button>
      </div>
    );
  }

  // Calculate transition/drop-off rates
  const stagesWithRates = funnel.map((item, idx) => {
    let conversionFromPrev = 1.0;
    if (idx > 0 && funnel[idx - 1].count > 0) {
      conversionFromPrev = item.count / funnel[idx - 1].count;
    }
    return {
      ...item,
      conversionFromPrev
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Intro Description */}
      <div className="premium-card p-5">
        <h3 className="text-lg font-bold text-white mb-2">Customer Journey Lifecycle Analytics</h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Visualizing the conversion funnel from initial sign-up to repeat usage and churn risk. 
          Analyze drop-off points at key milestones (like onboarding to first transaction, or single purchase to repeat subscription). 
          Understanding where friction occurs in the customer timeline enables product managers and customer success agents to optimize product adoption.
        </p>
      </div>

      {/* Funnel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Funnel Visualisation */}
        <div className="premium-card p-5 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 text-gray-300 font-bold mb-4">
            <Activity className="h-5 w-5 text-indigo-400" />
            <span>Conversion Lifecycle Funnel</span>
          </div>

          <div className="space-y-4">
            {stagesWithRates.map((stage, idx) => {
              // Width of the funnel bar corresponding to the percentage relative to the first step (Acquisition)
              const baseCount = funnel[0].count;
              const widthPct = baseCount > 0 ? (stage.count / baseCount) * 100 : 0;
              
              // Skip formatting dropoff for step 0 and step 4 (churn) which is not a direct conversion step
              const showDropoff = idx > 0 && idx < 4;
              
              return (
                <div key={stage.stage} className="relative">
                  {/* Transition connector showing dropoff rate */}
                  {showDropoff && (
                    <div className="flex items-center gap-4 text-xs text-gray-400 pl-4 py-2 border-l-2 border-dashed border-gray-800 ml-[5%]">
                      <TrendingDown className="h-3.5 w-3.5 text-pink-500" />
                      <span>
                        Dropoff: <strong className="text-pink-400">{((1 - stage.conversionFromPrev) * 100).toFixed(1)}%</strong> from previous stage (conversion rate: {(stage.conversionFromPrev * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}

                  {idx === 4 && (
                    <div className="h-3 border-l-2 border-dashed border-gray-800 ml-[5%]"></div>
                  )}

                  {/* Funnel Bar Item */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4 bg-dark-border/40 p-4 rounded-xl border border-gray-800/40 hover:border-gray-800 transition">
                    
                    {/* Stage Title and Count */}
                    <div className="w-full md:w-52 shrink-0">
                      <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Stage {idx + 1}</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{stage.stage}</h4>
                      <p className="text-xs font-semibold text-gray-400 mt-1">{stage.count.toLocaleString()} Users</p>
                    </div>

                    {/* Funnel graphical bar */}
                    <div className="flex-1 bg-dark-bg h-8 rounded-lg overflow-hidden border border-dark-border relative flex items-center pr-3">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600/70 to-purple-600/70 rounded-r-md transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      ></div>
                      <div className="absolute right-3 text-[11px] font-black text-indigo-200">
                        {idx === 4 ? `Total Platform Churn: ${(stage.percentage * 100).toFixed(1)}%` : `Retention: ${(stage.percentage * 100).toFixed(1)}%`}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Journey Metadata Cards */}
        <div className="space-y-6">
          
          {/* Key Journey Insights */}
          <div className="premium-card p-5">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-indigo-400">Lifecycle Milestones</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <h5 className="text-xs font-bold text-white">Acquisition Phase</h5>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    User signs up, selects a tier, and registers billing information. Onboarding email series triggers.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <h5 className="text-xs font-bold text-white">Activation Milestone</h5>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    User completes first transaction (purchase of addon, licensing seats, or first monthly subscription payment cleared).
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">3</div>
                <div>
                  <h5 className="text-xs font-bold text-white">Retention Period</h5>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    User runs recurring monthly transactions and remains active, utilizing features. Churn risk remains Low/Medium.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">4</div>
                <div>
                  <h5 className="text-xs font-bold text-white">Expansion / Advocate</h5>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    User upgrades licensing tier, purchases enterprise add-ons, or orders priority customer support bundles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Average Transition Speeds */}
          <div className="premium-card p-5">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-indigo-400">Transition Velocity</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-dark-border/40">
                <span className="text-xs text-gray-400">Signup → 1st Purchase</span>
                <span className="text-xs font-bold text-white">4.2 Days (Avg)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-border/40">
                <span className="text-xs text-gray-400">1st Purchase → 2nd Purchase</span>
                <span className="text-xs font-bold text-white">18.5 Days (Avg)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-border/40">
                <span className="text-xs text-gray-400">Avg Account Lifespan</span>
                <span className="text-xs font-bold text-white">14.8 Months</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-gray-400">Average Support Resolution</span>
                <span className="text-xs font-bold text-indigo-400">135.6 Minutes</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
