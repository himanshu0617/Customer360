import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  X, Calendar, MapPin, Mail, User, ShieldAlert, Award, 
  DollarSign, Activity, MessageSquare, PlusCircle, CheckCircle2, 
  AlertTriangle, Clock, PlayCircle 
} from 'lucide-react';

interface Transaction {
  transaction_id: string;
  amount: number;
  timestamp: string;
  category: string;
  payment_method: string;
}

interface SupportTicket {
  interaction_id: string;
  timestamp: string;
  category: string;
  sentiment: string;
  resolution_time_minutes: number;
  resolved: boolean;
}

interface TimelineItem {
  type: 'signup' | 'support' | 'transaction';
  date: string;
  title: string;
  description: string;
}

interface CustomerCardData {
  profile: {
    customer_id: string;
    name: string;
    email: string;
    gender: string;
    location: string;
    age: number;
    signup_date: string;
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
    historical_clv: number;
    projected_clv: number;
  };
  transactions: Transaction[];
  support: SupportTicket[];
  timeline: TimelineItem[];
  recommendations: {
    type: string;
    recommendation: string;
    rationale: string;
  }[];
}

interface Customer360ProfileProps {
  customerId: string;
  onClose: () => void;
}

export const Customer360Profile: React.FC<Customer360ProfileProps> = ({ customerId, onClose }) => {
  const [data, setData] = useState<CustomerCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'transactions' | 'support'>('timeline');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/customers/${customerId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load customer profile.');
      } finally {
        setLoading(false);
      }
    };
    if (customerId) {
      fetchProfile();
    }
  }, [customerId]);

  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      
      {/* Background overlay click handler */}
      <div className="flex-1" onClick={onClose}></div>

      {/* Main Drawer Panel */}
      <div className="w-full max-w-2xl bg-[#0C0C14] border-l border-dark-border h-full flex flex-col justify-between overflow-hidden shadow-2xl relative">
        
        {/* Header Section */}
        <div className="p-6 border-b border-dark-border/60 flex items-center justify-between bg-dark-bg/60">
          <div>
            <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Customer 360 Card</span>
            {loading ? (
              <div className="h-6 w-48 bg-dark-border/40 animate-pulse rounded mt-1"></div>
            ) : (
              <h3 className="text-lg font-bold text-white mt-0.5">{data?.profile.name}</h3>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-dark-border hover:bg-gray-800 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-28 bg-dark-border/30 rounded-xl"></div>
              <div className="h-24 bg-dark-border/30 rounded-xl"></div>
              <div className="h-48 bg-dark-border/30 rounded-xl"></div>
            </div>
          ) : error || !data ? (
            <div className="text-center py-20 text-gray-500">
              <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p>{error || 'Could not fetch customer.'}</p>
            </div>
          ) : (
            <>
              {/* Demographics Overview Card */}
              <div className="premium-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-dark-bg/40">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase text-gray-500 block">Age / Gender</span>
                    <span className="text-xs font-bold text-white">{data.profile.age} • {data.profile.gender}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase text-gray-500 block">Region</span>
                    <span className="text-xs font-bold text-white">{data.profile.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase text-gray-500 block">Customer Since</span>
                    <span className="text-xs font-bold text-white">{data.profile.signup_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-[9px] uppercase text-gray-500 block">Tier / Status</span>
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {data.profile.subscription_tier} 
                      <span className={`h-1.5 w-1.5 rounded-full ${data.profile.subscription_status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Churn Risk & CLV Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Churn risk meter */}
                <div className="premium-card p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Churn Risk Quotient</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xl font-black ${
                        data.profile.churn_risk?.category === 'High' ? 'text-red-500' :
                        data.profile.churn_risk?.category === 'Medium' ? 'text-amber-500' : 'text-emerald-400'
                      }`}>
                        {((data.profile.churn_risk?.score || 0) * 100).toFixed(0)}% Churn Risk
                      </span>
                      <p className="text-[10px] text-gray-500 mt-1">Predicted category: {data.profile.churn_risk?.category}</p>
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-dark-bg border border-dark-border text-xs font-bold">
                      {(data.profile.rfm?.segment) ? SEGMENT_LABEL_INITIAL(data.profile.rfm.segment) : '--'}
                    </div>
                  </div>
                  {/* Gauge bar */}
                  <div className="w-full bg-dark-bg h-1.5 rounded-full overflow-hidden mt-3 border border-dark-border">
                    <div 
                      className={`h-full rounded-full ${
                        data.profile.churn_risk?.category === 'High' ? 'bg-red-500' :
                        data.profile.churn_risk?.category === 'Medium' ? 'bg-amber-500' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${(data.profile.churn_risk?.score || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* CLV indicators */}
                <div className="premium-card p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Revenue Valuations</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-[9px] uppercase text-gray-500 block">Historical spent</span>
                      <span className="text-sm font-black text-white">${data.profile.historical_clv.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-500 block text-emerald-400">Projected CLV</span>
                      <span className="text-sm font-black text-emerald-400">${data.profile.projected_clv.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Actions/Recommendations Checklist */}
              <div className="premium-card p-4 border-l-4 border-indigo-500">
                <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-3">AI Next-Best-Action recommendations</h4>
                <div className="space-y-3">
                  {data.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-dark-bg/60 border border-dark-border/40 rounded-lg flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black rounded uppercase tracking-wider">{rec.type}</span>
                        <p className="text-[11px] font-bold text-white mt-1 leading-relaxed">{rec.recommendation}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Rationale: {rec.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-Tabs Selector */}
              <div>
                <div className="flex border-b border-dark-border gap-4 text-xs font-bold">
                  <button 
                    onClick={() => setActiveTab('timeline')}
                    className={`pb-2 transition cursor-pointer ${activeTab === 'timeline' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    User Journey Timeline
                  </button>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className={`pb-2 transition cursor-pointer ${activeTab === 'transactions' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    Invoices ({data.transactions.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('support')}
                    className={`pb-2 transition cursor-pointer ${activeTab === 'support' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    Support interactions ({data.support.length})
                  </button>
                </div>

                <div className="mt-4 min-h-[200px]">
                  
                  {/* Timeline View */}
                  {activeTab === 'timeline' && (
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-border/50 pl-6">
                      {data.timeline.map((item, idx) => (
                        <div key={idx} className="relative">
                          {/* Left node indicator */}
                          <div className={`absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-[#0C0C14] flex items-center justify-center ${
                            item.type === 'signup' ? 'border-purple-500' :
                            item.type === 'support' ? 'border-red-500' : 'border-indigo-500'
                          }`}>
                            <span className="h-1 w-1 rounded-full bg-white"></span>
                          </div>
                          
                          <div>
                            <span className="text-[9px] text-gray-500 font-bold block">{item.date}</span>
                            <span className="text-xs font-bold text-white">{item.title}</span>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transactions Invoice List */}
                  {activeTab === 'transactions' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-dark-border text-gray-500 uppercase text-[10px] tracking-wider pb-2">
                            <th className="pb-2">Tx ID</th>
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2">Method</th>
                            <th className="pb-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-border/20 text-gray-300">
                          {data.transactions.map((tx) => (
                            <tr key={tx.transaction_id}>
                              <td className="py-2.5 font-semibold text-gray-400">{tx.transaction_id}</td>
                              <td className="py-2.5">{tx.timestamp.substring(0, 10)}</td>
                              <td className="py-2.5">{tx.category}</td>
                              <td className="py-2.5">{tx.payment_method}</td>
                              <td className="py-2.5 text-right font-bold text-white">${tx.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Support Ticket list */}
                  {activeTab === 'support' && (
                    <div className="space-y-3">
                      {data.support.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-6">No support tickets registered.</p>
                      ) : (
                        data.support.map((ticket) => (
                          <div key={ticket.interaction_id} className="p-3 bg-dark-bg/60 border border-dark-border/40 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MessageSquare className={`h-4.5 w-4.5 ${
                                ticket.sentiment === 'Positive' ? 'text-emerald-400' :
                                ticket.sentiment === 'Negative' ? 'text-red-400' : 'text-gray-400'
                              }`} />
                              <div>
                                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  {ticket.category} Ticket
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                                    ticket.sentiment === 'Positive' ? 'bg-emerald-500/10 text-emerald-400' :
                                    ticket.sentiment === 'Negative' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
                                  }`}>{ticket.sentiment}</span>
                                </h5>
                                <p className="text-[10px] text-gray-500 mt-1">ID: {ticket.interaction_id} • Resolved in {ticket.resolution_time_minutes} min</p>
                              </div>
                            </div>
                            
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              ticket.resolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {ticket.resolved ? 'Resolved' : 'Open'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-dark-border/60 flex items-center justify-between bg-dark-bg/60">
          <span className="text-[10px] text-gray-500 font-bold">ID: {customerId}</span>
          <button
            onClick={() => {
              if (!data) return;
              const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", jsonStr);
              downloadAnchor.setAttribute("download", `customer360_${customerId}_profile.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              document.body.removeChild(downloadAnchor);
            }}
            disabled={loading || !data}
            className="px-4 py-2 bg-dark-border hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-dark-border border border-gray-800 text-white font-bold text-xs rounded-lg transition duration-200 cursor-pointer"
          >
            Export Profile JSON
          </button>
        </div>

      </div>
    </div>
  );
};

// Quick label generator for initial badge
function SEGMENT_LABEL_INITIAL(segName: string) {
  const parts = segName.split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return segName.substring(0, 2).toUpperCase();
}
