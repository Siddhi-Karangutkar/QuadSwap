import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Package, 
  CreditCard, 
  ShoppingBag, 
  Activity, 
  Eye, 
  Search,
  Bell,
  ShieldAlert,
  FileText,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function AdminHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, items: 0, purchases: 0 });
  const [growth, setGrowth] = useState({ users: 0, items: 0, purchases: 0 });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchActivity();
    calculateGrowth();

    // Real-time Subscriptions
    const itemsChannel = supabase
      .channel('admin-items-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, () => {
        fetchActivity();
        fetchStats();
        calculateGrowth();
      })
      .subscribe();

    const proposalsChannel = supabase
      .channel('admin-proposals-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proposals' }, () => {
        fetchActivity();
        fetchStats();
        calculateGrowth();
      })
      .subscribe();

    const usersChannel = supabase
      .channel('admin-users-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, () => {
        fetchActivity();
        fetchStats();
        calculateGrowth();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(proposalsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: itemCount } = await supabase.from('items').select('*', { count: 'exact', head: true });
      const { count: purchaseCount } = await supabase.from('proposals').select('*', { count: 'exact', head: true });

      setStats({
        users: userCount || 0,
        items: itemCount || 0,
        purchases: purchaseCount || 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  const calculateGrowth = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString();

      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', dateStr);

      const { count: newItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', dateStr);

      const { count: newPurchases } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', dateStr);

      setGrowth({
        users: newUsers || 0,
        items: newItems || 0,
        purchases: newPurchases || 0
      });
    } catch (err) {
      console.error("Growth calculation failed:", err);
    }
  };

  const fetchActivity = async () => {
    try {
      // Fetch latest 5 items
      const { data: latestItems } = await supabase
        .from('items')
        .select('id, title, created_at, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch latest 5 proposals
      const { data: latestProposals } = await supabase
        .from('proposals')
        .select(`
          id, 
          offered_price, 
          created_at, 
          buyer:buyer_id(full_name),
          items(title)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Format and Merge
      const itemLogs = (latestItems || []).map(item => ({
        id: `item-${item.id}`,
        title: `New item listed: ${item.title}`,
        subtitle: `By ${item.users?.full_name || 'Anonymous'}`,
        time: new Date(item.created_at),
        type: 'item'
      }));

      const proposalLogs = (latestProposals || []).map(prop => ({
        id: `prop-${prop.id}`,
        title: `Proposal received for ${prop.items?.title}`,
        subtitle: `Offer of ₹${prop.offered_price} by ${prop.buyer?.full_name || 'Anonymous'}`,
        time: new Date(prop.created_at),
        type: 'proposal'
      }));

      const merged = [...itemLogs, ...proposalLogs]
        .sort((a, b) => b.time - a.time)
        .slice(0, 10);

      setActivities(merged);
    } catch (err) {
      console.error("Activity fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    try {
      const reportDate = new Date().toLocaleString();
      const reportRows = [
        ["QuadSwap - Administrative Growth Report"],
        [`Generated On: ${reportDate}`],
        [""],
        ["Metric Category", "Current Total", "7-Day Delta", "Growth %"],
        ["User Accounts", stats.users, `+${growth.users}`, `${((growth.users / (stats.users || 1)) * 100).toFixed(1)}%`],
        ["Product Listings", stats.items, `+${growth.items}`, `${((growth.items / (stats.items || 1)) * 100).toFixed(1)}%`],
        ["Transaction Volume", stats.purchases, `+${growth.purchases}`, "N/A"],
        [""],
        ["Marketplace Conversion Insights"],
        ["Listing Frequency", `${(growth.items / 7).toFixed(1)} items/day`],
        ["Target Conversion", "94%"],
        ["Report Status", "Verified - System Active"]
      ];

      const csvContent = reportRows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `QuadSwap_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("System Report generation failed. Please check console.");
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const AnalyticsModal = () => (
    <div className="admin-modal-overlay">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={() => setShowAnalytics(false)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <div className="admin-modal-v2 animate-reveal-scale" style={{ height: 'auto', maxWidth: '750px', padding: '3rem' }}>
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 hero-font">Growth Metrics</h2>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-70">7-Day Platform Performance</p>
            </div>
            <button 
              onClick={() => setShowAnalytics(false)}
              className="admin-icon-btn"
              style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-secondary)', width: '3rem', height: '3rem' }}
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="analytics-card-premium" style={{ background: 'rgba(67, 56, 202, 0.05)', borderColor: 'rgba(67, 56, 202, 0.1)' }}>
              <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--primary)' }}>
                <Users size={20} />
                <span className="text-[0.65rem] font-black uppercase tracking-widest">User Growth</span>
              </div>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 hero-font">+{growth.users}</div>
              <div className="text-[0.6rem] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp size={10} /> {((growth.users / (stats.users || 1)) * 100).toFixed(1)}% New Accounts
              </div>
            </div>

            <div className="analytics-card-premium" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.1)' }}>
              <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--secondary)' }}>
                <Package size={20} />
                <span className="text-[0.65rem] font-black uppercase tracking-widest">Item Velocity</span>
              </div>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 hero-font">+{growth.items}</div>
              <div className="text-[0.6rem] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp size={10} /> {((growth.items / (stats.items || 1)) * 100).toFixed(1)}% Weekly Growth
              </div>
            </div>

            <div className="analytics-card-premium" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
              <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--success)' }}>
                <CreditCard size={20} />
                <span className="text-[0.65rem] font-black uppercase tracking-widest">Volume</span>
              </div>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 hero-font">+{growth.purchases}</div>
              <div className="text-[0.6rem] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp size={10} /> Successful Proposals
              </div>
            </div>
          </div>

          <div className="admin-info-badge" style={{ padding: '2.5rem', borderRadius: '32px' }}>
            <h4 className="text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-6">Marketplace Conversion Insights</h4>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Listing Frequency</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{(growth.items / 7).toFixed(1)} items/day</span>
                </div>
                <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-slide-right" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Target Conversion</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">94%</span>
                </div>
                <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 animate-slide-right" style={{ width: '94%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center" style={{ marginTop: '1rem' }}>
            <button 
              onClick={exportReport}
              className="admin-btn admin-btn-primary"
              style={{ padding: '1.25rem 4rem', fontSize: '0.9rem' }}
            >
              Export System Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse">
        <div className="text-primary font-black uppercase tracking-widest">Hydrating Dashboard Registry...</div>
      </div>
    );
  }

  return (
    <div className="animate-reveal">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1 hero-font text-gradient">Platform Overview</h1>
          <p className="text-gray-400 text-sm font-bold tracking-wide uppercase opacity-70">Real-time ecosystem statistics • Live Monitor</p>
        </div>
        <div className="admin-search-wrapper">
          <Search className="search-icon" size={18} />
          <input type="text" placeholder="Search marketplace assets..." />
        </div>
      </div>

      <div className="admin-grid mb-16">
        <div className="admin-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-gray-400 font-bold text-[0.65rem] uppercase tracking-widest mb-1.5 ml-1">Total Verified Users</h3>
            <div className="text-3xl font-black text-gray-900 dark:text-white leading-none">{stats.users}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-center justify-center">
              <Package className="text-amber-600" size={24} />
            </div>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-gray-400 font-bold text-[0.65rem] uppercase tracking-widest mb-1.5 ml-1">Marketplace Items</h3>
            <div className="text-3xl font-black text-gray-900 dark:text-white leading-none">{stats.items}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center">
              <CreditCard className="text-emerald-600" size={24} />
            </div>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-gray-400 font-bold text-[0.65rem] uppercase tracking-widest mb-1.5 ml-1">Successful Purchases</h3>
            <div className="text-3xl font-black text-gray-900 dark:text-white leading-none">{stats.purchases}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="text-indigo-600" size={24} />
            </div>
            <div className="text-[0.6rem] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">System Health</div>
          </div>
          <div>
            <h3 className="text-gray-400 font-bold text-[0.65rem] uppercase tracking-widest mb-1.5 ml-1">Platform Status</h3>
            <div className="text-3xl font-black text-gray-900 dark:text-white leading-none">Healthy</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="admin-stat-card h-full" style={{ padding: '2.5rem' }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white underline decoration-primary/20 decoration-4 underline-offset-8">Recent System Activity</h2>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                <Activity size={24} />
              </div>
            </div>
            <div className="admin-timeline">
              {activities.length === 0 ? (
                <div className="text-center py-20 opacity-30 font-black uppercase text-xs">No Recent Activity Detected</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="timeline-item group">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white mb-0.5">{act.title}</p>
                            <p className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest opacity-60">
                              {act.subtitle} • {getTimeAgo(act.time)}
                            </p>
                          </div>
                        </div>
                        <button className="admin-icon-btn">
                          <Eye size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="admin-stat-card" style={{ padding: '2rem' }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Quick Actions</h3>
              <ShieldAlert className="text-primary/20" size={24} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <button 
                onClick={() => navigate('/admin-dashboard/notifications')}
                className="admin-btn admin-btn-secondary p-4 group"
                style={{ width: '100%', justifyContent: 'flex-start', gap: '1rem' }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white">
                  <Bell size={20} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black text-gray-900 dark:text-white">{`BROADCAST`}</span>
                  <span className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">Global Outreach</span>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/admin-dashboard/approve-users')}
                className="admin-btn admin-btn-secondary p-4 group"
                style={{ width: '100%', justifyContent: 'flex-start', gap: '1rem' }}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-all group-hover:bg-blue-500 group-hover:text-white">
                  <Users size={20} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black text-gray-900 dark:text-white">{`BULK VERIFY`}</span>
                  <span className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">Student Approval</span>
                </div>
              </button>

              <button 
                onClick={() => navigate('/admin-dashboard/manage-purchases')}
                className="admin-btn admin-btn-secondary p-4 group"
                style={{ width: '100%', justifyContent: 'flex-start', gap: '1rem' }}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center transition-all group-hover:bg-amber-500 group-hover:text-white">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black text-gray-900 dark:text-white">{`REPORTS`}</span>
                  <span className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">Ledger Oversight</span>
                </div>
              </button>

              <button 
                onClick={() => setShowAnalytics(true)}
                className="admin-btn admin-btn-secondary p-4 group"
                style={{ width: '100%', justifyContent: 'flex-start', gap: '1rem' }}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-all group-hover:bg-emerald-500 group-hover:text-white">
                  <Activity size={20} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black text-gray-900 dark:text-white">{`ANALYTICS`}</span>
                  <span className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">Growth Metrics</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {showAnalytics && <AnalyticsModal />}
    </div>
  );
}

export default AdminHome;
