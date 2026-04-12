import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  ShoppingBag, 
  Calendar, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  ShieldAlert,
  Clock,
  Tag,
  User,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import EmptyState from '../dashboard/EmptyState';

export default function AdminManageItems({ type }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [type]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const dbType = type === 'buy' ? 'sell' : 'rent';
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          users ( full_name, profile_pic_url, is_verified )
        `)
        .eq('type', dbType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching items:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
    
    setDeletingId(itemId);
    try {
      // 1. Delete from Supabase
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // 2. Update local state
      setItems(items.filter(item => item.id !== itemId));
      setSelectedItem(null);
      alert('Item deleted successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse">
        <div className="text-primary font-black uppercase tracking-widest">Scanning Marketplace Assets...</div>
      </div>
    );
  }

  return (
    <div className="animate-reveal">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1 hero-font text-gradient">
            Manage {type === 'buy' ? 'Buy' : 'Rent'} Items
          </h1>
          <p className="text-gray-400 text-sm font-bold tracking-wide uppercase opacity-70">
            Platform Asset Oversight • {filteredItems.length} Listings Found
          </p>
        </div>
        <div className="admin-search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by title, category, or seller..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState 
          Icon={ShoppingBag}
          title="No items found"
          message="No marketplace listings match your current search criteria."
          actionText="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredItems.map((item, index) => (
            <div 
              key={item.id} 
              onClick={() => { setSelectedItem(item); setCurrentImageIndex(0); }}
              className="premium-card"
              style={{ 
                height: '400px', 
                background: 'var(--card-bg)', 
                borderRadius: 'var(--radius-lg)', 
                overflow: 'hidden', 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column',
                animation: 'reveal 0.4s ease-out forwards',
                animationDelay: `${index * 0.05}s`,
                opacity: 0,
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              {/* Image Area */}
              <div style={{ height: '65%', width: '100%', overflow: 'hidden', position: 'relative', background: '#F8FAFC' }}>
                <img 
                  src={item.photos && item.photos.length > 0 ? item.photos[0] : 'https://picsum.photos/400'} 
                  alt={item.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(79, 70, 229, 0.9)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                  {item.category}
                </div>
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: item.status === 'Available' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                  {item.status}
                </div>
              </div>

              {/* Info Area */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                    className="admin-icon-btn"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                    disabled={deletingId === item.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.2rem', marginBottom: 'auto' }}>
                  ₹{type === 'buy' ? item.sell_price : item.rent_amount}
                  {type === 'rent' && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/mo</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                    {item.users?.full_name?.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {item.users?.full_name} <CheckCircle2 size={12} color={item.users?.is_verified ? "var(--success)" : "#94A3B8"} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal (Shared design with User BrowseView) */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
          <div 
            className="glass-morphism"
            style={{ 
              borderRadius: '32px', 
              width: '100%', 
              maxWidth: '1200px', 
              height: '90vh', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
              animation: 'modalReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              background: 'var(--card-bg)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {/* Left Panel: Media & Core Info */}
            <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', position: 'relative' }}>
              {/* Media Carousel with Dynamic Background */}
              <div style={{ height: '55%', position: 'relative', background: '#0F172A', overflow: 'hidden' }}>
                 {/* Blurred background for more premium feel */}
                <div style={{ 
                  position: 'absolute', 
                  inset: -20, 
                  backgroundImage: `url(${selectedItem.photos && selectedItem.photos.length > 0 ? selectedItem.photos[currentImageIndex] : ''})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px)',
                  opacity: 0.4
                }}></div>

                <button 
                  onClick={() => setSelectedItem(null)}
                  className="admin-icon-btn"
                  style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', zIndex: 20 }}
                >
                  <X size={20} color="white" />
                </button>
                
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  {selectedItem.photos && selectedItem.photos.length > 0 ? (
                    <>
                      <img 
                        src={selectedItem.photos[currentImageIndex]} 
                        style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} 
                        alt="" 
                      />
                      {selectedItem.photos.length > 1 && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); prevImage(); }} disabled={currentImageIndex === 0} className="carousel-btn left" style={{ opacity: currentImageIndex === 0 ? 0 : 1 }}>
                            <ChevronLeft size={24} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); nextImage(); }} disabled={currentImageIndex === selectedItem.photos.length - 1} className="carousel-btn right" style={{ opacity: currentImageIndex === selectedItem.photos.length - 1 ? 0 : 1 }}>
                            <ChevronRight size={24} />
                          </button>
                        </>
                      )}
                      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', padding: '6px 16px', borderRadius: '30px', color: 'white', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em' }}>
                        IMAGE {currentImageIndex + 1} OF {selectedItem.photos.length}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500 font-bold uppercase tracking-widest text-xs">Media Vault Empty</div>
                  )}
                </div>
              </div>

              {/* Core Details (Primary Section) */}
              <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', background: 'var(--sidebar-bg)' }}>
                 <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '5px 14px', borderRadius: '30px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedItem.status}</span>
                  <span style={{ border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '30px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>{selectedItem.condition}</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.4rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{selectedItem.title}</h2>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
                  ₹{type === 'buy' ? selectedItem.sell_price?.toLocaleString() : selectedItem.rent_amount?.toLocaleString()}
                  {type === 'rent' && <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', fontWeight: 700 }}> / {selectedItem.rent_cycle}</span>}
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem', fontWeight: 500 }}>{selectedItem.description}</p>
              </div>
            </div>

            {/* Right Panel: Metadata & Admin Actions */}
            <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                  <ShieldAlert size={22} className="text-primary" /> Admin Oversight
                </h3>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '8px', letterSpacing: '0.1em' }}>
                  UUID: {selectedItem.id.slice(0, 8)}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
                {/* Financial Section */}
                <section>
                  <SectionHeader label="Financial Configuration" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <MetaItem label="Condition" value={selectedItem.condition} />
                    <MetaItem label="Pricing" value={selectedItem.price_type || 'N/A'} />
                    {type === 'buy' ? (
                      <>
                        <MetaItem label="Usage" value={selectedItem.usage_duration} />
                        <MetaItem label="MSRP / Original" value={selectedItem.original_price ? `₹${selectedItem.original_price.toLocaleString()}` : '—'} />
                        <MetaItem label="Reason" value={selectedItem.sell_reason} />
                        <MetaItem label="Special Deal" value={selectedItem.is_combo ? `Combo: ${selectedItem.combo_description}` : 'Individual Item'} />
                      </>
                    ) : (
                      <>
                        <MetaItem label="Security Deposit" value={`₹${selectedItem.security_deposit?.toLocaleString()}`} />
                        <MetaItem label="Min / Max Stay" value={`${selectedItem.min_period} to ${selectedItem.max_period}`} />
                        <MetaItem label="Rent Context" value={selectedItem.rent_reason} />
                        <MetaItem label="Maintenance" value={selectedItem.maintenance_terms || 'No terms provided'} />
                      </>
                    )}
                  </div>
                </section>

                {/* Verification/Logistics */}
                <section>
                  <SectionHeader label="Logistics & Compliance" />
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <MetaItem label="Pickup Site" value={selectedItem.pickup_location} />
                    <MetaItem label="Meetup Point" value={selectedItem.preferred_meetup_spot} />
                    <MetaItem label="Available From" value={selectedItem.availability_date} />
                    <MetaItem label="Preferred Hours" value={selectedItem.preferred_contact_time} />
                    <MetaItem label="Privacy Level" value={selectedItem.show_phone ? 'Phone Public' : 'Chat Only'} />
                    <MetaItem 
                      label="Ownership Proof" 
                      value={selectedItem.bill_photo ? (
                        <a href={selectedItem.bill_photo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Verified Receipt &rarr;
                        </a>
                      ) : 'None Uploaded'} 
                    />
                  </div>
                </section>

                {/* Rental Details */}
                {type === 'rent' && (
                  <section style={{ border: '1px solid var(--danger)', padding: '1.5rem', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <SectionHeader label="Legal/Damage Policies" color="var(--danger)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <MetaItem label="Damage Protocol" value={selectedItem.damage_policy} />
                      <MetaItem label="End-of-Term Protocol" value={selectedItem.return_policy} />
                    </div>
                  </section>
                )}

                {/* Seller Profile Interface */}
                <section style={{ 
                  padding: '1.5rem', 
                  background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, var(--bg-color) 100%)', 
                  borderRadius: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                   <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)' }}>
                    {selectedItem.users?.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                      {selectedItem.users?.full_name} 
                      {selectedItem.users?.is_verified && <CheckCircle2 size={16} color="var(--success)" />}
                    </h5>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Elite Member • {type === 'buy' ? 'Verified Seller' : 'Verified Lender'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Join Date</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{new Date(selectedItem.users?.created_at || selectedItem.created_at).toLocaleDateString()}</div>
                  </div>
                </section>
              </div>

              {/* Admin Control Station */}
              <div style={{ marginTop: 'auto', paddingTop: '3rem' }}>
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                  <button 
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="admin-btn admin-btn-danger"
                    disabled={deletingId === selectedItem.id}
                    style={{ flex: 1, minWidth: 0, height: '56px', fontSize: '0.85rem', fontWeight: 800, borderRadius: '16px', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Trash2 size={20} /> {deletingId === selectedItem.id ? 'DELETING...' : 'DELETE LISTING'}
                  </button>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="admin-btn"
                    style={{ flex: 1, minWidth: 0, height: '56px', borderRadius: '16px', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    CLOSE PREVIEW
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, color }) {
  return (
    <h4 style={{ 
      fontSize: '0.7rem', 
      fontWeight: 900, 
      color: color || 'var(--text-tertiary)', 
      textTransform: 'uppercase', 
      letterSpacing: '0.15em', 
      marginBottom: '1.25rem', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.6rem' 
    }}>
      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: color || 'var(--primary)' }}></div>
      {label}
    </h4>
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon && <span style={{ color: 'var(--primary)', opacity: 0.7 }}>{icon}</span>}
        {label}
      </span>
      <span className="text-sm font-bold text-gray-900 dark:text-gray-100" style={{ wordBreak: 'break-word' }}>
        {value || 'N/A'}
      </span>
    </div>
  );
}
