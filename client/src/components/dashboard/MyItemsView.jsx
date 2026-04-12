import React, { useState, useEffect } from 'react';
import { Edit, Trash2, X, ChevronLeft, ChevronRight, Package, PlusCircle, ShoppingBag, Users, ShieldCheck, CheckCircle2, MessageCircle, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import EmptyState from './EmptyState';

export default function MyItemsView({ sidebarOpen, onEditItem, userData }) {
  const navigate = useNavigate();
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedItemEdit, setSelectedItemEdit] = useState(null);
  const [selectedItemBuyers, setSelectedItemBuyers] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [acceptingProposal, setAcceptingProposal] = useState(null);
  const [sellerUpi, setSellerUpi] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchMyItems = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch user profile for the "Seller Identity" part of the modal
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(userData);

      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          proposals (
            id, item_id, buyer_id, status, offered_price, rent_duration_months, pickup_time, message, meeting_preference, payment_preference,
            users ( full_name )
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyItems(data || []);
    } catch (err) {
      console.error("Error fetching my items:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (proposalId) => {
    if (!window.confirm("Verify that you have received the payment? This will finalize the sale.")) return;
    
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'Booked', completed_at: new Date().toISOString() })
        .eq('id', proposalId);

      if (error) throw error;

      // --- NEW: Trigger Notification for Buyer ---
      // We need to find the buyer_id from the items relationship or already have it
      const { data: prop } = await supabase.from('proposals').select('buyer_id, item_id, items(title)').eq('id', proposalId).single();
      if (prop) {
        await supabase.from('notifications').insert([{
          user_id: prop.buyer_id,
          title: 'Payment Verified! ✅',
          message: `The seller has verified your payment for **${prop.items.title}**. The deal is complete!`,
          type: 'system',
          link: '/dashboard/orders'
        }]);
      }

      alert("Payment verified! Item is now officially sold.");
      fetchMyItems();
    } catch (err) {
      alert("Error verifying payment: " + err.message);
    }
  };

  const confirmAcceptance = async () => {
    if (!acceptingProposal) return;
    
    // Validate UPI if needed
    if (acceptingProposal.payment_preference?.includes('UPI') && !sellerUpi.trim()) {
      alert("Please enter your UPI ID for the buyer to pay.");
      return;
    }

    try {
      // 1. Update proposal status to 'Accepted'
      const { error: propError } = await supabase
        .from('proposals')
        .update({ 
          status: 'Accepted', 
          seller_upi_id: sellerUpi || null
        })
        .eq('id', acceptingProposal.id);

      if (propError) throw propError;

      // 2. Update item status to 'Sold'
      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'Sold' })
        .eq('id', acceptingProposal.item_id);

      if (itemError) throw itemError;

      // --- NEW: Trigger Notification for Buyer ---
      await supabase.from('notifications').insert([{
        user_id: acceptingProposal.buyer_id,
        title: 'Proposal Accepted! 🛍️',
        message: `Your proposal for **${selectedItemBuyers.title}** has been accepted. Please proceed with the payment.`,
        type: 'proposal',
        link: '/dashboard/orders'
      }]);

      alert("Proposal accepted! Item is now marked as Sold.");
      setAcceptingProposal(null);
      setSelectedProposal(null);
      setSelectedItemBuyers(null);
      fetchMyItems();
    } catch (err) {
      alert("Error accepting proposal: " + err.message);
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

  useEffect(() => {
    fetchMyItems();
  }, []);

  const handleOpenModal = (item) => {
    setSelectedItemEdit(item);
    setCurrentImageIndex(0);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to remove this item permanently? All related proposals will also be deleted.')) {
      try {
        // 1. Delete associated proposals first (in case cascade isn't set)
        await supabase.from('proposals').delete().eq('item_id', id);
        
        // 2. Delete the item itself
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) throw error;

        setMyItems(myItems.filter(item => item.id !== id));
        setSelectedItemEdit(null);
        alert("Item removed successfully. 🗑️");
      } catch (err) {
        alert("Error deleting item: " + err.message);
      }
    }
  };

  const nextImage = () => {
    if (selectedItemEdit.photos && currentImageIndex < selectedItemEdit.photos.length - 1) {
      setCurrentImageIndex(i => i + 1);
    }
  };

  const prevImage = () => {
    if (selectedItemEdit.photos && currentImageIndex > 0) {
      setCurrentImageIndex(i => i - 1);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Manage Your Listings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Review proposals from buyers and update your active posted items.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading your dashboard data...</div>
      ) : myItems.length === 0 ? (
        <EmptyState 
          Icon={ShoppingBag}
          title="Your shop is empty!"
          message={userData && !userData.is_verified 
            ? "Your account is pending verification. You can browse the marketplace, but posting items is restricted until your identity is approved by an admin."
            : "You haven't listed any items for sale or rent yet. Start earning by posting your first item today."
          }
          actionText="Post Your First Item"
          onAction={() => {
            if (userData && !userData.is_verified) {
              alert('Verification Pending: Your account is awaiting admin verification. Posting items is restricted until approved.');
              return;
            }
            navigate('/dashboard/sell');
          }}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarOpen ? '280px' : '250px'}, 1fr))`, 
          gap: '1.5rem',
          transition: 'all 0.3s'
        }}>
          {myItems.map((item, index) => {
            const displayImage = item.photos && item.photos.length > 0 ? item.photos[0] : 'https://picsum.photos/400';
            const displayPrice = item.type === 'sell' ? item.sell_price : item.rent_amount;
            const proposalCount = item.proposals ? item.proposals.length : 0;

            return (
              <div 
                key={item.id} 
                className="premium-card animate-reveal"
                style={{ 
                  height: '420px', 
                  background: 'var(--card-bg)', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column',
                  animationDelay: `${index * 0.12}s`
                }}
              >
                <div 
                  style={{ height: '70%', overflow: 'hidden', position: 'relative', cursor: 'pointer', background: 'var(--sidebar-bg)', flexShrink: 0 }}
                  onClick={() => handleOpenModal(item)}
                >
                  <img src={displayImage} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900 }}>
                    {item.status.toUpperCase()}
                  </div>
                </div>
                
                <div style={{ height: '30%', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <h3 onClick={() => handleOpenModal(item)} style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h3>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem', marginBottom: '0.25rem' }}>₹{displayPrice}{item.type === 'rent' && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/mo</span>}</div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                    {item.proposals?.some(p => p.status === 'Accepted' || p.status === 'Pending Verification') ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleVerifyPayment(item.proposals.find(p => p.status === 'Accepted' || p.status === 'Pending Verification').id); }}
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', height: '36px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <ShieldCheck size={14} /> Verify Payment
                      </button>
                    ) : (
                      <button 
                        onClick={() => setSelectedItemBuyers(item)}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', height: '36px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <Users size={14} /> Buyers <span style={{ marginLeft: '4px', background: 'white', color: 'var(--primary)', padding: '1px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 900 }}>{proposalCount}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Detailed Modal (Matching BrowseView Style) */}
      {selectedItemEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '1000px', 
            height: '85vh', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            
            {/* Split View Left: Item Photos AND Core Info */}
            <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', position: 'relative' }}>
              
              {/* IMAGE CAROUSEL */}
              <div style={{ width: 'calc(100% - 2.5rem)', height: 'calc(55% - 1.5rem)', margin: '1rem 1.25rem 0.5rem 1.25rem', background: '#0F172A', position: 'relative', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                {selectedItemEdit.photos && selectedItemEdit.photos.length > 0 ? (
                  <>
                    <img src={selectedItemEdit.photos[currentImageIndex]} alt="Product view" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', fontWeight: 800, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {currentImageIndex + 1} / {selectedItemEdit.photos.length}
                    </div>
                    {/* Carousel Arrows */}
                    {selectedItemEdit.photos.length > 1 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', pointerEvents: 'none' }}>
                        <button onClick={prevImage} disabled={currentImageIndex === 0} style={{ pointerEvents: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentImageIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === 0 ? 0.3 : 1, boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }}>
                          <ChevronLeft size={24} />
                        </button>
                        <button onClick={nextImage} disabled={currentImageIndex === selectedItemEdit.photos.length - 1} style={{ pointerEvents: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentImageIndex === selectedItemEdit.photos.length - 1 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === selectedItemEdit.photos.length - 1 ? 0.3 : 1, boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }}>
                          <ChevronRight size={24} />
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
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{selectedItemEdit.type === 'sell' ? 'For Sale' : 'For Rent'}</span>
                  <span style={{ background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{selectedItemEdit.condition}</span>
                  <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{selectedItemEdit.category}</span>
                </div>
                
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.2rem', lineHeight: 1.2 }}>{selectedItemEdit.title}</h2>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  ₹{selectedItemEdit.type === 'sell' ? selectedItemEdit.sell_price : selectedItemEdit.rent_amount} {selectedItemEdit.type === 'rent' && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ {selectedItemEdit.rent_cycle}</span>}
                  {selectedItemEdit.type === 'sell' && <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', color: 'var(--text-tertiary)', fontWeight: 500, background: 'var(--sidebar-bg)', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>{selectedItemEdit.price_type}</span>}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4, fontSize: '0.85rem', margin: 0 }}>
                    {selectedItemEdit.description}
                  </p>
                </div>
              </div>

               {/* BUTTONS WRAPPER (10%) */}
              <div style={{ height: '10%', padding: '0 1.25rem 0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                <button 
                  disabled={selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked'}
                  onClick={() => {
                    setSelectedItemEdit(null);
                    onEditItem(selectedItemEdit);
                  }}
                  className="btn btn-outline" 
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    height: '36px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.4rem', 
                    fontWeight: 800, 
                    fontSize: '0.85rem',
                    opacity: (selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked') ? 0.5 : 1,
                    cursor: (selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked') ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Edit size={14} /> {(selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked') ? 'Sold (No Edit)' : 'Edit Listing'}
                </button>
                <button 
                  disabled={selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked'}
                  onClick={() => handleDelete(selectedItemEdit.id)} 
                  className="btn btn-primary" 
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    height: '36px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.4rem', 
                    background: '#DC2626', 
                    borderColor: '#DC2626', 
                    fontWeight: 800, 
                    fontSize: '0.85rem',
                    opacity: (selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked') ? 0.5 : 1,
                    cursor: (selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked') ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Trash2 size={14} /> {(selectedItemEdit.status === 'Sold' || selectedItemEdit.status === 'Booked') ? 'Sold' : 'Delete Item'}
                </button>
              </div>
            </div>

            {/* Split View Right: Expanded Details */}
            <div style={{ flex: '0 0 60%', padding: '1.25rem', overflow: 'hidden', background: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <button onClick={() => setSelectedItemEdit(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)' }}>
                <X size={20} />
              </button>

              {/* GENERAL & SELLING DETAILS */}
              <div style={{ background: 'var(--sidebar-bg)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '0.95rem' }}>General & {selectedItemEdit.type === 'sell' ? 'Selling' : 'Rental'} Details</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Availability Date:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedItemEdit.availability_date}</span></div>
                  
                  {selectedItemEdit.type === 'sell' && (
                    <>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Usage Duration:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedItemEdit.usage_duration}</span></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Reason for Selling:</span> <span style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedItemEdit.sell_reason}</span></div>
                      {selectedItemEdit.original_price && <div><span style={{ color: 'var(--text-secondary)' }}>Original Price:</span> <span style={{ fontWeight: 600, display: 'block' }}>₹{selectedItemEdit.original_price}</span></div>}
                      {selectedItemEdit.is_combo && <div style={{ gridColumn: '1/-1', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px dashed var(--success)', marginTop: '0.25rem' }}><span style={{ color: 'var(--success)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>🎁 Bundle Deal included:</span> <span style={{ color: 'var(--success)' }}>{selectedItemEdit.combo_description}</span></div>}
                    </>
                  )}
                  
                  {selectedItemEdit.type === 'rent' && (
                    <>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Max Period:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedItemEdit.max_period}</span></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Reason for Renting:</span> <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>{selectedItemEdit.rent_reason}</span></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Damage Policy:</span> <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>{selectedItemEdit.damage_policy}</span></div>
                      <div style={{ gridColumn: '1/-1', marginTop: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Return Policy:</span> 
                        <div style={{ maxHeight: '90px', overflowY: 'auto', paddingRight: '0.4rem', marginTop: '4px' }} className="custom-scrollbar">
                          <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', lineHeight: 1.4 }}>{selectedItemEdit.return_policy}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Proof of Purchase:</span> 
                    {selectedItemEdit.bill_photo ? <a href={selectedItemEdit.bill_photo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>View Bill linked &rarr;</a> : <span style={{ fontWeight: 600 }}>Not Provided</span>}
                  </div>
                </div>
              </div>

              {/* LOGISTICS & CONTACT DETAILS */}
              <div style={{ background: 'var(--sidebar-bg)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '0.95rem' }}>Logistics, Contact & Meetup Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><MapPin size={16} color="var(--primary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '-2px' }}>Pickup Location:</span> <span style={{ fontWeight: 600 }}>{selectedItemEdit.pickup_location || 'Campus details'}</span></div></div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><Calendar size={16} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '-2px' }}>Preferred Contact Time:</span> <span style={{ fontWeight: 600 }}>{selectedItemEdit.preferred_contact_time || 'Not specified'}</span></div></div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', gridColumn: '1/-1' }}><MapPin size={16} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '-2px' }}>Preferred Meetup Spot:</span> <span style={{ fontWeight: 600 }}>{selectedItemEdit.preferred_meetup_spot || 'Not specified'}</span></div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1/-1' }}><span style={{ color: 'var(--text-secondary)' }}>Phone Number Privacy:</span> <span style={{ fontWeight: 600, display: 'inline-block', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>{selectedItemEdit.show_phone ? 'Shared upon booking ✅' : 'In-App Chat Only 🔒'}</span></div>
                </div>
              </div>

              {/* SELLER IDENTITY (Owner) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--sidebar-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                  {currentUser?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                    {currentUser?.full_name || 'My Profile'} <CheckCircle2 size={14} color="var(--success)" />
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Listed on {new Date(selectedItemEdit.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Buyers Modal */}
      {selectedItemBuyers && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: 'var(--shadow-premium)' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Incoming Proposals</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Reviewing offers for: <strong style={{ color: 'var(--primary)' }}>{selectedItemBuyers.title}</strong></p>
              </div>
              <button onClick={() => setSelectedItemBuyers(null)} style={{ background: '#F1F5F9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedItemBuyers.proposals && selectedItemBuyers.proposals.map(prop => {
                  const buyerName = prop.users?.full_name || 'Anonymous User';
                  return (
                    <div key={prop.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--sidebar-bg)', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
                          {buyerName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <h4 style={{ fontWeight: 700, margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{buyerName}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={10} /> {prop.meeting_preference || 'Campus'}
                          </span>
                        </div>
                      </div>

                      <div style={{ flex: '0 0 160px' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{selectedItemBuyers.type === 'sell' ? 'Proposed Amount' : 'Duration'}</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem' }}>
                          {selectedItemBuyers.type === 'sell' ? `₹${prop.offered_price}` : `${prop.rent_duration_months} Months`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setSelectedProposal(prop)} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          View Details
                        </button>
                        {prop.status === 'Accepted' || prop.status === 'Pending Verification' ? (
                          <button onClick={() => handleVerifyPayment(prop.id)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, background: '#F59E0B', borderColor: '#F59E0B' }}>
                            Verify Payment
                          </button>
                        ) : prop.status === 'Booked' ? (
                          <span style={{ padding: '0.5rem 1rem', background: '#F0FDF4', color: '#166534', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                            Finally Sold
                          </span>
                        ) : (
                          <button onClick={() => setAcceptingProposal(prop)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            Accept
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {(!selectedItemBuyers.proposals || selectedItemBuyers.proposals.length === 0) && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No proposals received yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Detail Modal */}
      {selectedProposal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: 'var(--shadow-xl)', position: 'relative' }}>
            <button onClick={() => setSelectedProposal(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#F8FAFC', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', margin: '0 auto 0.75rem auto' }}>
                {(selectedProposal.users?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{selectedProposal.users?.full_name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Proposal Details</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#F8FAFC', borderRadius: '12px' }}>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Offered</span><span style={{ fontWeight: 700 }}>₹{selectedProposal.offered_price || selectedProposal.rent_duration_months + ' mo'}</span></div>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Pickup</span><span style={{ fontWeight: 700 }}>{selectedProposal.pickup_time || 'TBD'}</span></div>
              <div style={{ gridColumn: '1/-1' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Meeting Preference</span><span style={{ fontWeight: 700 }}>{selectedProposal.meeting_preference}</span></div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Message</span>
              <div style={{ padding: '1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                "{selectedProposal.message || 'I am interested in this item.'}"
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => handleChat(selectedProposal.buyer_id)} className="btn btn-outline" style={{ flex: 1, padding: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <MessageCircle size={20} /> Chat
              </button>
              {!(selectedProposal.status === 'Accepted' || selectedProposal.status === 'Pending Verification' || selectedProposal.status === 'Booked') && (
                <button onClick={() => setAcceptingProposal(selectedProposal)} className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontWeight: 800 }}>Accept Proposal</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      {acceptingProposal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '2rem', boxShadow: 'var(--shadow-xl)', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: '#F0FDF4', color: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Acceptance</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              You are accepting the offer of <strong>₹{acceptingProposal.offered_price}</strong> via <strong>{acceptingProposal.payment_preference?.includes('UPI') ? 'UPI' : 'Cash'}</strong>.
            </p>

            {acceptingProposal.payment_preference?.includes('UPI') ? (
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Your UPI ID (GPay/PhonePe/Paytm)</label>
                <input 
                  type="text" 
                  placeholder="e.g. name@okaxis" 
                  value={sellerUpi}
                  onChange={(e) => setSellerUpi(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>This ID will be used to generate a secure payment QR for the buyer.</p>
              </div>
            ) : (
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px dashed var(--border-color)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>For cash payments, please coordinate the pickup and final exchange via chat.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setAcceptingProposal(null)} className="btn btn-outline" style={{ flex: 1, padding: '0.85rem', fontWeight: 700 }}>Cancel</button>
              <button onClick={confirmAcceptance} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', fontWeight: 800 }}>Accept & Sell</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
