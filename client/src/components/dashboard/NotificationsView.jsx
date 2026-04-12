import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, CheckCircle2, Info, ArrowRight, ShoppingBag, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function NotificationsView() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Proposals Sent TO the user (as a Seller)
      const { data: sellerProps, error: err1 } = await supabase
        .from('proposals')
        .select(`
          id, created_at, status, item_id, buyer_id, offered_price,
          items ( title, seller_id ),
          users:buyer_id ( full_name )
        `)
        .eq('items.seller_id', user.id)
        .order('created_at', { ascending: false });

      // 2. Fetch Proposals Sent BY the user (as a Buyer)
      const { data: buyerProps, error: err2 } = await supabase
        .from('proposals')
        .select(`
          id, created_at, status, item_id,
          items ( title, seller_id )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      // 3. Fetch Unread Messages
      const { data: unreadMsgs, error: err3 } = await supabase
        .from('messages')
        .select(`
          id, created_at, content, sender_id,
          users:sender_id ( full_name )
        `)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      // 4. Fetch persistent system notifications
      const { data: dbNotifs, error: err4 } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (err1 || err2 || err3 || err4) console.error("Error fetching notifications parts:", { err1, err2, err3, err4 });

      // Transform into a unified notification format
      const unified = [];

      // Persistent DB Notifications (Phase 26)
      if (dbNotifs) {
        dbNotifs.forEach(n => {
          unified.push({
            id: `db-${n.id}`,
            timestamp: new Date(n.created_at),
            type: n.type.toUpperCase(),
            title: n.title,
            message: n.message,
            icon: n.type === 'proposal' ? <ShoppingBag size={20} color="var(--primary)" /> : <Info size={20} color="var(--text-tertiary)" />,
            action: () => navigate(n.link || '/dashboard'),
            actionLabel: 'View',
            isRead: n.is_read
          });
        });
      }

      // Seller Notifications: New Proposals
      if (sellerProps) {
        sellerProps.filter(p => p.items).forEach(p => {
          unified.push({
            id: `prop-seller-${p.id}`,
            timestamp: new Date(p.created_at),
            type: 'PROPOSAL_RECEIVED',
            title: 'New Proposal Received',
            message: `Buyer **${p.users?.full_name || 'Someone'}** sent a proposal for **${p.items.title}**`,
            icon: <ShoppingBag size={20} color="var(--primary)" />,
            action: () => navigate('/dashboard/my-items'),
            actionLabel: 'View Listing',
            isRead: false // Proposals don't have is_read yet, but we'll assume unhandled = unread
          });
        });
      }

      // Buyer Notifications: Status Changes
      if (buyerProps) {
        buyerProps.filter(p => p.items && p.status !== 'Pending').forEach(p => {
          const isAccepted = p.status === 'Accepted' || p.status === 'Booked';
          unified.push({
            id: `prop-buyer-${p.id}-${p.status}`,
            timestamp: new Date(p.created_at), // Ideally we'd have a status_updated_at
            type: 'PROPOSAL_UPDATE',
            title: isAccepted ? 'Proposal Accepted!' : 'Proposal Update',
            message: `Your proposal for **${p.items.title}** was marked as **${p.status}**`,
            icon: isAccepted ? <CheckCircle2 size={20} color="var(--success)" /> : <Info size={20} color="var(--text-tertiary)" />,
            action: () => navigate('/dashboard/orders'),
            actionLabel: 'View Orders',
            isRead: false
          });
        });
      }

      // Message Notifications
      if (unreadMsgs) {
        unreadMsgs.forEach(m => {
          unified.push({
            id: `msg-${m.id}`,
            timestamp: new Date(m.created_at),
            type: 'MESSAGE',
            title: 'New Message',
            message: `**${m.users?.full_name || 'User'}** sent you a message: "${m.content.substring(0, 40)}${m.content.length > 40 ? '...' : ''}"`,
            icon: <MessageSquare size={20} color="var(--primary)" />,
            action: () => navigate('/dashboard/chat'),
            actionLabel: 'Reply',
            isRead: false
          });
        });
      }

      // Sort by newest first
      unified.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(unified);

    } catch (err) {
      console.error("Error building notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Notifications</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Stay updated with your latest campus activity.</p>
        </div>
        <button 
          onClick={fetchNotifications}
          style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Clock size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="shimmer" style={{ height: '60px', borderRadius: '12px', marginBottom: '1rem' }}></div>
          <div className="shimmer" style={{ height: '60px', borderRadius: '12px', marginBottom: '1rem' }}></div>
          <div className="shimmer" style={{ height: '60px', borderRadius: '12px' }}></div>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Bell size={48} color="var(--text-tertiary)" style={{ opacity: 0.3 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>All caught up! No new notifications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={notif.action}
              className="notification-strip"
              style={{ 
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.borderColor = 'var(--primary-light)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                background: 'var(--sidebar-bg)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {notif.icon}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{notif.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {notif.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <p 
                  style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{ __html: notif.message.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>') }}
                ></p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{notif.actionLabel}</span>
                <ArrowRight size={14} color="var(--primary)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
