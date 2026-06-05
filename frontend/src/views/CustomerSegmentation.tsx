import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Search, ChevronLeft, ChevronRight, Filter, Award, ShieldAlert, Zap, Clock, Snowflake, HelpCircle } from 'lucide-react';

interface SegmentData {
  segment: string;
  count: number;
  percentage: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
}

interface CustomerRow {
  customer_id: string;
  name: string;
  email: string;
  location: string;
  subscription_tier: string;
  subscription_status: string;
  rfm: {
    recency: number;
    frequency: number;
    monetary: number;
    R: number;
    F: number;
    M: number;
    segment: string;
  } | null;
  churn_risk: {
    score: number;
    category: string;
  } | null;
  projected_clv: number;
  historical_clv: number;
}

interface CustomerSegmentationProps {
  onSelectCustomer: (id: string) => void;
}

const SEGMENT_ICONS: { [key: string]: React.ReactNode } = {
  "High-Value": <Award className="h-4 w-4 text-amber-400" />,
  "Loyal": <Zap className="h-4 w-4 text-purple-400" />,
  "New": <Clock className="h-4 w-4 text-emerald-400" />,
  "At-Risk": <ShieldAlert className="h-4 w-4 text-red-400" />,
  "Hibernating": <Snowflake className="h-4 w-4 text-blue-400" />,
  "Need Attention": <HelpCircle className="h-4 w-4 text-gray-400" />
};

export const CustomerSegmentation: React.FC<CustomerSegmentationProps> = ({ onSelectCustomer }) => {
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Fetch Segment summaries
  const fetchSegments = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/segmentation');
      setSegments(res.data.segments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch customer list based on segment and search
  const fetchCustomers = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await api.get('/segmentation', {
        params: {
          segment: selectedSegment,
          search: search,
          page: page,
          limit: 12
        }
      });
      setCustomers(res.data.customers);
      setTotalPages(res.data.pagination.total_pages);
      setTotalItems(res.data.pagination.total_items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, [selectedSegment, search, page]);

  useEffect(() => {
    fetchSegments();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page to 1 when filters change
  const handleSegmentSelect = (seg: string) => {
    setSelectedSegment(seg);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section - Automatic RFM Segmentation Info */}
      <div className="premium-card p-5">
        <h3 className="text-lg font-bold text-white mb-2">Automatic RFM Customer Segmentation</h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Customers are automatically classified into analytical segments using **RFM Analysis** (Recency, Frequency, Monetary). 
          Our pipeline aggregates transaction records, calculates quintile metrics ($R, F, M$ scores from 1 to 5), and dynamically assigns cohorts. 
          This facilitates targeted win-back campaigns for at-risk clients, upsells for high-value customers, and tailored onboarding for new accounts.
        </p>
      </div>

      {/* Segment Summary Grid */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="premium-card p-4 h-28 bg-dark-card/50"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {segments.map((seg) => {
            const isSelected = selectedSegment === seg.segment;
            return (
              <button
                key={seg.segment}
                onClick={() => handleSegmentSelect(isSelected ? '' : seg.segment)}
                className={`premium-card p-4 text-left transition duration-200 border flex flex-col justify-between h-28 cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'border-dark-border hover:border-gray-800'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    {SEGMENT_ICONS[seg.segment] || <HelpCircle className="h-4 w-4" />}
                    {seg.segment}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-dark-border text-gray-400'
                  }`}>
                    {(seg.percentage * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mt-2">{seg.count.toLocaleString()}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">Avg Spend: ${seg.avg_monetary.toFixed(0)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Customer Explorer Table Section */}
      <div className="premium-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              Customer Directory 
              {selectedSegment && (
                <span className="text-xs font-medium px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  {selectedSegment} Segment ({totalItems.toLocaleString()})
                </span>
              )}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Filter, search, and drill down into individual profiles</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search name, ID, email..."
                value={search}
                onChange={handleSearchChange}
                className="w-full md:w-64 bg-dark-bg border border-dark-border rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition duration-200"
              />
            </div>
            
            {/* Clear Filters */}
            {selectedSegment && (
              <button
                onClick={() => handleSegmentSelect('')}
                className="px-3 py-2 bg-dark-border hover:bg-gray-800 border border-gray-800 text-xs text-gray-300 rounded-lg transition"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner or Customer Table */}
        {loadingList ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">ID & Customer</th>
                  <th className="pb-3 font-semibold">Region</th>
                  <th className="pb-3 font-semibold">Tier / Status</th>
                  <th className="pb-3 font-semibold text-center">R / F / M Score</th>
                  <th className="pb-3 font-semibold text-right">Recency</th>
                  <th className="pb-3 font-semibold text-right">Freq</th>
                  <th className="pb-3 font-semibold text-right">Lifetime Revenue</th>
                  <th className="pb-3 font-semibold text-right">Projected CLV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-xs">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No customer records match current parameters.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr 
                      key={c.customer_id} 
                      className="hover:bg-dark-border/30 transition group cursor-pointer"
                      onClick={() => onSelectCustomer(c.customer_id)}
                    >
                      <td className="py-3.5 pr-3">
                        <div className="font-bold text-white group-hover:text-indigo-400 transition">{c.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{c.customer_id} • {c.email}</div>
                      </td>
                      <td className="py-3.5 text-gray-300">{c.location}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            c.subscription_tier === 'Enterprise' ? 'bg-purple-500/10 text-purple-400' :
                            c.subscription_tier === 'Premium' ? 'bg-indigo-500/10 text-indigo-400' :
                            c.subscription_tier === 'Basic' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {c.subscription_tier}
                          </span>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            c.subscription_status === 'Active' ? 'bg-emerald-500' :
                            c.subscription_status === 'Paused' ? 'bg-amber-500' : 'bg-red-500'
                          }`} title={c.subscription_status}></span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-bold text-gray-400">
                        {c.rfm ? (
                          <div className="flex justify-center gap-1">
                            <span className="px-1.5 py-0.5 bg-dark-border/50 text-[10px] rounded text-orange-400 font-black" title="Recency Score">{c.rfm.R}</span>
                            <span className="px-1.5 py-0.5 bg-dark-border/50 text-[10px] rounded text-emerald-400 font-black" title="Frequency Score">{c.rfm.F}</span>
                            <span className="px-1.5 py-0.5 bg-dark-border/50 text-[10px] rounded text-indigo-400 font-black" title="Monetary Score">{c.rfm.M}</span>
                          </div>
                        ) : '--'}
                      </td>
                      <td className="py-3.5 text-right font-medium text-gray-300">
                        {c.rfm ? `${c.rfm.recency} d ago` : '--'}
                      </td>
                      <td className="py-3.5 text-right font-medium text-gray-300">
                        {c.rfm ? `${c.rfm.frequency} tx` : '0'}
                      </td>
                      <td className="py-3.5 text-right font-black text-white">
                        ${c.historical_clv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right font-black text-emerald-400">
                        ${c.projected_clv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {customers.length > 0 && (
          <div className="flex items-center justify-between border-t border-dark-border mt-5 pt-4 text-xs text-gray-400">
            <span>
              Showing Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalItems.toLocaleString()} customers)
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
