import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Routes, Route } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  ShoppingBag, 
  Clock, 
  Users, 
  CreditCard, 
  ClipboardList, 
  Bell, 
  User, 
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import AdminHome from '../components/admin/AdminHome';
import ApproveUsersView from '../components/admin/ApproveUsersView';
import AdminManageItems from '../components/admin/AdminManageItems';
import AdminManagePurchases from '../components/admin/AdminManagePurchases';
import AdminManageUsers from '../components/admin/AdminManageUsers';
import AdminManageWanted from '../components/admin/AdminManageWanted';
import AdminNotifications from '../components/admin/AdminNotifications';
import AdminProfileView from '../components/admin/AdminProfileView';
import '../index.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    // Basic protection - check for token
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin-login');
      return;
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  const navItems = [
    { path: '/admin-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, end: true },
    { path: '/admin-dashboard/approve-users', label: 'Approve Users', icon: <UserCheck size={20} /> },
    { path: '/admin-dashboard/manage-buy-items', label: 'Manage Buy Items', icon: <ShoppingBag size={20} /> },
    { path: '/admin-dashboard/manage-rent-items', label: 'Manage Rent Items', icon: <Clock size={20} /> },
    { path: '/admin-dashboard/manage-users', label: 'Manage Users', icon: <Users size={20} /> },
    { path: '/admin-dashboard/manage-purchases', label: 'Manage Purchases', icon: <CreditCard size={20} /> },
    { path: '/admin-dashboard/manage-wanted-board', label: 'Manage Wanted Board', icon: <ClipboardList size={20} /> },
    { path: '/admin-dashboard/notifications', label: 'Send Notification', icon: <Bell size={20} /> },
    { path: '/admin-dashboard/profile', label: 'My Profile', icon: <User size={20} /> },
  ];

  return (
    <div className="admin-dashboard-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ width: sidebarOpen ? '280px' : '80px' }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div className="nav-brand" style={{ fontSize: '1.5rem', display: sidebarOpen ? 'flex' : 'none', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingBag size={24} /> QuadAdmin
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Admin preview */}
        {sidebarOpen && (
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
                boxShadow: 'var(--shadow-sm)'
              }}>
                AD
              </div>
              <div style={{ overflow: 'hidden' }}>
                <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  System Admin <CheckCircle2 size={14} color="var(--success)" />
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  Master Control
                </p>
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '1rem 0' }} className="custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ width: sidebarOpen ? 'calc(100% - 2rem)' : '48px', justifyContent: sidebarOpen ? 'space-between' : 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                {sidebarOpen && <span>{item.label}</span>}
              </div>
              {sidebarOpen && <div className="active-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', opacity: 0.8, display: 'none' }} />}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={toggleTheme}
            style={{ 
              width: sidebarOpen ? 'calc(100% - 2rem)' : '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              padding: '0.8rem 1rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)', 
              background: 'var(--card-bg)', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all var(--transition-smooth)',
              boxShadow: 'var(--shadow-sm)',
              margin: sidebarOpen ? '0.25rem 1rem' : '0 auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.4rem', 
                borderRadius: '8px', 
                background: theme === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(129, 140, 248, 0.1)',
                color: theme === 'light' ? 'var(--secondary)' : 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              {sidebarOpen && <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{theme === 'light' ? 'Light' : 'Dark'} Mode</span>}
            </div>
            {sidebarOpen && (
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
            )}
          </button>
          <button 
            onClick={handleLogout}
            className="admin-nav-item"
            style={{ width: sidebarOpen ? 'calc(100% - 2rem)' : '48px', justifyContent: sidebarOpen ? 'flex-start' : 'center', color: '#ef4444', margin: '0.25rem 1rem' }}
          >
            <div style={{ minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
              <LogOut size={20} />
            </div>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area Driven by Routing */}
      <main className="admin-main-content">
        <div className="w-full h-full">
          <Routes>
            <Route index element={<AdminHome />} />
            <Route path="approve-users" element={<ApproveUsersView />} />
            <Route path="manage-buy-items" element={<AdminManageItems type="buy" />} />
            <Route path="manage-rent-items" element={<AdminManageItems type="rent" />} />
            <Route path="manage-users" element={<AdminManageUsers />} />
            <Route path="manage-purchases" element={<AdminManagePurchases />} />
            <Route path="manage-wanted-board" element={<AdminManageWanted />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="profile" element={<AdminProfileView />} />
            <Route path="*" element={<AdminHome />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
