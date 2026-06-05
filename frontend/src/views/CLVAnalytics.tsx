import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DollarSign, Landmark, BarChart3, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid } from 'recharts';

interface SegmentCLV {
  segment: string;
  count: number;
  historical_revenue: number;
  projected_revenue: number;
  avg_historical_clv: number;
  avg_projected_clv: number;
  estimated_cost: number;
  profitability: number;
  margin_percentage: number;
}

interface CLVHistBin {
  range: string;
  historical_count: number;
  projected_count: number;
}

interface CLVData {
  segment_profitability: SegmentCLV[];
  clv_distribution: CLVHistBin[];
}

export const CLVAnalytics: React.FC = () => {
  const [data, setData] = useState<CLVData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCLVData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/clv');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Customer Lifetime Value analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCLVData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Running CLV Regression Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <Landmark className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading CLV Stats</h3>
        <p className="text-gray-400 mb-6">{error || 'Could not load metrics'}</p>
        <button 
          onClick={fetchCLVData}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition duration-200 mx-auto"
        >
          Reload CLV
        </button>
      </div>
    );
  }

  const { segment_profitability, clv_distribution } = data;

  // Compute platform aggregates
  const totalHistRev = segment_profitability.reduce((sum, item) => sum + item.historical_revenue, 0);
  const totalProjRev = segment_profitability.reduce((sum, item) => sum + item.projected_revenue, 0);
  const totalCost = segment_profitability.reduce((sum, item) => sum + item.estimated_cost, 0);
  const totalProfit = segment_profitability.reduce((sum, item) => sum + item.profitability, 0);
  const avgMargin = totalHistRev > 0 ? totalProfit / totalHistRev : 0.0;

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="premium-card p-5">
        <h3 className="text-lg font-bold text-white mb-2">Customer Lifetime Value (CLV) Prediction</h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Customer Lifetime Value evaluates the financial worth of client relationships. 
          **Historical CLV** represents actual invoice revenue cleared. 
          **Projected CLV** uses a trained **Random Forest Regressor (scikit-learn)** to estimate the expected future spend of active customers in the next 12 months based on purchase velocities, subscription tiers, and engagement indices.
        </p>
      </div>

      {/* Aggregated KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Historical Spend */}
        <div className="premium-card p-5">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Cleared Revenue</p>
          <h3 className="text-3xl font-black text-white">${totalHistRev.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
          <span className="text-[10px] text-gray-500 mt-2 block">Actual transaction history sum</span>
        </div>

        {/* Projected Future Expansion */}
        <div className="premium-card p-5">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Projected Platform Value</p>
          <h3 className="text-3xl font-black text-emerald-400">${totalProjRev.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
          <span className="text-[10px] text-emerald-400/80 font-semibold mt-2 block">
            +${(totalProjRev - totalHistRev).toLocaleString(undefined, {maximumFractionDigits:0})} ({( ((totalProjRev - totalHistRev) / totalHistRev)*100 ).toFixed(1)}% expansion velocity)
          </span>
        </div>

        {/* Estimated Maintenance Cost */}
        <div className="premium-card p-5">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Infrastructure & Support Cost</p>
          <h3 className="text-3xl font-black text-red-400">${totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
          <span className="text-[10px] text-gray-500 mt-2 block">Calculated operating margins</span>
        </div>

        {/* Operating Profits */}
        <div className="premium-card p-5">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Net Platform Profits</p>
          <h3 className="text-3xl font-black text-indigo-400">${totalProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
          <span className="text-[10px] text-indigo-400/90 font-semibold mt-2 block">
            {(avgMargin * 100).toFixed(1)}% Platform Net Margin
          </span>
        </div>

      </div>

      {/* CLV Distribution Chart */}
      <div className="premium-card p-5">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          <div>
            <h4 className="text-sm font-bold text-white">Customer Lifetime Value Binned Distribution</h4>
            <p className="text-[10px] text-gray-400">Comparing count distributions of actual vs projected CLV values across user counts</p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clv_distribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2F" vertical={false} />
              <XAxis dataKey="range" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip
                contentStyle={{ backgroundColor: '#12121A', borderColor: '#1E1E2F', borderRadius: '8px' }}
                itemStyle={{ color: '#E2E8F0', fontSize: '11px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="historical_count" name="Historical Customers" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected_count" name="Projected Value Bins" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segment Profitability Metrics Table */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest text-indigo-400">Segment Profitability Breakdown</h4>
            <p className="text-xs text-gray-400 mt-1">Comparing acquisition costs, margins, and projected earnings by RFM category</p>
          </div>
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-indigo-400 flex items-center gap-1 font-semibold">
            <Sparkles className="h-3 w-3 animate-pulse" /> Optimized Pricing Engine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="pb-3 font-semibold">RFM Segment</th>
                <th className="pb-3 font-semibold text-center">Accounts</th>
                <th className="pb-3 font-semibold text-right">Historical Spend</th>
                <th className="pb-3 font-semibold text-right">Projected Spend (12m)</th>
                <th className="pb-3 font-semibold text-right">Avg Historical CLV</th>
                <th className="pb-3 font-semibold text-right">Avg Projected CLV</th>
                <th className="pb-3 font-semibold text-right">Estimated Costs</th>
                <th className="pb-3 font-semibold text-right">Net Profit</th>
                <th className="pb-3 font-semibold text-right">Segment Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40 text-xs">
              {segment_profitability.map((s) => (
                <tr key={s.segment} className="hover:bg-dark-border/20 transition">
                  <td className="py-3.5 font-bold text-white pr-2">{s.segment}</td>
                  <td className="py-3.5 text-center font-medium text-gray-300">{s.count.toLocaleString()}</td>
                  <td className="py-3.5 text-right font-semibold text-gray-300">${s.historical_revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-3.5 text-right font-semibold text-emerald-400">${s.projected_revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-3.5 text-right font-medium text-gray-300">${s.avg_historical_clv.toFixed(2)}</td>
                  <td className="py-3.5 text-right font-bold text-emerald-400">${s.avg_projected_clv.toFixed(2)}</td>
                  <td className="py-3.5 text-right font-medium text-red-400">${s.estimated_cost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-3.5 text-right font-bold text-indigo-400">${s.profitability.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="py-3.5 text-right font-black">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      s.margin_percentage > 0.8 ? 'bg-emerald-500/10 text-emerald-400' :
                      s.margin_percentage > 0.5 ? 'bg-indigo-500/10 text-indigo-400' :
                      s.margin_percentage > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {(s.margin_percentage * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
