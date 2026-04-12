import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Mail, 
  ShieldCheck, 
  LogOut, 
  Users, 
  Package, 
  CreditCard,
  CheckCircle2,
  Clock,
  KeyRound,
  LayoutDashboard,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

function AdminProfileView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, items: 0, purchases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
          Administrative Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
          Internal Security • System Identity
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2.5rem' }}>
        {/* Left: Identity Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="premium-card" style={{ background: 'var(--card-bg)', borderRadius: '32px', padding: '2.5rem', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(90deg, var(--primary), var(--primary-light))' }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ 
                width: '100px', height: '100px', borderRadius: '35px', 
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', 
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)',
                transform: 'rotate(-5deg)'
              }}>
                AD
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                System Admin <CheckCircle2 size={24} color="var(--success)" />
              </h2>
              <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(79, 70, 229, 0.1)', padding: '6px 16px', borderRadius: '30px', marginBottom: '1.5rem' }}>
                MASTER CONTROL ACCESS
              </p>

              <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '1.5rem 0' }}></div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ProfileInfo icon={<Mail size={16} />} label="Security Email" value="admin@gmail.com" />
                <ProfileInfo icon={<Shield size={16} />} label="Access Level" value="Root Administrator" />
                <ProfileInfo icon={<Clock size={16} />} label="Session Type" value="Local Persistent" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="admin-btn admin-btn-danger"
            style={{ padding: '1.25rem', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: 900, border: 'none' }}
          >
            <LogOut size={20} /> TERMINATE SESSION
          </button>
        </div>

        {/* Right: Security & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Platform Performance Stats */}
          <div className="premium-card" style={{ background: 'var(--card-bg)', borderRadius: '32px', padding: '2.5rem', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LayoutDashboard size={20} color="var(--primary)" /> Managed Ecosystem Stats
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <StatItem label="Authenticated Users" value={stats.users} color="var(--primary)" icon={<Users size={18} />} />
              <StatItem label="Active Listings" value={stats.items} color="#F59E0B" icon={<Package size={18} />} />
              <StatItem label="Verified Deals" value={stats.purchases} color="#10B981" icon={<CreditCard size={18} />} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ProfileInfo({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
      <div style={{ color: 'var(--primary)', opacity: 0.6 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color, icon }) {
  return (
    <div style={{ background: 'var(--sidebar-bg)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
        {icon}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.25rem', fontFamily: 'Outfit' }}>{value}</div>
      <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

export default AdminProfileView;
