import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { ShieldAlert, Search, ChevronLeft, ChevronRight, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

interface RiskStats {
  count: number;
  percentage: number;
  avg_score: number;
}

interface ChurnRiskData {
  distribution: {
    Low: RiskStats;
    Medium: RiskStats;
    High: RiskStats;
  };
  feature_importance: { feature: string; importance: number }[];
  high_risk_customers: {
    customer_id: string;
    name: string;
    email: string;
    location: string;
    subscription_tier: string;
    score: number;
    frequency: number;
    recency: number;
    support_tickets: number;
    negative_tickets: number;
  }[];
}

interface ChurnRiskDashboardProps {
  onSelectCustomer: (id: string) => void;
}

const RISK_COLORS: { [key: string]: string } = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#10B981'
};

export const ChurnRiskDashboard: React.FC<ChurnRiskDashboardProps> = ({ onSelectCustomer }) => {
  const [data, setData] = useState<ChurnRiskData | null>(null);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/churn-risk');
      setData(res.data);
      setTotalPages(res.data.pagination.total_pages);
      setTotalItems(res.data.pagination.total_items);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch churn risk analytics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHighRiskList = useCallback(async () => {
    if (!data) return;
    try {
      setLoadingList(true);
      const res = await api.get('/churn-risk', {
        params: {
          search: search,
          page: page,
          limit: 10
        }
      });
      setData(prev => prev ? {
        ...prev,
        high_risk_customers: res.data.high_risk_customers
      } : null);
      setTotalPages(res.data.pagination.total_pages);
      setTotalItems(res.data.pagination.total_items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchRiskStats();
  }, []);

  useEffect(() => {
    if (page > 1 || search) {
      fetchHighRiskList();
    }
  }, [page, fetchHighRiskList]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    // trigger list fetch
    setTimeout(() => {
      fetchHighRiskList();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Running Churn Prediction Classification...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Churn Risk</h3>
        <p className="text-gray-400 mb-6">{error || 'Could not load predictions'}</p>
        <button 
          onClick={fetchRiskStats}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition duration-200 mx-auto"
        >
          Reload Models
        </button>
      </div>
    );
  }

  const { distribution, feature_importance, high_risk_customers } = data;

  const distributionChartData = Object.keys(distribution).map(key => ({
    name: `${key} Risk`,
    count: distribution[key as keyof typeof distribution].count,
    percentage: distribution[key as keyof typeof distribution].percentage,
    category: key
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="premium-card p-5">
        <h3 className="text-lg font-bold text-white mb-2">AI-Powered Churn Risk Prediction Engine</h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Using a trained **Random Forest Classifier (scikit-learn)**, the platform evaluates demographic properties, support histories, and spending rates 
          to classify customers into Low, Medium, or High Churn Risk categories. 
          A churn risk score (0.0 to 1.0) represents the predicted probability of cancelling their subscription or going inactive.
        </p>
      </div>

      {/* Row 1: KPI Cards and Feature Importance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Breakdown KPI Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Risk Distribution</h4>
          
          {/* High Risk Card */}
          <div className="premium-card p-4 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">High Churn Risk Accounts</p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {distribution.High.count.toLocaleString()}
                </h3>
              </div>
              <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg">
                {(distribution.High.percentage * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-2">
              Avg Probability Score: <strong className="text-red-400">{(distribution.High.avg_score * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {/* Medium Risk Card */}
          <div className="premium-card p-4 border-l-4 border-amber-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Medium Churn Risk Accounts</p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {distribution.Medium.count.toLocaleString()}
                </h3>
              </div>
              <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-lg">
                {(distribution.Medium.percentage * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-2">
              Avg Probability Score: <strong className="text-amber-400">{(distribution.Medium.avg_score * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {/* Low Risk Card */}
          <div className="premium-card p-4 border-l-4 border-emerald-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Low Churn Risk / Safe</p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {distribution.Low.count.toLocaleString()}
                </h3>
              </div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg">
                {(distribution.Low.percentage * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-2">
              Avg Probability Score: <strong className="text-emerald-400">{(distribution.Low.avg_score * 100).toFixed(0)}%</strong>
            </div>
          </div>

        </div>

        {/* Feature Importance Bar Chart */}
        <div className="premium-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Scikit-Learn Feature Importance Coefficients</h4>
              <p className="text-[10px] text-gray-400">Top mathematical drivers explaining customer churn probability</p>
            </div>
          </div>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feature_importance} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2F" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                <YAxis dataKey="feature" type="category" stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#12121A', borderColor: '#1E1E2F', borderRadius: '8px' }}
                  itemStyle={{ color: '#E2E8F0', fontSize: '11px' }}
                  formatter={(value: any) => [`${(parseFloat(value)*100).toFixed(2)}%`, 'Weight']}
                />
                <Bar dataKey="importance" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: High Risk Customers Table list */}
      <div className="premium-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse-slow" />
              <span>At-Risk Customer Registry ({totalItems.toLocaleString()} High Risk Accounts)</span>
            </h4>
            <p className="text-xs text-gray-400 mt-1">Targeted WIN-BACK lists. Click row for 360 detailed card.</p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search high risk customer..."
              value={search}
              onChange={handleSearchChange}
              className="w-full bg-dark-bg border border-dark-border rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition duration-200"
            />
          </div>
        </div>

        {loadingList ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Customer ID & Name</th>
                  <th className="pb-3 font-semibold">Tier / Region</th>
                  <th className="pb-3 font-semibold text-center">Churn Probability</th>
                  <th className="pb-3 font-semibold text-right">Recency (Last Active)</th>
                  <th className="pb-3 font-semibold text-right">Transactions</th>
                  <th className="pb-3 font-semibold text-right">Support Interactions</th>
                  <th className="pb-3 font-semibold text-right">Negative Sentiments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-xs">
                {high_risk_customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No high-risk records match criteria.
                    </td>
                  </tr>
                ) : (
                  high_risk_customers.map((c) => (
                    <tr 
                      key={c.customer_id} 
                      className="hover:bg-red-500/5 transition border-l border-transparent hover:border-red-500/50 cursor-pointer group"
                      onClick={() => onSelectCustomer(c.customer_id)}
                    >
                      <td className="py-3.5 pr-3 pl-1">
                        <div className="font-bold text-white group-hover:text-red-400 transition">{c.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{c.customer_id} • {c.email}</div>
                      </td>
                      <td className="py-3.5 text-gray-300">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-dark-border text-gray-400 font-bold mr-2">
                          {c.subscription_tier}
                        </span>
                        {c.location}
                      </td>
                      <td className="py-3.5 text-center font-black text-red-500">
                        {(c.score * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 text-right font-medium text-gray-300">
                        {c.recency} days ago
                      </td>
                      <td className="py-3.5 text-right font-medium text-gray-300">
                        {c.frequency}
                      </td>
                      <td className="py-3.5 text-right font-semibold text-gray-300">
                        {c.support_tickets} tickets
                      </td>
                      <td className="py-3.5 text-right">
                        {c.negative_tickets > 0 ? (
                          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded">
                            {c.negative_tickets} negative
                          </span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {high_risk_customers.length > 0 && (
          <div className="flex items-center justify-between border-t border-dark-border mt-5 pt-4 text-xs text-gray-400">
            <span>
              Showing Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalItems.toLocaleString()} at-risk accounts)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md bg-dark-border hover:bg-gray-800 border border-gray-800 text-gray-300 disabled:opacity-30 disabled:hover:bg-dark-border transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md bg-dark-border hover:bg-gray-800 border border-gray-800 text-gray-300 disabled:opacity-30 disabled:hover:bg-dark-border transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
