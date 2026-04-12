import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, Tag, Clock, UserCircle, LogOut, 
  Menu, X, ChevronRight, CheckCircle2, ListFilter, MessageSquare, Bell, Heart,
  Sun, Moon, ClipboardList
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import BrowseView from '../components/dashboard/BrowseView';
import SellRentForm from '../components/dashboard/SellRentForm';
import MyItemsView from '../components/dashboard/MyItemsView';
import OrderHistoryView from '../components/dashboard/OrderHistoryView';
import ProfileView from '../components/dashboard/ProfileView';
import ChatView from '../components/dashboard/ChatView';
import NotificationsView from '../components/dashboard/NotificationsView';
import WantedView from '../components/dashboard/WantedView';
import WishlistView from '../components/dashboard/WishlistView';
import '../index.css';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userData, setUserData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [locationState, setLocationState] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const fetchUserProfile = async (user) => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // User exists in Auth but NOT in 'users' table (rejected case)
        console.warn("User profile not found in database. Signing out.");
        await supabase.auth.signOut();
        navigate('/', { state: { message: "Your account was not found or was rejected. Please sign up again." } });
        return;
      }
      
      if (error) throw error;
      setUserData(data);
      fetchUnreadCount(user.id);
    } catch (err) {
      console.error("Error fetching user profile:", err.message);
    }
  };

  const fetchUnreadCount = async (userId) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    let channel;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // 1. Fetch Profile
      fetchUserProfile(user);

      // 2. Setup Subscription
      channel = supabase
        .channel('global_notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `receiver_id=eq.${user.id}` 
        }, () => {
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    navigate('/dashboard/sell');
  };

  const menuItems = [
    { label: 'Browse to Buy', path: '/dashboard', icon: <Search size={20} /> },
    { label: 'Browse to Rent', path: '/dashboard/browse-rent', icon: <ListFilter size={20} /> },
    { label: 'Wanted Board', path: '/dashboard/wanted', icon: <ClipboardList size={20} /> },
    { label: 'Post Sell/Rent', path: '/dashboard/sell', icon: <Tag size={20} /> },
    { label: 'Items Sold/Posted', path: '/dashboard/my-items', icon: <ShoppingBag size={20} /> },
    { label: 'Order History', path: '/dashboard/orders', icon: <Clock size={20} /> },
    { label: 'Messages', path: '/dashboard/chat', icon: <MessageSquare size={20} /> },
    { label: 'Notifications', path: '/dashboard/notifications', icon: <Bell size={20} /> },
    { label: 'My Wishlist', path: '/dashboard/wishlist', icon: <Heart size={20} /> },
    { label: 'My Profile', path: '/dashboard/profile', icon: <UserCircle size={20} /> },
  ];

  const userInitials = userData?.full_name 
    ? userData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) 
    : '??';

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>
      
      {/* Mobile Overlay */}
      {!sidebarOpen && (
        <button 
          onClick={toggleSidebar}
          style={{ position: 'fixed', top: '15px', left: '15px', zIndex: 100, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu size={24} color="var(--primary)" />
        </button>
      )}

      {/* Sidebar Content */}
      <aside style={{ 
        width: sidebarOpen ? '280px' : '0', 
        backgroundColor: 'var(--sidebar-bg)', 
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-color)', 
        transition: 'width var(--transition-smooth)', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 50
      }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div className="nav-brand" style={{ fontSize: '1.5rem' }}>
            <ShoppingBag size={24} /> QuadSwap
          </div>
          <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* User preview */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 700, 
              fontSize: '1.1rem',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {userData?.profile_pic_url ? (
                <img src={userData.profile_pic_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                userInitials
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1rem' }}>
                {userData?.full_name || 'Loading...'} <CheckCircle2 size={14} color={userData?.is_verified ? "var(--success)" : "#94A3B8"} />
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userData?.year_of_study || userData?.college || 'Student'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path || (location.pathname === item.path + '/');
              return (
                <li 
                  key={item.label} 
                  className="animate-reveal" 
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <button 
                    onClick={() => navigate(item.path)}
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '0.75rem', 
                      padding: '0.85rem 1rem', 
                      borderRadius: 'var(--radius-lg)', 
                      border: 'none', 
                      background: isActive ? 'var(--primary)' : 'transparent', 
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all var(--transition-smooth)',
                      boxShadow: isActive ? 'var(--shadow-lg), var(--shadow-glow)' : 'none',
                      transform: isActive ? 'scale(1.02)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                        {item.badge > 0 && (
                          <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid var(--sidebar-bg)' }}>
                            {item.badge}
                          </span>
                        )}
                      </div> 
                      {item.label}
                    </div>
                    {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', opacity: 0.8 }} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom controls */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={toggleTheme}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '0.8rem 1rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)', 
              background: 'var(--card-bg)', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all var(--transition-smooth)',
              boxShadow: 'var(--shadow-sm)'
            }}
            className="premium-hover"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.4rem', 
                borderRadius: '8px', 
                background: theme === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(129, 140, 248, 0.1)',
                color: theme === 'light' ? 'var(--secondary)' : 'var(--primary-light)'
              }}>
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{theme === 'light' ? 'Light' : 'Dark'} Mode</span>
            </div>
            {/* Toggle switch visual */}
            <div style={{ 
              width: '36px', 
              height: '20px', 
              borderRadius: '10px', 
              background: theme === 'dark' ? 'var(--primary)' : 'var(--border-color)',
              position: 'relative',
              transition: 'all 0.4s ease'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '2px',
                left: theme === 'dark' ? '18px' : '2px',
                width: '16px',
                height: '16px',
                background: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
          </button>
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              border: 'none', 
              background: 'transparent', 
              color: 'var(--danger)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {sidebarOpen && (
          <div style={{ display: 'flex', padding: '1rem 2rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(10px)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Dashboard</h2>
          </div>
        )}
        <div style={{ padding: sidebarOpen ? '0' : '3rem 0 0 0', height: '100%' }}>
          <Routes>
            <Route path="/" element={<BrowseView type="buy" sidebarOpen={sidebarOpen} userData={userData} />} />
            <Route path="/browse-rent" element={<BrowseView type="rent" sidebarOpen={sidebarOpen} userData={userData} />} />
            <Route path="/wanted" element={<WantedView sidebarOpen={sidebarOpen} userData={userData} />} />
            <Route path="/sell" element={<div style={{ padding: '2rem' }}><SellRentForm editingItem={editingItem} onClearEdit={() => setEditingItem(null)} userData={userData} /></div>} />
            <Route path="/my-items" element={<MyItemsView sidebarOpen={sidebarOpen} onEditItem={handleEditItem} userData={userData} />} />
            <Route path="/orders" element={<OrderHistoryView />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/notifications" element={<NotificationsView />} />
            <Route path="/wishlist" element={<WishlistView sidebarOpen={sidebarOpen} />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
