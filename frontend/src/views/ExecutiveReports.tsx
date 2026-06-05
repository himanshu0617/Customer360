import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  FileText, Download, Sparkles, TrendingUp, AlertTriangle, 
  HelpCircle, CheckCircle, ShieldAlert, DollarSign, RefreshCw 
} from 'lucide-react';

interface Insight {
  title: string;
  type: string;
  detail: string;
}

interface SegmentContribution {
  segment: string;
  count: number;
  revenue: number;
  rev_pct: number;
}

interface ChurnByTier {
  tier: string;
  count: number;
  churn_rate: number;
}

interface ExecutiveData {
  kpis: {
    total_customers: number;
    active_customers: number;
    churn_rate: number;
    total_revenue: number;
    average_clv: number;
    projected_clv_expansion: number;
  };
  segment_revenue_contribution: SegmentContribution[];
  churn_by_tier: ChurnByTier[];
  insights: Insight[];
}

export const ExecutiveReports: React.FC = () => {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/executive');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch executive business report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleExportData = (type: 'insights' | 'revenue' | 'churn') => {
    if (!data) return;
    setDownloading(type);
    
    setTimeout(() => {
      let csvContent = "data:text/csv;charset=utf-8,";
      let filename = `customer360_${type}_report.csv`;
      
      if (type === 'insights') {
        csvContent += "Title,Type,Detail\n";
        data.insights.forEach(item => {
          csvContent += `"${item.title.replace(/"/g, '""')}","${item.type}","${item.detail.replace(/"/g, '""')}"\n`;
        });
      } else if (type === 'revenue') {
        csvContent += "Segment,AccountsCount,HistoricalRevenue,RevenuePercentage\n";
        data.segment_revenue_contribution.forEach(item => {
          csvContent += `"${item.segment}",${item.count},${item.revenue},${(item.rev_pct*100).toFixed(2)}%\n`;
        });
      } else {
        csvContent += "SubscriptionTier,TotalAccounts,ChurnRate\n";
        data.churn_by_tier.forEach(item => {
          csvContent += `"${item.tier}",${item.count},${(item.churn_rate*100).toFixed(2)}%\n`;
        });
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(null);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium animate-pulse">Generating Executive Summary Insights...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="premium-card p-8 text-center max-w-xl mx-auto mt-20 border-red-900/50">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Failed to Generate Report</h3>
        <p className="text-gray-400 mb-6">{error || 'Could not aggregate reporting records'}</p>
        <button 
          onClick={fetchReportData}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium transition duration-200 mx-auto flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Re-Generate Report
        </button>
      </div>
    );
  }

  const { kpis, segment_revenue_contribution, churn_by_tier, insights } = data;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'Success':
        return <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />;
      case 'Warning':
        return <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 animate-pulse" />;
      case 'Opportunity':
        return <TrendingUp className="h-5 w-5 text-indigo-400 shrink-0" />;
      default:
        return <Sparkles className="h-5 w-5 text-purple-400 shrink-0 animate-pulse" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="premium-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Executive Business Insights & Reports</h3>
          <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
            Auto-generated commercial summaries and recommendations compiled by our analytical pipeline. 
            Identify key profit centers, operational bottlenecks, and export structured spreadsheets for reporting distributions.
          </p>
        </div>
        
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => handleExportData('insights')}
            disabled={!!downloading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> 
            {downloading === 'insights' ? 'Exporting...' : 'Export Insights CSV'}
          </button>
        </div>
      </div>

      {/* Row 1: Key Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="premium-card p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg"><DollarSign className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Total Platform Revenues</p>
            <h3 className="text-2xl font-black text-white mt-1">${kpis.total_revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
          </div>
        </div>
        
        <div className="premium-card p-5 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-lg"><ShieldAlert className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Average Platform Churn</p>
            <h3 className="text-2xl font-black text-white mt-1">{(kpis.churn_rate * 100).toFixed(2)}%</h3>
          </div>
        </div>

        <div className="premium-card p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Future CLV Target</p>
            <h3 className="text-2xl font-black text-white mt-1">${kpis.projected_clv_expansion.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
          </div>
        </div>
      </div>

      {/* Row 2: AI Business Summary Insights list */}
      <div className="premium-card p-5">
        <h4 className="text-sm font-bold text-white uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
          <span>AI-Generated Performance Insights & Anomalies</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {insights.map((ins, idx) => (
            <div key={idx} className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl flex items-start gap-3.5 hover:border-gray-800 transition">
              {getInsightIcon(ins.type)}
              <div>
                <h5 className="text-xs font-bold text-white mb-1.5">{ins.title}</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">{ins.detail}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black mt-3 inline-block uppercase tracking-wider ${
                  ins.type === 'Success' ? 'bg-emerald-500/10 text-emerald-400' :
                  ins.type === 'Warning' ? 'bg-red-500/10 text-red-400' :
                  ins.type === 'Opportunity' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'
                }`}>
                  {ins.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Detail Matrices for CSV downloads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue contribution table */}
        <div className="premium-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Contribution by Segment</h4>
              <button
                onClick={() => handleExportData('revenue')}
                disabled={!!downloading}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3 w-3" /> {downloading === 'revenue' ? 'Exporting...' : 'Export'}
              </button>
            </div>
            
            <div className="space-y-3">
              {segment_revenue_contribution.map(item => (
                <div key={item.segment} className="flex items-center justify-between py-2 border-b border-dark-border/40 text-xs">
                  <span className="font-semibold text-gray-300">{item.segment}</span>
                  <div className="text-right">
                    <span className="font-bold text-white">${item.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                    <span className="text-[10px] text-gray-500 ml-2">({(item.rev_pct*100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-4 border-t border-dark-border/30 pt-3">
            * Segments are calculated on Recency, Frequency, and Monetary scores dynamically.
          </div>
        </div>

        {/* Churn mix table */}
        <div className="premium-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Subscription Churn Rate mix</h4>
              <button
                onClick={() => handleExportData('churn')}
                disabled={!!downloading}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3 w-3" /> {downloading === 'churn' ? 'Exporting...' : 'Export'}
              </button>
            </div>
            
            <div className="space-y-3">
              {churn_by_tier.map(item => (
                <div key={item.tier} className="flex items-center justify-between py-2 border-b border-dark-border/40 text-xs">
                  <span className="font-semibold text-gray-300">{item.tier} Tier ({item.count.toLocaleString()} accounts)</span>
                  <span className={`font-black ${item.churn_rate > 0.2 ? 'text-red-400' : item.churn_rate > 0.08 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(item.churn_rate * 100).toFixed(2)}% Churn
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-4 border-t border-dark-border/30 pt-3">
            * Target benchmark churn should remain under 5% annually for Enterprise accounts.
          </div>
        </div>

      </div>

    </div>
  );
};
