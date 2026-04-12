import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle2, MessageCircle, ShoppingBag, Calendar, ShieldCheck, X, ChevronLeft, ChevronRight, Package, ShoppingCart, ShieldAlert, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import EmptyState from './EmptyState';

export default function BrowseView({ type, sidebarOpen }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  
  // Smart Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [maxRadius, setMaxRadius] = useState(10);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      setLoadingDb(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: userData } = await supabase.from('users').select('is_verified').eq('id', user.id).maybeSingle();
          setIsVerified(userData?.is_verified || false);
        }

        const dbType = type === 'buy' ? 'sell' : 'rent';

        let query = supabase
          .from('items')
          .select(`
            *,
            users ( full_name, profile_pic_url, is_verified )
          `)
          .eq('type', dbType)
          .eq('status', 'Available')
          .order('created_at', { ascending: false });

        if (user) {
          query = query.neq('seller_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Smart Campus Proximity Decoration
        const itemsWithDistance = (data || []).map(item => {
          let baseDist = 5.0; // Default
          const loc = (item.pickup_location || '').toLowerCase();
          
          if (loc.includes('dmce') || loc.includes('campus') || loc.includes('canteen')) baseDist = 0.2;
          else if (loc.includes('gate') || loc.includes('pg')) baseDist = 0.8;
          else if (loc.includes('sector')) baseDist = 2.5;
          
          return {
            ...item,
            dist: parseFloat((baseDist + Math.random() * 0.5).toFixed(1))
          };
        });
        setItems(itemsWithDistance);
      } catch (err) {
        console.error("Error fetching items:", err.message);
      } finally {
        setLoadingDb(false);
      }
    };

    const fetchWishlist = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('wishlist').select('item_id').eq('user_id', user.id);
        setWishlist((data || []).map(w => w.item_id));
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      }
    };

    fetchItems();
    fetchWishlist();
  }, [type]);

  const toggleWishlist = async (e, itemId) => {
    if (e) e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login to add items to your wishlist.");
        return;
      }

      if (wishlist.includes(itemId)) {
        const { error } = await supabase.from('wishlist').delete().eq('user_id', user.id).eq('item_id', itemId);
        if (error) throw error;
        setWishlist(prev => prev.filter(id => id !== itemId));
      } else {
        const { error } = await supabase.from('wishlist').insert([{ user_id: user.id, item_id: itemId }]);
        if (error) throw error;
        setWishlist(prev => [...prev, itemId]);
      }
    } catch (err) {
      console.error("Wishlist error:", err.message);
    }
  };

  const [selectedItem, setSelectedItem] = useState(null);
  const [showProposal, setShowProposal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Proposal Form State
  const [proposedPrice, setProposedPrice] = useState('');
  const [rentDuration, setRentDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('UPI (GPay, PhonePe, Paytm)');
  const [pickupTime, setPickupTime] = useState('');
  const [meetingPref, setMeetingPref] = useState('College Canteen');
  const [message, setMessage] = useState('');
  const [shareContact, setShareContact] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Filter Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = selectedConditions.length === 0 || selectedConditions.includes(item.condition);
    const matchesRadius = item.dist <= maxRadius;
    return matchesSearch && matchesCondition && matchesRadius;
  }).sort((a, b) => {
    if (sortBy === 'price-low') {
      const priceA = type === 'buy' ? a.sell_price : a.rent_amount;
      const priceB = type === 'buy' ? b.sell_price : b.rent_amount;
      return priceA - priceB;
    }
    if (sortBy === 'price-high') {
      const priceA = type === 'buy' ? a.sell_price : a.rent_amount;
      const priceB = type === 'buy' ? b.sell_price : b.rent_amount;
      return priceB - priceA;
    }
    // Newest first (default)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const conditions = ['Brand New', 'Like New', 'Good', 'Fair/Functional'];

  const toggleCondition = (cond) => {
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    setShowProposal(false);
  };

  const handleBookClick = () => {
    if (!isVerified) {
      alert("Verification Pending: You can browse the marketplace, but you cannot book items until an admin verifies your identity. Please ensure you have uploaded a valid Student/Work ID in your profile.");
      return;
    }
    setShowProposal(true);
    if (type === 'buy' && selectedItem.price_type === 'Negotiable') {
      setProposedPrice(selectedItem.sell_price);
    }
  };

  const nextImage = () => {
    if (selectedItem.photos && currentImageIndex < selectedItem.photos.length - 1) {
      setCurrentImageIndex(i => i + 1);
    }
  };

  const prevImage = () => {
    if (selectedItem.photos && currentImageIndex > 0) {
      setCurrentImageIndex(i => i - 1);
    }
  };

  const submitProposal = async (e) => {
    e.preventDefault();
    if (type === 'rent' && !agreeTerms) {
      alert("Please agree to the security deposit and damage policies.");
      return;
    }
    
    setSubmittingOffer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) throw new Error("You must be logged in to send a request!");

      const proposalPayload = {
        item_id: selectedItem.id,
        buyer_id: user.id,
        payment_preference: paymentMethod,
        meeting_preference: meetingPref,
        pickup_time: pickupTime,
        message: message,
        share_contact: shareContact
      };

      if (type === 'buy') {
        proposalPayload.offered_price = selectedItem.price_type === 'Negotiable' ? parseFloat(proposedPrice) : selectedItem.sell_price;
      } else {
        proposalPayload.rent_duration_months = parseInt(rentDuration);
        proposalPayload.agree_terms = agreeTerms;
      }

      const { data: propData, error } = await supabase.from('proposals').insert([proposalPayload]).select().single();
      if(error) throw error;

      // --- NEW: Trigger Notification for Seller ---
      await supabase.from('notifications').insert([{
        user_id: selectedItem.seller_id,
        title: 'New Proposal Received 📦',
        message: `Someone is interested in your **${selectedItem.title}**! Check your "Manage My Items" to view the offer.`,
        type: 'proposal',
        link: '/dashboard/my-items'
      }]);

      alert("Proposal Sent Successfully! It will appear in your Order History.");
      setShowProposal(false);
    } catch (err) {
      alert("Error sending offer: " + err.message);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleChat = async (vendorId) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      if (!user?.id || !vendorId) {
        console.error("Missing User ID or Vendor ID", { userId: user?.id, vendorId });
        return;
      }

      if (user.id === vendorId) return;

      const [u1, u2] = user.id < vendorId ? [user.id, vendorId] : [vendorId, user.id];

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
      if (err.message.includes("404") || err.message.includes("not found")) {
        alert("Database Error: The 'conversations' table was not found. Please make sure you have run the provided SQL query in your Supabase SQL Editor.");
      } else {
        alert("Could not start chat: " + err.message);
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Browse {type === 'buy' ? 'Items for Sale' : 'Items for Rent'}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Discover items available from students near you.</p>
        </div>
      </div>

      {/* NEW FILTER BAR */}
      <div className="glass-morphism" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* SEARCH */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} size={18} color="var(--primary)" />
            <input 
              type="text" 
              placeholder="Search by title, category, or keyword..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.95rem' }} 
            />
          </div>

          {/* SORT */}
          <div style={{ width: '180px' }}>
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* CONDITION FILTER */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Condition:</span>
            {conditions.map(c => (
              <button 
                key={c}
                onClick={() => toggleCondition(c)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '20px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: selectedConditions.includes(c) ? 'var(--primary)' : 'var(--card-bg)',
                  color: selectedConditions.includes(c) ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${selectedConditions.includes(c) ? 'var(--primary)' : 'var(--border-color)'}`
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* RADIUS SLIDER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Proximity</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>{maxRadius} km</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="10" 
                step="0.5" 
                value={maxRadius} 
                onChange={e => setMaxRadius(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      {loadingDb ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading Realtime Market Data...</div>
      ) : filteredItems.length === 0 ? (
        <EmptyState 
          Icon={Search}
          title="No results found matching your filters"
          message="Try adjusting your search query, condition, or radius slider to find more items on campus."
          actionText="Clear All Filters"
          onAction={() => { setSearchQuery(''); setSelectedConditions([]); setMaxRadius(10); }}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarOpen ? '280px' : '250px'}, 1fr))`, 
          gap: '1.5rem',
          transition: 'all 0.3s'
        }}>
          {filteredItems.map((item, index) => {
            const displayTitle = item.title;
            const displayPrice = type === 'buy' ? item.sell_price : item.rent_amount;
            const displayImage = item.photos && item.photos.length > 0 ? item.photos[0] : 'https://picsum.photos/400';
            const ownerName = item.users?.full_name || 'Verified User';
            const ownerInitial = ownerName.charAt(0).toUpperCase();

            return (
              <div 
                key={item.id} 
                onClick={() => handleOpenModal(item)}
                className="premium-card animate-reveal"
                style={{ 
                  height: '420px', 
                  background: 'var(--card-bg)', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column',
                  animationDelay: `${index * 0.08}s`,
                  position: 'relative'
                }}
              >
                <div style={{ height: '70%', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--sidebar-bg)', flexShrink: 0 }}>
                  <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {item.dist} km
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {item.condition}
                  </div>
                  {item.photos && item.photos.length > 1 && (
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {item.photos.length} Photos 📸
                    </div>
                  )}
                </div>
                <div style={{ height: '30%', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayTitle}</h3>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem' }}>₹{displayPrice}{type === 'rent' && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/mo</span>}</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                        {ownerInitial}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {ownerName} <CheckCircle2 size={12} color={item.users?.is_verified ? "var(--success)" : "#94A3B8"} />
                      </span>
                    </div>
                    <button 
                      onClick={(e) => toggleWishlist(e, item.id)}
                      className={`wishlist-btn-alt ${wishlist.includes(item.id) ? 'active' : ''}`}
                    >
                      <Heart size={16} fill={wishlist.includes(item.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Booking Modal wider rectangle shape */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
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
              transition: 'all var(--transition-smooth)',
              animation: 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            
            {/* Split View Left: Item Photos AND Core Info */}
            <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', position: 'relative' }}>
              
              {/* IMAGE CAROUSEL */}
              <div style={{ width: 'calc(100% - 2.5rem)', height: 'calc(55% - 1.5rem)', margin: '1rem 1.25rem 0.5rem 1.25rem', background: '#0F172A', position: 'relative', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                {selectedItem.photos && selectedItem.photos.length > 0 ? (
                  <>
                    <img src={selectedItem.photos[currentImageIndex]} alt="Product view" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', fontWeight: 800, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {currentImageIndex + 1} / {selectedItem.photos.length}
                    </div>
                    {/* Carousel Arrows */}
                    {selectedItem.photos.length > 1 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', pointerEvents: 'none' }}>
                        <button onClick={prevImage} disabled={currentImageIndex === 0} style={{ pointerEvents: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentImageIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === 0 ? 0.3 : 1, boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }}>
                          <ChevronLeft size={24} />
                        </button>
                        <button onClick={nextImage} disabled={currentImageIndex === selectedItem.photos.length - 1} style={{ pointerEvents: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentImageIndex === selectedItem.photos.length - 1 ? 'not-allowed' : 'pointer', opacity: currentImageIndex === selectedItem.photos.length - 1 ? 0.3 : 1, boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }}>
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
              <div style={{ height: showProposal ? '45%' : '35%', padding: '0.75rem 1.25rem 0 1.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{type === 'buy' ? 'For Sale' : 'For Rent'}</span>
                  <span style={{ background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>{selectedItem.condition}</span>
                  <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>{selectedItem.category}</span>
                </div>
                
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.2rem', lineHeight: 1.2 }}>{selectedItem.title}</h2>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  ₹{type === 'buy' ? selectedItem.sell_price : selectedItem.rent_amount} {type === 'rent' && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ {selectedItem.rent_cycle}</span>}
                  {type === 'buy' && <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', color: 'var(--text-tertiary)', fontWeight: 500, background: 'var(--sidebar-bg)', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>{selectedItem.price_type}</span>}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4, fontSize: '0.85rem', margin: 0 }}>
                    {selectedItem.description}
                  </p>
                </div>
              </div>

               {/* BUTTONS WRAPPER (10%) */}
              {!showProposal && (
                <div style={{ height: '10%', padding: '0 1.25rem 0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={handleBookClick} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '36px' }}>
                    {type === 'buy' ? 'Book to Buy' : 'Request to Rent'}
                  </button>
                  <button 
                  onClick={() => handleChat(selectedItem.seller_id)}
                  className="btn btn-outline" 
                   style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 800, height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <MessageCircle size={16} /> Chat with Seller
                </button>
                <button 
                  onClick={(e) => toggleWishlist(e, selectedItem.id)}
                  className={`admin-icon-btn ${wishlist.includes(selectedItem.id) ? 'active' : ''}`}
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    background: wishlist.includes(selectedItem.id) ? 'var(--danger)' : 'rgba(148, 163, 184, 0.1)', 
                    color: wishlist.includes(selectedItem.id) ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                >
                  <Heart size={18} fill={wishlist.includes(selectedItem.id) ? "currentColor" : "none"} />
                </button>
                </div>
              )}
            </div>

            {/* Split View Right: Expanded Details OR Buyer Proposal Form */}
            {!showProposal ? (
              <div style={{ flex: '0 0 60%', padding: '1.25rem', overflow: 'hidden', background: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)' }}>
                  <X size={20} />
                </button>

                {/* GENERAL & SELLING DETAILS */}
                <div style={{ background: 'var(--sidebar-bg)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '0.95rem' }}>General & {type === 'buy' ? 'Selling' : 'Rental'} Details</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Availability Date:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedItem.availability_date}</span></div>
                    
                    {type === 'buy' && (
                      <>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Usage Duration:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedItem.usage_duration}</span></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Reason for Selling:</span> <span style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedItem.sell_reason}</span></div>
                        {selectedItem.original_price && <div><span style={{ color: 'var(--text-secondary)' }}>Original Price:</span> <span style={{ fontWeight: 600, display: 'block' }}>₹{selectedItem.original_price}</span></div>}
                        {selectedItem.is_combo && <div style={{ gridColumn: '1/-1', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px dashed var(--success)', marginTop: '0.25rem' }}><span style={{ color: 'var(--success)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>🎁 Bundle Deal included:</span> <span style={{ color: 'var(--success)' }}>{selectedItem.combo_description}</span></div>}
                      </>
                    )}
                    
                    {type === 'rent' && (
                      <>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Max Period:</span> <span style={{ fontWeight: 600, display: 'block' }}>{selectedItem.max_period}</span></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Reason for Renting:</span> <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>{selectedItem.rent_reason}</span></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Damage Policy:</span> <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>{selectedItem.damage_policy}</span></div>
                        <div style={{ gridColumn: '1/-1', marginTop: '0.25rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Return Policy:</span> 
                          <div style={{ maxHeight: '90px', overflowY: 'auto', paddingRight: '0.4rem', marginTop: '4px' }} className="custom-scrollbar">
                            <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', lineHeight: 1.4 }}>{selectedItem.return_policy}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Proof of Purchase:</span> 
                      {selectedItem.bill_photo ? <a href={selectedItem.bill_photo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>View Bill linked &rarr;</a> : <span style={{ fontWeight: 600 }}>Not Provided</span>}
                    </div>
                  </div>
                </div>

                {/* LOGISTICS & CONTACT DETAILS */}
                <div style={{ background: 'var(--sidebar-bg)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', fontSize: '0.95rem' }}>Logistics, Contact & Meetup Info</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><MapPin size={16} color="var(--primary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '-2px' }}>Pickup Location:</span> <span style={{ fontWeight: 600 }}>{selectedItem.pickup_location || 'Campus details'}</span></div></div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><Calendar size={16} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '-2px' }}>Preferred Contact Time:</span> <span style={{ fontWeight: 600 }}>{selectedItem.preferred_contact_time || 'Not specified'}</span></div></div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', gridColumn: '1/-1' }}><MapPin size={16} color="var(--text-tertiary)" /> <div><span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '-2px' }}>Preferred Meetup Spot:</span> <span style={{ fontWeight: 600 }}>{selectedItem.preferred_meetup_spot || 'Not specified'}</span></div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1/-1' }}><span style={{ color: 'var(--text-secondary)' }}>Phone Number Privacy:</span> <span style={{ fontWeight: 600, display: 'inline-block', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>{selectedItem.show_phone ? 'Shared upon booking ✅' : 'In-App Chat Only 🔒'}</span></div>
                  </div>
                </div>

                {/* SELLER IDENTITY */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--sidebar-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                    {(selectedItem.users?.full_name || 'J').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                      {selectedItem.users?.full_name || 'Verified User'} <CheckCircle2 size={14} color={selectedItem.users?.is_verified ? "var(--success)" : "#94A3B8"} />
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Listed on {new Date(selectedItem.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', background: 'var(--card-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                    {type === 'buy' ? 'Send Purchase Proposal' : 'Send Rental Request'}
                  </h3>
                  <button onClick={() => setShowProposal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={submitProposal} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                   {type === 'buy' ? (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--success)' }}>
                      <label style={{ display: 'block', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem', fontSize: '1rem' }}>
                        {selectedItem.price_type === 'Negotiable' ? 'Proposed Price (₹)' : 'Final Price (₹)'}
                      </label>
                      {selectedItem.price_type === 'Negotiable' ? (
                        <input required type="number" value={proposedPrice} onChange={e=>setProposedPrice(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '2px solid var(--success)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }} />
                      ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>₹{selectedItem.sell_price} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>(Fixed)</span></div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="input-group">
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Required Duration ({selectedItem.rent_cycle === 'unit' ? 'Month' : selectedItem.rent_cycle}s) *</label>
                        <input required type="number" min="1" max="24" value={rentDuration} onChange={e=>setRentDuration(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '1rem' }} />
                      </div>
                      
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--success)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', color: 'var(--success)' }}>
                          <span>Rent Total ({rentDuration} {selectedItem.rent_cycle === 'unit' ? 'Month' : selectedItem.rent_cycle}s):</span>
                          <span style={{ fontWeight: 700 }}>₹{selectedItem.rent_amount * rentDuration}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--success)' }}>
                          <span>Deposit:</span>
                          <span style={{ fontWeight: 700 }}>₹{selectedItem.security_deposit || 0}</span>
                        </div>
                        <hr style={{ borderColor: 'var(--success)', opacity: 0.3, margin: '0.5rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: 'var(--success)', fontWeight: 800 }}>
                          <span>Total: ₹{(selectedItem.rent_amount * rentDuration) + (selectedItem.security_deposit || 0)}</span>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem', border: '1px solid var(--danger)', borderRadius: '8px' }}>
                        <input type="checkbox" required checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)} style={{ width: '16px', height: '16px', marginTop: '2px' }} />
                        <span>I agree to pay the refundable deposit of ₹{selectedItem.security_deposit || 0} at meetup.</span>
                      </label>
                    </>
                  )}

                   <div className="input-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Payment Method</label>
                    <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      <option>UPI (GPay, PhonePe, Paytm)</option>
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="input-group">
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.85rem' }}>Meeting Pref.</label>
                      <select value={meetingPref} onChange={e=>setMeetingPref(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        <option>College Canteen</option>
                        <option>PG Gate</option>
                        <option>Hostel Lobby</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.85rem' }}>Pickup Time</label>
                      <input type="text" value={pickupTime} onChange={e=>setPickupTime(e.target.value)} placeholder="e.g. After 5 PM" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Message (Optional)</label>
                    <textarea value={message} onChange={e=>setMessage(e.target.value)} rows="2" placeholder="Hi! Is the price negotiable?" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', resize: 'none', fontSize: '0.9rem' }}></textarea>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={shareContact} onChange={e=>setShareContact(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                    Share my Contact Details.
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                    <ShieldCheck size={20} color="var(--success)" />
                    <p style={{ fontSize: '0.85rem', color: 'var(--success)', margin: 0, fontWeight: 700 }}>High Campus Trust Score.</p>
                  </div>

                   <button type="submit" disabled={submittingOffer} className="btn btn-primary" style={{ padding: '0.8rem', fontSize: '1.15rem', marginTop: '0.5rem', fontWeight: 800 }}>
                    {submittingOffer ? 'Sending...' : (type === 'buy' ? 'Send Purchase Request' : 'Submit Rental Proposal')}
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    Payment face-to-face during physical exchange.
                  </p>

                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
