import { useState, useEffect } from 'react';
import { api } from './api';
import { 
  Compass, LayoutDashboard, Layers, Users, ShieldAlert, 
  Award, Send, FileText, Search, RefreshCw, AlertCircle, CheckCircle 
} from 'lucide-react';

// Import views and subcomponents
import { OverviewDashboard } from './views/OverviewDashboard';
import { CustomerSegmentation } from './views/CustomerSegmentation';
import { CohortAnalysis } from './views/CohortAnalysis';
import { JourneyAnalytics } from './views/JourneyAnalytics';
import { ChurnRiskDashboard } from './views/ChurnRiskDashboard';
import { CLVAnalytics } from './views/CLVAnalytics';
import { RecommendationEngine } from './views/RecommendationEngine';
import { ExecutiveReports } from './views/ExecutiveReports';
import { Customer360Profile } from './components/Customer360Profile';

type ViewTab = 'overview' | 'segmentation' | 'cohorts' | 'journey' | 'churn' | 'clv' | 'recommendations' | 'executive';

function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [openCustomerId, setOpenCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<'connected' | 'checking' | 'failed'>('checking');
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Check backend connection health status
  const checkHealth = async () => {
    try {
      setBackendStatus('checking');
      await api.get('/overview');
      setBackendStatus('connected');
    } catch (err) {
      console.error(err);
      setBackendStatus('failed');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Trigger scikit-learn models retraining in backend
  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      showNotification('Submitting analytical retraining job to background...', 'info');
      const res = await api.post('/analytics/recalculate');
      if (res.data.status === 'success') {
        showNotification(res.data.message, 'success');
      } else {
        showNotification('Failed to schedule model retraining.', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error connecting to retraining endpoint.', 'error');
    } finally {
      setRecalculating(false);
    }
  };

  // Global search customer ID logic
  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Auto format queries like "125" into "CUST_000125" for UX convenience
    let formattedId = searchQuery.trim().toUpperCase();
    if (/^\d+$/.test(formattedId)) {
      const padNum = formattedId.padStart(6, '0');
      formattedId = `CUST_${padNum}`;
    }
    
    setOpenCustomerId(formattedId);
    setSearchQuery('');
  };

  const showNotification = (msg: string, type: 'success' | 'info' | 'error') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const navItems = [
    { id: 'overview', name: 'Overview Dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { id: 'segmentation', name: 'Customer Segments', icon: <Users className="h-4.5 w-4.5" /> },
    { id: 'cohorts', name: 'Cohort Heatmaps', icon: <Layers className="h-4.5 w-4.5" /> },
    { id: 'journey', name: 'Lifecycle Journeys', icon: <Compass className="h-4.5 w-4.5" /> },
    { id: 'churn', name: 'Churn Risk Prediction', icon: <ShieldAlert className="h-4.5 w-4.5" /> },
    { id: 'clv', name: 'CLV Analytics', icon: <Award className="h-4.5 w-4.5" /> },
    { id: 'recommendations', name: 'Recommendation Engine', icon: <Send className="h-4.5 w-4.5" /> },
    { id: 'executive', name: 'Executive Reports', icon: <FileText className="h-4.5 w-4.5" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex text-gray-100 selection:bg-indigo-500/30 selection:text-white">
      
      {/* Sidebar Panel */}
      <aside className="w-64 bg-[#12121A] border-r border-dark-border h-screen flex flex-col justify-between shrink-0 sticky top-0 hidden md:flex">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-dark-border/40 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              C
            </div>
            <div>
              <h1 className="font-black text-sm text-white tracking-widest uppercase">Customer360</h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Retention Analytics</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-[0_4px_15px_rgba(99,102,241,0.15)]' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-border/40'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Status footer */}
        <div className="p-4 border-t border-dark-border/40 text-[10px] space-y-3 bg-dark-bg/30">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-bold">ML PIPELINE STATUS</span>
            <span className={`flex items-center gap-1 font-black ${
              backendStatus === 'connected' ? 'text-emerald-400' :
              backendStatus === 'checking' ? 'text-amber-400 animate-pulse' : 'text-red-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                backendStatus === 'connected' ? 'bg-emerald-500' :
                backendStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
              }`}></span>
              {backendStatus === 'connected' ? 'CONNECTED' :
               backendStatus === 'checking' ? 'CHECKING...' : 'DISCONNECTED'}
            </span>
          </div>
          
          <button
            onClick={checkHealth}
            className="w-full text-center text-gray-400 hover:text-white py-1.5 bg-dark-bg hover:bg-dark-border border border-dark-border rounded font-bold transition cursor-pointer"
          >
            Check Server Link
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Controls bar */}
        <header className="h-16 border-b border-dark-border/40 bg-[#12121A]/70 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* View Title */}
            <h2 className="text-sm font-black uppercase text-white tracking-widest hidden sm:block">
              {navItems.find(n => n.id === activeTab)?.name}
            </h2>
            
            {/* Mini Brand for mobile screen */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center font-black text-white text-xs">C</span>
              <span className="font-black text-xs text-white uppercase tracking-wider">C360</span>
            </div>
          </div>

          {/* Right Header Panel Search & Actions */}
          <div className="flex items-center gap-4">
            
            {/* Search customer ID form */}
            <form onSubmit={handleGlobalSearch} className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lookup customer ID (e.g. 125)..."
                className="w-48 sm:w-64 bg-[#0B0B0F] border border-dark-border rounded-lg pl-8 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition duration-200"
              />
            </form>

            {/* Recalculate ML button */}
            <button
              onClick={handleRecalculate}
              disabled={recalculating || backendStatus !== 'connected'}
              className="p-2 bg-dark-border hover:bg-gray-800 disabled:opacity-40 text-gray-300 hover:text-white rounded-lg border border-gray-800 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Retrain scikit-learn models & recalculate RFM scores on-demand"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Models</span>
            </button>
          </div>
        </header>

        {/* Global Notifications Alert Banner */}
        {notification && (
          <div className="mx-6 mt-4 p-4 border rounded-xl flex items-center gap-3 justify-between shadow-lg animate-pulse-slow z-40 bg-[#12121A]">
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
              {notification.type === 'info' && <AlertCircle className="h-5 w-5 text-indigo-400" />}
              {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}
              <span className="text-xs font-medium text-white">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-xs text-gray-500 hover:text-white font-black">Dismiss</button>
          </div>
        )}

        {/* Active Page View Component */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'overview' && <OverviewDashboard onSelectCustomer={setOpenCustomerId} />}
          {activeTab === 'segmentation' && <CustomerSegmentation onSelectCustomer={setOpenCustomerId} />}
          {activeTab === 'cohorts' && <CohortAnalysis />}
          {activeTab === 'journey' && <JourneyAnalytics />}
          {activeTab === 'churn' && <ChurnRiskDashboard onSelectCustomer={setOpenCustomerId} />}
          {activeTab === 'clv' && <CLVAnalytics />}
          {activeTab === 'recommendations' && <RecommendationEngine />}
          {activeTab === 'executive' && <ExecutiveReports />}
        </main>

        {/* Customer Detail Sliding panel Overlay */}
        {openCustomerId && (
          <Customer360Profile 
            customerId={openCustomerId} 
            onClose={() => setOpenCustomerId('')} 
          />
        )}

      </div>
    </div>
  );
}

export default App;
