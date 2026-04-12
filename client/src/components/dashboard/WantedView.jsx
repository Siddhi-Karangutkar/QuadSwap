import React, { useState, useEffect } from 'react';
import { ClipboardList, PlusCircle, Search, MapPin, MessageSquare, Clock, X, CheckCircle2, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import EmptyState from './EmptyState';

export default function WantedView({ sidebarOpen, userData }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      fetchRequests();
    };
    init();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wanted_items')
        .select(`
          *,
          users ( full_name, profile_pic_url )
        `)
        .eq('status', 'Active') // Only show active requests
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, we'll use mock data for demo
        console.warn("Wanted items table not found, using mock data for demo.");
        setRequests([
          {
            id: 'mock1',
            title: 'Engineering Graphics Drafter (A1)',
            description: 'Looking for a drafter in good condition for the upcoming semester. ASAP!',
            category: 'Study Gear',
            budget_range: '₹500 - ₹800',
            status: 'Active',
            created_at: new Date().toISOString(),
            users: { full_name: 'Aditya Kumar' }
          },
          {
            id: 'mock2',
            title: 'Mini Fridge for Hostel Room',
            description: 'Need a small fridge. Must be working and clean.',
            category: 'Electronics',
            budget_range: '₹3000 - ₹5000',
            status: 'Active',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            users: { full_name: 'Neha Singh' }
          }
        ]);
      } else {
        setRequests(data || []);
      }
    } catch (err) {
      console.error("Error fetching requests:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostRequest = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please log in to post a request.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wanted_items')
        .insert([{
          user_id: currentUser.id,
          title,
          description,
          category,
          budget_range: budget
        }]);

      if (error) throw error;
      
      alert("Your request has been posted to the Campus Board!");
      setShowPostModal(false);
      setTitle('');
      setDescription('');
      setBudget('');
      fetchRequests();
    } catch (err) {
      alert("Error posting request: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfillRequest = async (requestId) => {
    if (!requestId) return;
    if (!window.confirm("Found what you needed? This will move your request to your Order History and remove it from the board.")) return;
    
    try {
      const { error } = await supabase
        .from('wanted_items')
        .update({ status: 'Fulfilled' })
        .eq('id', requestId);

      if (error) throw error;
      
      alert("Great! Your request is now marked as fulfilled.");
      fetchRequests();
    } catch (err) {
      alert("Error updating request: " + err.message);
    }
  };

  const handleContact = async (partnerId) => {
    if (!currentUser) {
      alert("Please log in to contact the requester.");
      return;
    }
    try {
      const u1 = currentUser.id;
      const u2 = partnerId;
      
      let { data: conv, error } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${u1},user2_id.eq.${u2}),and(user1_id.eq.${u2},user2_id.eq.${u1})`)
        .maybeSingle();

      if (!conv) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert([{ user1_id: u1, user2_id: u2, updated_at: new Date().toISOString() }])
          .select('id')
          .single();
        conv = newConv;
      }

      if (conv) {
        navigate('/dashboard/chat', { state: { conversationId: conv.id } });
      }
    } catch (err) {
      console.error("Chat Error:", err.message);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Community Wanted Board 📝</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Can't find what you need? Post a request and let the campus help you.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => {
              if (userData && !userData.is_verified) {
                alert('Verification Pending: Your account is awaiting admin verification. You can browse the marketplace, but posting requests is restricted until your identity is verified.');
                return;
              }
              setShowPostModal(true);
            }}
            className="btn btn-primary btn-glow" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem', borderRadius: '12px', opacity: userData && !userData.is_verified ? 0.6 : 1 }}
          >
            <PlusCircle size={20} /> Post Wanted Request
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading campus requests...</div>
      ) : requests.length === 0 ? (
        <EmptyState 
          Icon={ClipboardList}
          title="The board is currently clear!"
          message={userData && !userData.is_verified
            ? "Your account is pending verification. You can browse requests but posting new ones is restricted until your identity is approved."
            : "No one has posted a 'Wanted' request yet. Be the first to tell the campus what you're looking for."
          }
          actionText="Post Your First Request"
          onAction={() => {
            if (userData && !userData.is_verified) {
              alert('Verification Pending: Your account is awaiting admin verification. Posting requests is restricted until approved.');
              return;
            }
            setShowPostModal(true);
          }}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarOpen ? '320px' : '300px'}, 1fr))`, 
          gap: '1.5rem' 
        }}>
          {requests.map((req, idx) => (
            <div 
              key={req.id || idx} 
              className="glass-morphism animate-reveal" 
              style={{ 
                padding: '1.5rem', 
                borderRadius: '20px', 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                animationDelay: `${idx * 0.1}s`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>{req.category}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <Clock size={12} /> {new Date(req.created_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{req.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {req.description}
                </p>
              </div>

              <div style={{ background: 'var(--sidebar-bg)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Target Budget:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>{req.budget_range || 'Contact for Negotiating'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                    {req.users?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{req.users?.full_name || 'Anonymous Student'}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {currentUser?.id === req.user_id && (
                    <button 
                      onClick={() => handleFulfillRequest(req.id)}
                      className="btn btn-primary" 
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '8px', fontWeight: 800, background: 'var(--success)', border: 'none' }}
                    >
                      <CheckCircle2 size={14} /> Got This
                    </button>
                  )}
                  {currentUser?.id !== req.user_id && (
                    <button 
                      onClick={() => handleContact(req.user_id)}
                      className="btn btn-outline" 
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <MessageSquare size={14} /> I have this!
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POST REQUEST MODAL */}
      {showPostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-morphism animate-reveal" style={{ background: 'var(--bg-color)', width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Post Wanted Request 📢</h3>
              <button onClick={() => setShowPostModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handlePostRequest} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>What are you looking for? *</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scientific Calculator Casio fx-991EX" style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <option>Electronics</option>
                    <option>Books/Study Gear</option>
                    <option>Furniture</option>
                    <option>Appliances</option>
                    <option>Others</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Budget Range</label>
                  <input type="text" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. ₹500 - ₹1000" style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Additional Details (Optional)</label>
                <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Condition preferred, how urgently you need it, etc..." style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary btn-glow" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {submitting ? 'Posting...' : 'Post to Campus Board'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
