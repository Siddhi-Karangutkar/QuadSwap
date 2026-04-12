import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle2, MessageCircle, ShoppingBag, X, ChevronLeft, ChevronRight, Heart, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import EmptyState from './EmptyState';

export default function WishlistView({ sidebarOpen }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          item_id,
          items (
            *,
            users ( full_name, profile_pic_url, is_verified )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const wishlistedItems = (data || [])
        .filter(w => w.items) // Ensure item still exists
        .map(w => ({
          ...w.items,
          dist: parseFloat((0.5 + Math.random() * 2).toFixed(1)) // Simulated campus distance
        }));

      setItems(wishlistedItems);
    } catch (err) {
      console.error("Error fetching wishlist:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const removeFromWishlist = async (e, itemId) => {
    if (e) e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);
      
      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
    } catch (err) {
      console.error("Error removing from wishlist:", err.message);
    }
  };

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Syncing your favorites...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>My Wishlist</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You have {items.length} items saved for later.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState 
          Icon={Heart}
          title="Your wishlist is empty"
          message="Found something you like? Click the heart icon on any item to save it here for later!"
          actionText="Explore Marketplace"
          onAction={() => navigate('/dashboard')}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarOpen ? '280px' : '250px'}, 1fr))`, 
          gap: '1.5rem'
        }}>
          {items.map((item, index) => (
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
              <div style={{ height: '70%', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--sidebar-bg)' }}>
                <img src={item.photos?.[0] || 'https://picsum.photos/400'} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> {item.dist} km
                </div>
              </div>
              <div style={{ height: '30%', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h3>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem' }}>₹{item.type === 'sell' ? item.sell_price : item.rent_amount}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                      {(item.users?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.users?.full_name || 'Verified User'}</span>
                  </div>
                  <button 
                    onClick={(e) => removeFromWishlist(e, item.id)}
                    className="wishlist-btn-alt"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-morphism" style={{ borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '900px', height: '80vh', display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: '0 0 45%', background: '#0F172A', position: 'relative' }}>
              <img src={selectedItem.photos?.[currentImageIndex] || 'https://picsum.photos/400'} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ flex: '1', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{selectedItem.type === 'sell' ? 'For Sale' : 'For Rent'}</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '1rem' }}>{selectedItem.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{selectedItem.description}</p>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>₹{selectedItem.type === 'sell' ? selectedItem.sell_price : selectedItem.rent_amount}</div>
              <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                <button onClick={() => navigate(selectedItem.type === 'sell' ? '/dashboard' : '/dashboard/browse-rent')} className="btn btn-primary" style={{ flex: 1 }}>View in Marketplace</button>
                <button onClick={(e) => removeFromWishlist(e, selectedItem.id)} className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
