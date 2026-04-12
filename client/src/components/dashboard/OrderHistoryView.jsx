import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle2, XCircle, MapPin, Calendar, ChevronLeft, ChevronRight, X, MessageCircle, ShieldCheck, ShoppingCart, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import EmptyState from './EmptyState';

export default function OrderHistoryView({ sidebarOpen }) {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [wantedRequests, setWantedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: propData, error: propError } = await supabase
        .from('proposals')
        .select(`
          *,
          users:buyer_id ( full_name ),
          items (
            *,
            users:seller_id ( full_name, profile_pic_url )
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (propError) throw propError;
      setProposals(propData || []);

      // Also fetch fulfilled wanted requests
      const { data: wantedData, error: wantedError } = await supabase
        .from('wanted_items')
        .select(`
          *,
          users ( full_name, profile_pic_url )
        `)
        .eq('user_id', user.id)
        .eq('status', 'Fulfilled')
        .order('created_at', { ascending: false });

      if (wantedError) {
        console.warn("Wanted items table failure in history, using empty list.");
      } else {
        setWantedRequests(wantedData || []);
      }
    } catch (err) {
      console.error("Error fetching order history:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (participantId) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      if (!user?.id || !participantId) return;
      if (user.id === participantId) return;

      const [u1, u2] = user.id < participantId ? [user.id, participantId] : [participantId, user.id];

      let { data: conv, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user1_id', u1)
        .eq('user2_id', u2)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!conv) {
        const { data: newConv, error: insertError } = await supabase
          .from('conversations')
          .insert([{ user1_id: u1, user2_id: u2, updated_at: new Date().toISOString() }])
          .select('id')
          .single();
        
        if (insertError) throw insertError;
        conv = newConv;
      }

      if (conv) {
        navigate('/dashboard/chat', { state: { conversationId: conv.id } });
      }
    } catch (err) {
      console.error("Chat Error:", err.message);
      if (err.message.includes("404")) {
        alert("Database Error: Table 'conversations' not found. Ensure you ran the SQL query in Supabase.");
      }
    }
  };

  const handleFinalBook = async (order) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'Pending Verification' })
        .eq('id', order.id);
      
      if (error) throw error;
      alert("Payment notification sent to seller! Once they verify, your item will be 'Finally Sold'.");
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert("Error booking item: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOrder = async (order) => {
    if (!window.confirm("Are you sure you want to reject this offer? The item will be returned to the marketplace.")) return;
    
    setIsProcessing(true);
    try {
      // 1. Set item back to 'Available'
      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'Available' })
        .eq('id', order.item_id);
      
      if (itemError) throw itemError;

      // 2. Delete the proposal
      const { error: propError } = await supabase
        .from('proposals')
        .delete()
        .eq('id', order.id);
      
      if (propError) throw propError;

      alert("Order rejected and removed. Item is now available again.");
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      alert("Error rejecting order: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    setCurrentImageIndex(0);
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'booked':
      case 'finally sold':
      case 'paid':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)', icon: <ShieldCheck size={14} /> };
      case 'pending verification':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)', icon: <Clock size={14} /> };
      case 'accepted':
        return { bg: 'var(--primary)', text: 'white', icon: <CheckCircle2 size={14} /> };
      case 'rejected':
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)', icon: <XCircle size={14} /> };
      default:
        return { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)', icon: <Clock size={14} /> };
    }
  };

  const nextImage = () => {
    if (selectedOrder.items.photos && currentImageIndex < selectedOrder.items.photos.length - 1) {
      setCurrentImageIndex(i => i + 1);
    }
  };

  const prevImage = () => {
    if (selectedOrder.items.photos && currentImageIndex > 0) {
      setCurrentImageIndex(i => i - 1);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Order & Proposal History</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Track your sent offers and their current status from sellers.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading your proposal history...</div>
      ) : proposals.length === 0 ? (
        <EmptyState 
          Icon={ShoppingCart}
          title="No purchase history yet"
          message="You haven't bought or rented any items yet. Explore the campus marketplace to find great deals!"
          actionText="Explore Marketplace"
          onAction={() => navigate('/dashboard')}
        />
      ) : (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarOpen ? '320px' : '300px'}, 1fr))`, 
            gap: '1.5rem',
            transition: 'all 0.3s'
          }}>
            {proposals.map((prop, index) => {
              const item = prop.items;
              if (!item) return null;
              
              const displayTitle = item.title;
              const displayPrice = prop.offered_price || item.sell_price || item.rent_amount;
              const displayImage = item.photos && item.photos.length > 0 ? item.photos[0] : 'https://picsum.photos/400';
              const status = prop.status;
              const statusInfo = getStatusStyle(status);
              
              return (
                <div 
                  key={prop.id} 
                  onClick={() => handleOpenModal(prop)}
                  className="premium-card animate-reveal"
                  style={{ 
                    height: '420px', 
                    background: 'var(--card-bg)', 
                    borderRadius: 'var(--radius-lg)', 
                    overflow: 'hidden', 
                    boxShadow: 'var(--shadow-sm)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column',
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div style={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative', background: 'rgba(0,0,0,0.02)', flexShrink: 0 }}>
                    <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: statusInfo.bg, color: statusInfo.text, padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: 'var(--shadow-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {statusInfo.icon} {status?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>
                  
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    <h3 style={{ 
                      fontSize: '1.05rem', 
                      fontWeight: 700, 
                      margin: 0, 
                      lineHeight: 1.3, 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden',
                      height: '2.7em',
                      color: 'var(--text-primary)'
                    }}>
                      {displayTitle}
                    </h3>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      {String(displayPrice).startsWith('₹') ? displayPrice : `₹${displayPrice}`}
                      {item?.type === 'rent' && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/mo</span>}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                          {(item.users?.full_name?.charAt(0) || 'S')}
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Seller</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{(item.users?.full_name || 'Anonymous')}</span>
                        </div>
                      </div>
                      <button onClick={() => handleOpenModal(prop)} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 700 }}>
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FULFILLED WANTED REQUESTS SECTION */}
          {wantedRequests.length > 0 && (
            <div style={{ marginTop: '4rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Fulfilled Campus Requests 📝</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Student requests you've successfully fulfilled or found what you needed for.</p>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarOpen ? '320px' : '300px'}, 1fr))`, 
                gap: '1.5rem' 
              }}>
                {wantedRequests.map((req, idx) => (
                  <div 
                    key={req.id} 
                    className="glass-morphism animate-reveal" 
                    style={{ 
                      padding: '1.5rem', 
                      borderRadius: '20px', 
                      background: 'var(--card-bg)', 
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      animationDelay: `${idx * 0.1}s`,
                      position: 'relative',
                      opacity: 0.9
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>{req.category}</span>
                      <span style={{ fontSize: '0.7rem', background: '#10B981', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> FULFILLED
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{req.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {req.description}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block' }}>Target Budget:</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>{req.budget_range || 'Contacted'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <Clock size={14} color="var(--text-tertiary)" />
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Completed on {new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                        <ClipboardList size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detailed Order Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div 
            className="glass-morphism"
            style={{ 
              borderRadius: 'var(--radius-xl)', 
              width: '100%', 
              maxWidth: '1000px', 
              height: '85vh', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              boxShadow: 'var(--shadow-premium)',
              animation: 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all var(--transition-smooth)'
            }}
          >
            
            {/* Split View Left: Item Photos AND Core Info */}
            <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', position: 'relative' }}>
              
              {/* IMAGE CAROUSEL */}
              <div style={{ width: 'calc(100% - 2.5rem)', height: 'calc(55% - 1.5rem)', margin: '1rem 1.25rem 0.5rem 1.25rem', background: '#0F172A', position: 'relative', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                {selectedOrder.items.photos && selectedOrder.items.photos.length > 0 ? (
                  <>
                    <img src={selectedOrder.items.photos[currentImageIndex]} alt="Product view" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>
                      {currentImageIndex + 1} / {selectedOrder.items.photos.length}
                    </div>
                    {/* Carousel Arrows */}
                    {selectedOrder.items.photos.length > 1 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', pointerEvents: 'none' }}>
                        <button onClick={prevImage} disabled={currentImageIndex === 0} style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentImageIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === 0 ? 0.3 : 1, boxShadow: 'var(--shadow-md)' }}>
                          <ChevronLeft size={20} color="white" />
                        </button>
                        <button onClick={nextImage} disabled={currentImageIndex === selectedOrder.items.photos.length - 1} style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentImageIndex === selectedOrder.items.photos.length - 1 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === selectedOrder.items.photos.length - 1 ? 0.3 : 1, boxShadow: 'var(--shadow-md)' }}>
                          <ChevronRight size={20} color="white" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '1.2rem', fontWeight: 600 }}>No Images Provided</div>
                )}
              </div>

               {/* DETAILS WRAPPER (35%) */}
              <div style={{ height: '35%', padding: '0.75rem 1.25rem 0 1.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    background: getStatusStyle(selectedOrder.status).bg, 
                    color: getStatusStyle(selectedOrder.status).text, 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {selectedOrder.status?.toUpperCase() || 'PENDING'}
                  </span>
                  <span style={{ background: 'var(--primary-light)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{selectedOrder.items.category}</span>
                </div>
                
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.2rem', lineHeight: 1.2 }}>{selectedOrder.items.title}</h2>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  ₹{selectedOrder.items.type === 'sell' ? selectedOrder.items.sell_price : selectedOrder.items.rent_amount} 
                  {selectedOrder.items.type === 'rent' && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ {selectedOrder.items.rent_cycle}</span>}
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.3, fontSize: '0.85rem', margin: 0 }}>
                    {selectedOrder.items.description}
                  </p>
                </div>
              </div>

               {/* BUTTONS WRAPPER (10%) */}
              <div style={{ height: '10%', padding: '0 1.25rem 0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                <button 
                  onClick={() => handleChat(selectedOrder.items.seller_id)}
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <MessageCircle size={16} /> Chat
                </button>

                {selectedOrder.status === 'Accepted' && (
                  <>
                    <button 
                      onClick={() => handleRejectOrder(selectedOrder)}
                      className="btn btn-outline" 
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '36px', color: '#EF4444', borderColor: '#EF4444' }}
                    >
                      Reject
                    </button>
                    {selectedOrder.payment_preference.includes('UPI') ? (
                      <button 
                        onClick={() => setShowScanner(true)}
                        className="btn btn-primary" 
                        style={{ flex: 2, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '40px' }}
                      >
                        Pay Now (UPI)
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleFinalBook(selectedOrder)}
                        className="btn btn-primary" 
                        style={{ flex: 2, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '40px' }}
                      >
                        Final Book (Cash)
                      </button>
                    )}
                  </>
                )}

                {selectedOrder.status === 'Pending Verification' && (
                  <div style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 700, height: '40px', background: 'var(--sidebar-bg)', color: 'var(--warning)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <Clock size={16} /> Waiting for Seller Verification
                  </div>
                )}

                {selectedOrder.status === 'Booked' && (
                  <button 
                    onClick={() => setShowInvoice(true)}
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '40px', background: '#059669', borderColor: '#059669' }}
                  >
                    View Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Split View Right: Proposal Details */}
            <div style={{ flex: '0 0 60%', padding: '1.25rem', overflowY: 'auto', background: 'var(--card-bg)', position: 'relative' }}>
              <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
                <X size={20} />
              </button>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary)' }}>Your Proposal Details</h3>

              {/* YOUR OFFER CARD */}
              <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '1rem' }}>Sent Offer</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>{selectedOrder.items.type === 'sell' ? 'Your Price:' : 'Required Duration:'}</span> <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedOrder.items.type === 'sell' ? `₹${selectedOrder.offered_price}` : `${selectedOrder.rent_duration_months} Months`}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>Payment:</span> <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.payment_preference}</span></div>
                </div>
              </div>

              {/* LOGISTICS & MESSAGE */}
              <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                 <h4 style={{ fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '1rem' }}>Meeting & Message</h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}><MapPin size={18} color="var(--primary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>Your Meeting Pref.</span> <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.meeting_preference}</span></div></div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}><Calendar size={18} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>Your Pickup Time</span> <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.pickup_time || 'TBD'}</span></div></div>
                 </div>
                  <div style={{ padding: '0.75rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Your Message to Seller:</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{selectedOrder.message || 'No additional message.'}"</p>
                  </div>
              </div>

              {/* ITEM SPECIFICS (From MyItemsView) */}
              <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '1rem' }}>Item Specifics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Availability Date:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedOrder.items.availability_date}</span></div>
                  
                  {selectedOrder.items.type === 'sell' && (
                    <>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Usage Duration:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedOrder.items.usage_duration}</span></div>
                      <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-secondary)' }}>Reason for Selling:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedOrder.items.sell_reason}</span></div>
                      {selectedOrder.items.original_price && <div><span style={{ color: 'var(--text-secondary)' }}>Original Price:</span> <span style={{ fontWeight: 600, display: 'block' }}>₹{selectedOrder.items.original_price}</span></div>}
                      {selectedOrder.items.is_combo && <div style={{ gridColumn: '1/-1', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px dashed var(--success)', marginTop: '0.25rem' }}><span style={{ color: 'var(--success)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>🎁 Bundle Deal included:</span> <span style={{ color: 'var(--success)' }}>{selectedOrder.items.combo_description}</span></div>}
                    </>
                  )}
                  
                  {selectedOrder.items.type === 'rent' && (
                    <>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Max Period:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedOrder.items.max_period}</span></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Reason for Renting:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedOrder.items.rent_reason}</span></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Damage Policy:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedOrder.items.damage_policy}</span></div>
                      <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-secondary)' }}>Return Policy:</span> <p style={{ fontWeight: 600, fontSize: '0.8rem', margin: '4px 0 0 0' }}>{selectedOrder.items.return_policy}</p></div>
                    </>
                  )}
                </div>
              </div>

              {/* SELLER'S LOGISTICS */}
              <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '1rem' }}>Seller's Contact & Meetup Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><MapPin size={16} color="var(--primary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>Pickup Location:</span> <span style={{ fontWeight: 600 }}>{selectedOrder.items.pickup_location || 'Campus'}</span></div></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Calendar size={16} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>Contact Time:</span> <span style={{ fontWeight: 600 }}>{selectedOrder.items.preferred_contact_time || 'Not specified'}</span></div></div>
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.5rem' }}><MapPin size={16} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block' }}>Preferred Meetup Spot:</span> <span style={{ fontWeight: 600 }}>{selectedOrder.items.preferred_meetup_spot || 'Not specified'}</span></div></div>
                </div>
              </div>

              {/* SELLER IDENTITY */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--sidebar-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                  {(selectedOrder.items.users?.full_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0, color: 'var(--text-primary)' }}>
                    Seller: {selectedOrder.items.users?.full_name || 'Verified Seller'} <CheckCircle2 size={16} color="var(--success)" />
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>QuadSwap Student Marketplace Partner</p>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
                </div>
              </div>

               <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', alignItems: 'center', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--success)' }}>
                <ShieldCheck size={20} />
                <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 700 }}>This transaction is covered by QuadSwap Community Safety Guidelines.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPI Scanner Modal */}
      {showScanner && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowScanner(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={24} /></button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Scan to Pay</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Final Amount: <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>₹{selectedOrder.offered_price}</strong></p>
            
            <div style={{ width: '240px', height: '240px', margin: '0 auto 1.5rem auto', background: 'white', borderRadius: '16px', border: '8px solid white', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', background: `url('https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=${selectedOrder.seller_upi_id}%26pn=QuadSwap%26am=${selectedOrder.offered_price}%26cu=INR') no-repeat center center`, backgroundSize: 'contain' }}></div>
              <div style={{ position: 'absolute', inset: '0', border: '2px dashed var(--primary)', borderRadius: '12px', opacity: 0.3 }}></div>
            </div>

            <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>RECIPIENT UPI ID</span>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedOrder.seller_upi_id}</p>
            </div>

            <button 
              onClick={() => { setShowScanner(false); handleFinalBook(selectedOrder); }} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 800, fontSize: '1.1rem' }}
            >
              I Have Paid
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '1rem' }}>Please complete the payment in your UPI app and then click the button above.</p>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div id="invoice-content" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', width: '100%', maxWidth: '600px', padding: '3rem', boxShadow: 'var(--shadow-xl)', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
             <button onClick={() => setShowInvoice(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', className: 'no-print' }}><X size={24} /></button>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
                <div>
                   <h2 style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '2rem', margin: 0 }}>QUADSWAP</h2>
                   <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Student-to-Student Marketplace</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <h3 style={{ margin: 0, fontWeight: 800 }}>INVOICE</h3>
                   <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>#QS-{selectedOrder.id.substring(0,8).toUpperCase()}</p>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                   <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Billed To</h4>
                   <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedOrder.users?.full_name || 'Verified Buyer'}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                   <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sold By</h4>
                   <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedOrder.items.users?.full_name || 'Verified Seller'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Date</h4>
                   <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(selectedOrder.completed_at || Date.now()).toLocaleDateString()}</p>
                </div>
             </div>

             <div style={{ background: 'var(--sidebar-bg)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                   <span style={{ fontWeight: 700 }}>Item Description</span>
                   <span style={{ fontWeight: 700 }}>Total</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedOrder.items.title}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Condition: {selectedOrder.items.condition}</p>
                   </div>
                   <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>₹{selectedOrder.offered_price}</div>
                </div>
             </div>

             <div style={{ textAlign: 'right', marginBottom: '3rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Payment Method: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedOrder.payment_preference.split(' ')[0]}</span></p>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                   Total Paid: ₹{selectedOrder.offered_price}
                </div>
             </div>

             <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>This is a computer-generated receipt. No signature required.</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--success)' }}>✔ Booked on QuadSwap Marketplace</p>
             </div>

             <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }} className="no-print">
                <button onClick={() => window.print()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                   Print PDF
                </button>
                <button onClick={() => setShowInvoice(false)} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                   Done
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
