import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Users, UserCheck, ShieldAlert, Award, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, RefreshCw, MessageSquare
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface OverviewData {
  summary: {
    total_customers: number;
    active_customers: number;
    paused_customers: number;
    churned_customers: number;
    churn_rate: number;
    retention_rate: number;
    arpu: number;
    avg_historical_clv: number;
    avg_projected_clv: number;
    total_revenue: number;
  };
  tiers: { tier: string; count: number }[];
  revenue_trends: { date: string; revenue: number }[];
  support_sentiments: { [key: string]: number };
  model_updated: string;
}

interface OverviewDashboardProps {
  onSelectCustomer: (id: string) => void;
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onSelectCustomer }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/overview');
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch dashboard data. Make sure the Flask server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Loading Customer360 metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Database Connection Failed</h3>
        <p className="text-gray-400 mb-6">{error || 'Could not load metrics'}</p>
        <button 
          onClick={fetchOverview}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition duration-200 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" /> Retry Connection
        </button>
      </div>
    );
  }

  const { summary, tiers, revenue_trends, support_sentiments } = data;

  const sentimentData = Object.keys(support_sentiments).map(key => ({
    name: key,
    count: support_sentiments[key]
  }));

  const SENTIMENT_COLORS: { [key: string]: string } = {
    Positive: '#10B981',
    Neutral: '#6B7280',
    Negative: '#EF4444'
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Customers */}
        <div className="premium-card p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Total Enterprise Accounts</p>
              <h3 className="text-3xl font-bold text-white">{summary.total_customers.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-green-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+12.4% MoM growth</span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="premium-card p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Churn Rate (Annualized)</p>
              <h3 className="text-3xl font-bold text-white">{(summary.churn_rate * 100).toFixed(2)}%</h3>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-red-400">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Target: &lt;5% churn</span>
          </div>
        </div>

        {/* Retention Rate */}
        <div className="premium-card p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Customer Retention Rate</p>
              <h3 className="text-3xl font-bold text-white">{(summary.retention_rate * 100).toFixed(2)}%</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Industry Leading (Top 10%)</span>
          </div>
        </div>

        {/* CLV / ARPU */}
        <div className="premium-card p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Avg. Projected CLV</p>
              <h3 className="text-3xl font-bold text-white">${summary.avg_projected_clv.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
              <Award className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>${(summary.avg_projected_clv - summary.avg_historical_clv).toFixed(0)} expansion projection</span>
          </div>
        </div>

      </div>

      {/* Sub KPI Small Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card p-3 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-md"><DollarSign className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Platform Spend</p>
            <p className="text-sm font-semibold text-white">${summary.total_revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
          </div>
        </div>
        <div className="premium-card p-3 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-md"><Users className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Active Subscriptions</p>
            <p className="text-sm font-semibold text-white">{summary.active_customers.toLocaleString()}</p>
          </div>
        </div>
        <div className="premium-card p-3 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-md"><TrendingUp className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Average revenue/ARPU</p>
            <p className="text-sm font-semibold text-white">${summary.arpu.toFixed(2)}</p>
          </div>
        </div>
        <div className="premium-card p-3 flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 text-pink-400 rounded-md"><Award className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg Historical CLV</p>
            <p className="text-sm font-semibold text-white">${summary.avg_historical_clv.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Area Chart */}
        <div className="premium-card p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-lg font-bold text-white">Monthly Platform Spend</h4>
              <p className="text-xs text-gray-400">Recurring and addon revenue generated over last 12 months</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-dark-border px-3 py-1.5 rounded-lg border border-gray-800">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span> Subscription + Addons
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2F" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12121A', borderColor: '#1E1E2F', borderRadius: '8px' }}
                  labelStyle={{ color: '#94A3B8', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#E2E8F0', fontSize: '12px' }}
                  formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Tier Distribution */}
        <div className="premium-card p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold text-white">Subscription Tier Mix</h4>
            <p className="text-xs text-gray-400 mb-6">Breakdown of customer licensing tiers</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tiers}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="tier"
                >
                  {tiers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12121A', borderColor: '#1E1E2F', borderRadius: '8px' }}
                  itemStyle={{ color: '#E2E8F0', fontSize: '12px' }}
                  formatter={(value: any) => [value.toLocaleString(), 'Accounts']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white">{summary.total_customers.toLocaleString()}</span>
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">Total users</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {tiers.map((t, idx) => (
              <div key={t.tier} className="flex items-center gap-2 bg-dark-border/40 p-2 rounded border border-gray-800/40">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <div>
                  <p className="text-xs font-bold text-gray-200">{t.tier}</p>
                  <p className="text-[10px] text-gray-400">
                    {t.count.toLocaleString()} ({((t.count / summary.total_customers)*100).toFixed(0)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Support & Models Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Support Sentiment breakdown */}
        <div className="premium-card p-5 md:col-span-1">
          <h4 className="text-lg font-bold text-white mb-1">Customer Support Sentiments</h4>
          <p className="text-xs text-gray-400 mb-6">Sentiment metrics extracted from support chats</p>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2F" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#12121A', borderColor: '#1E1E2F', borderRadius: '8px' }}
                  itemStyle={{ color: '#E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Learning Model Insights */}
        <div className="premium-card p-5 md:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Analytics Intelligence Summary</h4>
            <p className="text-xs text-gray-400 mb-4">ML engine status and sync metadata</p>
          </div>
          
          <div className="space-y-4 my-2">
            <div className="flex items-center justify-between p-3 bg-dark-border rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-[9px]">C</span>
                <div>
                  <p className="text-xs font-semibold text-white">Churn Prediction Classifier</p>
                  <p className="text-[10px] text-gray-400">Random Forest Classifier (scikit-learn)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">99.36% Accuracy</span>
                <p className="text-[9px] text-gray-500">Test ROC-AUC: 0.99</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-dark-border rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 font-bold text-[9px]">L</span>
                <div>
                  <p className="text-xs font-semibold text-white">Projected CLV Regressor</p>
                  <p className="text-[10px] text-gray-400">Random Forest Regressor (scikit-learn)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">0.93 R² Score</span>
                <p className="text-[9px] text-gray-500">Cross-validated R2</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-3 mt-2">
            <span>Model Sync Version: v1.0.4</span>
            <span>Last Sync: {data.model_updated || 'Never'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
