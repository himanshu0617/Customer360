import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Layers, Percent, DollarSign, Calendar, Info } from 'lucide-react';

interface CohortPeriod {
  active_count: number;
  percentage: number;
}

interface CohortRevenuePeriod {
  amount: number;
  percentage: number;
}

interface Cohort {
  cohort_month: string;
  cohort_size: number;
  retention: { [key: string]: CohortPeriod };
  revenue_retention: { [key: string]: CohortRevenuePeriod };
}

export const CohortAnalysis: React.FC = () => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'retention' | 'revenue'>('retention');

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/cohorts');
      // Sort cohorts chronologically
      const sortedCohorts = res.data.sort((a: Cohort, b: Cohort) => 
        a.cohort_month.localeCompare(b.cohort_month)
      );
      setCohorts(sortedCohorts);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch cohort analysis matrices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, []);

  // Function to determine cell background based on percentage
  const getCellColor = (pct: number, isRev: boolean) => {
    if (pct === 0) return '#12121A';
    
    // Scale opacity based on retention
    // Revenue can exceed 100% (expansion revenue), clamp it or style separately
    const intensity = Math.min(1.0, pct);
    
    if (isRev && pct > 1.0) {
      // Expansion color (emerald hue)
      return `rgba(16, 185, 129, ${Math.min(1.0, 0.4 + (pct - 1.0))})`;
    }
    
    // Core retention color (indigo theme)
    return `rgba(99, 102, 241, ${intensity})`;
  };

  const getCellTextColor = (pct: number, isRev: boolean) => {
    if (pct === 0) return 'text-gray-600';
    if (isRev && pct > 1.0) return 'text-emerald-100 font-bold';
    return pct > 0.45 ? 'text-white font-semibold' : 'text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Calculating Cohorts Matrix...</p>
        </div>
      </div>
    );
  }

  if (error || cohorts.length === 0) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <Info className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">No Cohort Data Available</h3>
        <p className="text-gray-400 mb-6">Run the analytic training models to calculate the cohort matrices.</p>
        <button 
          onClick={fetchCohorts}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition duration-200 mx-auto"
        >
          Load Matrix
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Explanation Banner */}
      <div className="premium-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Cohort Retention Heatmaps</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
              Cohort Analysis tracks specific user groups (grouped by their signup month) over time. 
              **User Retention** counts how many users remain active (make transactions) in subsequent months. 
              **Revenue Retention** highlights Net Revenue Retention (NRR). If NRR exceeds 100% (marked in green), 
              expansion revenue from upgrades/addons outweighs churned subscriber revenue.
            </p>
          </div>
          
          {/* Mode Switcher Buttons */}
          <div className="flex p-1 bg-dark-bg border border-dark-border rounded-lg shrink-0">
            <button
              onClick={() => setMode('retention')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition duration-200 ${
                mode === 'retention' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Percent className="h-3.5 w-3.5" /> Customer Retention
            </button>
            <button
              onClick={() => setMode('revenue')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition duration-200 ${
                mode === 'revenue' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" /> Revenue Retention
            </button>
          </div>
        </div>
      </div>

      {/* Cohort Heatmap Grid */}
      <div className="premium-card p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-6 text-gray-300 font-bold">
          <Layers className="h-5 w-5 text-indigo-400" />
          <span>{mode === 'retention' ? 'Customer Retention Matrix (%)' : 'Net Revenue Retention (NRR) Matrix'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-dark-border text-gray-400 text-[10px] uppercase tracking-wider">
                <th className="pb-3 text-left font-bold pl-2 min-w-[90px]">Cohort</th>
                <th className="pb-3 text-left font-bold min-w-[60px]">Size</th>
                {[...Array(12)].map((_, i) => (
                  <th key={i} className="pb-3 font-black w-[8%] min-w-[50px]">
                    Month {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/10 text-xs">
              {cohorts.map((cohort) => {
                return (
                  <tr key={cohort.cohort_month} className="hover:bg-dark-border/20 transition">
                    {/* Cohort Month */}
                    <td className="py-2.5 text-left font-semibold text-white pl-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      {cohort.cohort_month}
                    </td>
                    
                    {/* Cohort Size */}
                    <td className="py-2.5 text-left text-gray-400 font-medium">
                      {cohort.cohort_size.toLocaleString()}
                    </td>
                    
                    {/* Matrix Cells */}
                    {[...Array(12)].map((_, i) => {
                      const idxStr = String(i);
                      
                      let displayVal = '';
                      let pct = 0;
                      let tooltipText = '';
                      
                      if (mode === 'retention') {
                        const cell = cohort.retention[idxStr];
                        if (cell) {
                          pct = cell.percentage;
                          displayVal = `${(pct * 100).toFixed(0)}%`;
                          tooltipText = `${cell.active_count.toLocaleString()} / ${cohort.cohort_size.toLocaleString()} Customers Active`;
                        } else {
                          displayVal = '-';
                        }
                      } else {
                        const cell = cohort.revenue_retention[idxStr];
                        if (cell) {
                          pct = cell.percentage;
                          displayVal = `${(pct * 100).toFixed(0)}%`;
                          tooltipText = `Revenue: $${cell.amount.toLocaleString(undefined, {maximumFractionDigits:0})}`;
                        } else {
                          displayVal = '-';
                        }
                      }

                      // Check if month index is in the future relative to the cohort age
                      const isFuture = displayVal === '-';
                      
                      return (
                        <td 
                          key={i} 
                          className="py-1 px-0.5"
                        >
                          <div 
                            className={`cohort-cell h-9 flex items-center justify-center rounded transition-all duration-200 ${getCellTextColor(pct, mode === 'revenue')}`}
                            style={{ 
                              backgroundColor: isFuture ? '#0F0F16' : getCellColor(pct, mode === 'revenue'),
                              border: isFuture ? '1px dashed rgba(30, 30, 47, 0.4)' : '1px solid rgba(18, 18, 26, 0.4)'
                            }}
                            data-tooltip={isFuture ? 'Future Period' : tooltipText}
                          >
                            {displayVal}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend Indicator */}
        <div className="flex flex-wrap items-center justify-between mt-6 pt-4 border-t border-dark-border text-[10px] text-gray-500">
          <div className="flex items-center gap-4">
            <span className="font-bold uppercase tracking-wider">Matrix Legend:</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-dark-bg border border-dark-border"></span>
              <span>0% Retention</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}></span>
              <span>1 - 30%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.5)' }}></span>
              <span>30 - 70%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.9)' }}></span>
              <span>70 - 100%</span>
            </div>
            {mode === 'revenue' && (
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.6)' }}></span>
                <span>&gt;100% Expansion (NRR)</span>
              </div>
            )}
          </div>
          
          <span>* Hover over cells to see absolute counts or revenue values.</span>
        </div>
      </div>

    </div>
  );
};
