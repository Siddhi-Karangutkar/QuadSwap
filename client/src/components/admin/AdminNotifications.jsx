import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  User, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  X,
  Clock,
  ArrowRight,
  ShieldAlert,
  Megaphone
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminNotifications() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [broadcastMode, setBroadcastMode] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'system',
    link: ''
  });

  const [recentNotifs, setRecentNotifs] = useState([]);

  useEffect(() => {
    fetchRecentNotifications();
  }, []);

  const fetchRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setRecentNotifs(data || []);
    } catch (err) {
      console.error("Error fetching recent notifications:", err.message);
    }
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, profile_pic_url, college')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("User search failed:", err.message);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      alert("Please fill in title and message.");
      return;
    }

    if (!broadcastMode && !selectedUser) {
      alert("Please select a recipient or enable Broadcast Mode.");
      return;
    }

    setLoading(true);
    try {
      let recipients = [];

      if (broadcastMode) {
        // Fetch ALL verified users
        const { data: allUsers, error: fetchErr } = await supabase
          .from('users')
          .select('id')
          .eq('is_verified', true);
        
        if (fetchErr) throw fetchErr;
        recipients = allUsers.map(u => u.id);
      } else {
        recipients = [selectedUser.id];
      }

      if (recipients.length === 0) {
        throw new Error("No verified users found to receive this notification.");
      }

      // Bulk Insert
      const notificationsToInsert = recipients.map(uid => ({
        user_id: uid,
        title: form.title,
        message: form.message,
        type: form.type,
        link: form.link || null,
        is_read: false
      }));

      // Supabase handles bulk insert automatically with arrays
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertErr) throw insertErr;

      alert(`Successfully sent notification to ${broadcastMode ? `${recipients.length} users` : selectedUser.full_name}.`);
      
      // Reset form
      setForm({ title: '', message: '', type: 'system', link: '' });
      setSelectedUser(null);
      setBroadcastMode(false);
      setSearchQuery('');
      setUsers([]);
      fetchRecentNotifications();

    } catch (err) {
      alert("Notification delivery failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-reveal" style={{ 
      paddingBottom: '4rem', 
      maxWidth: '1300px', 
      margin: '0 auto',
      animation: 'reveal 0.8s var(--transition-smooth) backwards'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2.25rem', 
          fontWeight: 900, 
          color: 'var(--text-primary)', 
          marginBottom: '0.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          letterSpacing: '-0.03em',
          fontFamily: 'Outfit, sans-serif'
        }}>
          <Bell style={{ color: 'var(--primary)' }} size={32} /> Notification Terminal
        </h1>
        <p style={{ 
          color: 'var(--text-tertiary)', 
          fontSize: '0.75rem', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: '0.15em',
          opacity: 0.8
        }}>
          Platform-Wide Communication • Direct Student Outreach
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.4fr 1fr', 
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        {/* Left Side: Creation Form */}
        <div style={{ 
          background: 'var(--card-bg)', 
          border: '1.5px solid var(--border-color)', 
          borderRadius: '28px',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              {[
                { id: 'indiv', mode: false, label: 'Individual User', icon: <User size={22} /> },
                { id: 'globe', mode: true, label: 'Global Broadcast', icon: <Megaphone size={22} /> }
              ].map(tab => (
                <button 
                  key={tab.id}
                  type="button"
                  onClick={() => { setBroadcastMode(tab.mode); if(tab.mode) setSelectedUser(null); }}
                  style={{ 
                    flex: 1, 
                    padding: '1.25rem', 
                    borderRadius: '20px', 
                    border: '2px solid',
                    borderColor: (broadcastMode === tab.mode) ? 'var(--primary)' : 'var(--border-color)',
                    background: (broadcastMode === tab.mode) ? 'rgba(67, 56, 202, 0.04)' : 'transparent',
                    color: (broadcastMode === tab.mode) ? 'var(--primary)' : 'var(--text-tertiary)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer'
                  }}
                >
                  {tab.icon}
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Recipient Selection */}
            {!broadcastMode ? (
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Target Recipient</label>
                {selectedUser ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'between', 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(67, 56, 202, 0.05)', 
                    borderRadius: '16px', 
                    border: '1.5px solid rgba(67, 56, 202, 0.15)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        background: 'var(--primary)', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 900,
                        boxShadow: '0 4px 12px rgba(67, 56, 202, 0.2)'
                      }}>
                        {selectedUser.full_name.charAt(0)}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{selectedUser.full_name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{selectedUser.college}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(null)} 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: 'none', 
                        padding: '0.5rem', 
                        borderRadius: '10px', 
                        color: '#ef4444', 
                        cursor: 'pointer' 
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Search 
                      style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} 
                      size={20} 
                    />
                    <input 
                      type="text"
                      placeholder="Search student by name or email..."
                      style={{ 
                        width: '100%', 
                        padding: '1rem 1rem 1rem 3rem', 
                        background: 'var(--sidebar-bg)', 
                        border: '1.5px solid var(--border-color)', 
                        borderRadius: '18px', 
                        fontWeight: 700, 
                        fontSize: '0.9rem', 
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      value={searchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                    />
                    {users.length > 0 && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '110%', 
                        left: 0, 
                        width: '100%', 
                        background: 'var(--card-bg)', 
                        border: '1.5px solid var(--border-color)', 
                        borderRadius: '18px', 
                        boxShadow: 'var(--shadow-xl)', 
                        zIndex: 100, 
                        overflow: 'hidden' 
                      }}>
                        {users.map(u => (
                          <div 
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.75rem', 
                              padding: '0.75rem 1rem', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid var(--border-color)',
                              background: 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(67, 56, 202, 0.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
                              {u.full_name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{u.full_name}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{u.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(245, 158, 11, 0.05)', 
                border: '1.5px solid rgba(245, 158, 11, 0.2)', 
                borderRadius: '18px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem' 
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} />
                </div>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Strategic Broadcast: This will trigger a notification for <span style={{ color: 'var(--primary)' }}>ALL verified students</span> across the system.
                </p>
              </div>
            )}

            {/* Notification Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Category Filter</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { val: 'system', icon: <Megaphone size={14} />, label: 'System' },
                    { val: 'offer', icon: <CheckCircle2 size={14} />, label: 'Special' },
                    { val: 'alert', icon: <AlertTriangle size={14} />, label: 'Alert' },
                    { val: 'proposal', icon: <Info size={14} />, label: 'Info' }
                  ].map(t => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.val })}
                      style={{ 
                        padding: '0.75rem', 
                        borderRadius: '14px', 
                        border: '1.5px solid',
                        borderColor: form.type === t.val ? 'var(--primary)' : 'var(--border-color)',
                        background: form.type === t.val ? 'var(--primary)' : 'transparent',
                        color: form.type === t.val ? 'white' : 'var(--text-tertiary)',
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Jump Link (Optional)</label>
                <input 
                  type="text"
                  placeholder="/dashboard/profile"
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    background: 'var(--sidebar-bg)', 
                    border: '1.5px solid var(--border-color)', 
                    borderRadius: '16px', 
                    fontWeight: 700, 
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Headline / Subject</label>
              <input 
                type="text"
                placeholder="Important Platform Update..."
                style={{ 
                  width: '100%', 
                  padding: '1.25rem', 
                  background: 'var(--sidebar-bg)', 
                  border: '1.5px solid var(--border-color)', 
                  borderRadius: '18px', 
                  fontWeight: 900, 
                  fontSize: '1.1rem',
                  outline: 'none',
                  color: 'var(--text-primary)'
                }}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={50}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Message Payload</label>
              <textarea 
                placeholder="Write your announcement here..."
                style={{ 
                  width: '100%', 
                  padding: '1.25rem', 
                  background: 'var(--sidebar-bg)', 
                  border: '1.5px solid var(--border-color)', 
                  borderRadius: '18px', 
                  fontWeight: 500, 
                  fontSize: '0.95rem',
                  outline: 'none',
                  minHeight: '140px',
                  resize: 'none',
                  lineHeight: 1.6
                }}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '1.25rem', 
                background: 'var(--primary)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '20px', 
                fontWeight: 900, 
                fontSize: '1rem', 
                letterSpacing: '0.1em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s',
                boxShadow: '0 12px 24px rgba(67, 56, 202, 0.3)',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(67, 56, 202, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(67, 56, 202, 0.3)'; }}
            >
              {loading ? 'INITIATING DISPATCH...' : <><Send size={20} /> DISPATCH NOTIFICATION</>}
            </button>
          </form>
        </div>

        {/* Right Side: Preview & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Live Preview */}
          <section style={{ 
            padding: '2rem', 
            borderRadius: '28px', 
            border: '2px dashed var(--border-color)', 
            background: 'var(--sidebar-bg)' 
          }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Megaphone size={18} /> Student Viewport Preview
            </h3>
            
            <div style={{ 
              background: 'var(--card-bg)', 
              border: '1.5px solid var(--border-color)', 
              borderRadius: '20px', 
              padding: '1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              boxShadow: 'var(--shadow-xl)' 
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(67, 56, 202, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                {form.type === 'system' && <Megaphone size={22} />}
                {form.type === 'offer' && <CheckCircle2 size={22} />}
                {form.type === 'alert' && <AlertTriangle size={22} />}
                {form.type === 'proposal' && <Info size={22} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                  <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.title || 'Untitled Notification'}</h4>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-tertiary)', opacity: 0.6 }}>NOW</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>
                  {form.message || 'Write a message to see the preview...'}
                </p>
              </div>
              <ArrowRight size={18} style={{ color: 'var(--primary)', opacity: 0.3 }} />
            </div>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-time Delivery Visualization</p>
          </section>

          {/* Recent Logs List */}
          <section style={{ 
            background: 'var(--card-bg)', 
            border: '1.5px solid var(--border-color)', 
            borderRadius: '28px',
            padding: '2rem',
            flex: 1
          }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={18} /> Transmission Logs
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.2, fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>No recent transmissions found</div>
              ) : (
                recentNotifs.map(n => (
                  <div key={n.id} style={{ 
                    padding: '1.25rem', 
                    background: 'var(--sidebar-bg)', 
                    borderRadius: '18px', 
                    border: '1px solid var(--border-color)',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{n.type}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{n.title}</div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
