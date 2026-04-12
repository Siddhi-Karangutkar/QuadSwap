import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Trash2, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  MessageCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Receipt,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function AdminManagePurchases() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [warningInProgress, setWarningInProgress] = useState(false);
  const [deletingProposal, setDeletingProposal] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          buyer:buyer_id ( id, full_name, email, profile_pic_url, is_verified, college ),
          items (
            *,
            seller:seller_id ( id, full_name, email, profile_pic_url, is_verified, college )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (err) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWarning = async () => {
    if (!warningReason.trim()) return alert('Please provide a reason for the warning.');
    
    setWarningInProgress(true);
    try {
      const proposal = selectedProposal;
      const buyerId = proposal.buyer_id;
      const sellerId = proposal.items?.seller_id;
      const itemTitle = proposal.items?.title;

      // Send Notification to Buyer
      await supabase.from('notifications').insert([
        {
          user_id: buyerId,
          type: 'warning',
          title: 'Administrative Warning',
          message: `The administrator has issued a warning regarding your proposal for **${itemTitle}**. Reason: ${warningReason}`,
          link: '/dashboard/orders'
        }
      ]);

      // Send Notification to Seller
      await supabase.from('notifications').insert([
        {
          user_id: sellerId,
          type: 'warning',
          title: 'Administrative Warning',
          message: `The administrator has issued a warning regarding a proposal for your item **${itemTitle}**. Reason: ${warningReason}`,
          link: '/dashboard/my-items'
        }
      ]);

      setShowWarningModal(false);
      setWarningReason('');
      alert('Formal warnings issued to both parties.');
      
    } catch (err) {
      alert('Failed to send warnings: ' + err.message);
    } finally {
      setWarningInProgress(false);
    }
  };

  const handleVoidTransaction = async (id) => {
    if (!window.confirm('PERMANENT VOID: This will erase this transaction record from the database. This action is irreversible. Proceed?')) return;
    
    setDeletingProposal(true);
    try {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) throw error;
      
      setProposals(proposals.filter(p => p.id !== id));
      setSelectedProposal(null);
      alert('Transaction record voided successfully.');
    } catch (err) {
      alert('Void failed: ' + err.message);
    } finally {
      setDeletingProposal(false);
    }
  };

  const filteredProposals = filterStatus === 'all' 
    ? proposals 
    : proposals.filter(p => p.status?.toLowerCase() === filterStatus.toLowerCase());

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10rem 0' }}>
        <div className="admin-loader"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            Purchase Oversight
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
            Transaction Ledger • {proposals.length} Total Records
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                background: 'var(--card-bg)',
                border: '1.5px solid var(--border-color)',
                padding: '0.75rem 3rem 0.75rem 1.5rem',
                borderRadius: '16px',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '0.85rem',
                appearance: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <option value="all">ALL TRANSACTIONS</option>
              <option value="booked">BOOKED / SOLD</option>
              <option value="pending verification">PENDING VERIFICATION</option>
              <option value="accepted">ACCEPTED OFFERS</option>
              <option value="rejected">REJECTED OFFERS</option>
            </select>
            <Filter size={18} style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.6 }} />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
        {filteredProposals.map((proposal, idx) => (
          <TransactionCard 
            key={proposal.id} 
            proposal={proposal} 
            index={idx} 
            onView={() => { setSelectedProposal(proposal); setCurrentImageIndex(0); }}
          />
        ))}
      </div>

      {/* Detailed Oversight Modal */}
      {selectedProposal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
          <div style={{ 
            background: 'var(--bg-color)', 
            borderRadius: '32px', 
            width: '100%', 
            maxWidth: '1200px', 
            height: '90vh', 
            display: 'flex', 
            overflow: 'hidden', 
            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
            position: 'relative',
            animation: 'modalReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProposal(null)}
              style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 100, transition: 'all 0.2s ease' }}
            >
              <X size={22} />
            </button>

            {/* Left: Financial & Item Context (40%) */}
            <div style={{ width: '40%', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              {/* Media Carousel Wrapper */}
              <div style={{ height: '45%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  backgroundImage: `url(${selectedProposal.items?.photos?.[currentImageIndex]})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  filter: 'blur(30px) saturate(2)'
                }}></div>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                  <img src={selectedProposal.items?.photos?.[currentImageIndex]} style={{ maxHeight: '100%', width: 'auto', borderRadius: '16px', boxShadow: 'var(--shadow-xl)' }} />
                </div>
                
                {selectedProposal.items?.photos?.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))} 
                      className="carousel-btn left" 
                      style={{ width: '36px', height: '36px', opacity: currentImageIndex === 0 ? 0 : 1 }}
                    >
                      <ChevronLeft size={20}/>
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => Math.min(selectedProposal.items.photos.length - 1, prev + 1))} 
                      className="carousel-btn right" 
                      style={{ width: '36px', height: '36px', opacity: currentImageIndex === selectedProposal.items.photos.length - 1 ? 0 : 1 }}
                    >
                      <ChevronRight size={20}/>
                    </button>
                    <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '0.4rem 1rem', borderRadius: '20px', color: 'white', fontSize: '0.8rem', fontWeight: 900, zIndex: 20 }}>
                      {currentImageIndex + 1} / {selectedProposal.items?.photos?.length}
                    </div>
                  </>
                )}
              </div>

              {/* Transaction Summary */}
              <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                   <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ 
                      background: getStatusColor(selectedProposal.status), 
                      color: 'white', 
                      padding: '4px 12px', 
                      borderRadius: '30px', 
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase' 
                    }}>{selectedProposal.status}</span>
                    <span style={{ border: '1.5px solid var(--border-color)', padding: '4px 12px', borderRadius: '30px', fontSize: '0.65rem', fontWeight: 900 }}>{selectedProposal.items?.type?.toUpperCase()}</span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.2 }}>{selectedProposal.items?.title}</h2>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', fontFamily: 'Outfit' }}>₹{selectedProposal.offered_price?.toLocaleString()}</div>
                </div>

                <div style={{ background: 'var(--card-bg)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                  <SectionHeader label="Contractual Metadata" color="var(--primary)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <MetaItem label="Agreement Type" value={selectedProposal.payment_preference} />
                    <MetaItem label="Meeting Location" value={selectedProposal.meeting_preference} />
                    <MetaItem label="Pickup Schedule" value={selectedProposal.pickup_time || 'TBD'} />
                    <MetaItem label="Transaction ID" value={`#QS-TX-${selectedProposal.id.substring(0, 8).toUpperCase()}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Dual Identity Oversight (60%) */}
            <div style={{ width: '60%', padding: '3rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, letterSpacing: '-0.02em' }}>Administrative Oversight</h3>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 700 }}>Initiated: {new Date(selectedProposal.created_at).toLocaleString()}</div>
              </div>

              {/* The Handshake: Buyer & Seller */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'relative' }}>
                {/* Buyer */}
                <PartyCard role="BUYER" user={selectedProposal.buyer} />
                
                {/* Visual Connector */}
                <div style={{ flex: 1, height: '2px', background: 'var(--border-color)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} />
                  </div>
                </div>

                {/* Seller */}
                <PartyCard role="SELLER" user={selectedProposal.items?.seller} />
              </div>

              {/* Communication Transparency */}
              <section style={{ background: 'var(--sidebar-bg)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                <SectionHeader label="Agreement Narrative" icon={<MessageCircle size={16}/>} />
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, padding: '1rem', borderLeft: '4px solid var(--primary)', background: 'var(--card-bg)', borderRadius: '0 12px 12px 0' }}>
                  "{selectedProposal.message || 'No additional narrative provided for this transaction.'}"
                </div>
              </section>
              {/* Oversight Actions */}
              <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <button 
                  onClick={() => setShowWarningModal(true)}
                  style={{ height: '52px', background: 'rgba(245, 158, 11, 0.1)', border: '1.5px solid #F59E0B', color: '#F59E0B', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <AlertCircle size={18} /> WARN USERS
                </button>
                <button 
                  onClick={() => handleVoidTransaction(selectedProposal.id)}
                  className="admin-btn-danger"
                  disabled={deletingProposal}
                  style={{ height: '52px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' }}
                >
                  <Trash2 size={18} /> {deletingProposal ? 'VOIDING...' : 'VOID TX'}
                </button>
                <button 
                   onClick={() => setSelectedProposal(null)}
                   style={{ height: '52px', padding: '0 1rem', borderRadius: '12px', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                  <X size={18} /> EXIT VIEW
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Reason Modal */}
      {showWarningModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-color)', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '2rem', boxShadow: 'var(--shadow-2xl)', border: '1px solid var(--border-color)', animation: 'modalReveal 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#F59E0B' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>Issue Warning</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Communication Only</p>
              </div>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              You are about to issue a formal warning to <strong style={{color: 'var(--text-primary)'}}>{selectedProposal?.buyer?.full_name}</strong> and <strong style={{color: 'var(--text-primary)'}}>{selectedProposal?.items?.seller?.full_name}</strong>. The transaction will <strong style={{color: '#F59E0B'}}>not</strong> be deleted.
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Warning Reason</label>
              <textarea 
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                placeholder="Describe the violation..."
                style={{ 
                  width: '100%', 
                  height: '120px', 
                  background: 'var(--sidebar-bg)', 
                  border: '1.5px solid var(--border-color)', 
                  borderRadius: '16px', 
                  padding: '1rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '1rem', 
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleSendWarning}
                disabled={warningInProgress || !warningReason.trim()}
                className="admin-btn flex-1"
                style={{ height: '52px', borderRadius: '14px', background: '#F59E0B', color: 'white' }}
              >
                {warningInProgress ? 'SENDING...' : 'SEND WARNINGS'}
              </button>
              <button 
                onClick={() => { setShowWarningModal(false); setWarningReason(''); }}
                disabled={warningInProgress}
                className="admin-btn"
                style={{ height: '52px', borderRadius: '14px', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0 1.5rem' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, color, icon }) {
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
      {icon} {!icon && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: color || 'var(--primary)' }}></div>}
      {label}
    </h4>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-primary)' }}>{value || 'N/A'}</div>
    </div>
  );
}

function PartyCard({ role, user }) {
  return (
    <div style={{ flex: 1, background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: role === 'BUYER' ? '#3B82F6' : '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{role}</div>
      <div style={{ width: '72px', height: '72px', borderRadius: '20px', overflow: 'hidden', border: '2px solid var(--border-color)' }}>
        <img src={user?.profile_pic_url || 'https://picsum.photos/100'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div>
        <h5 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
          {user?.full_name} {user?.is_verified && <CheckCircle2 size={14} color="var(--success)" />}
        </h5>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.college}</div>
      </div>
    </div>
  );
}

function TransactionCard({ proposal, index, onView }) {
  const statusColor = getStatusColor(proposal.status);
  
  return (
    <div 
      onClick={onView}
      className="premium-card animate-reveal"
      style={{ 
        background: 'var(--card-bg)', 
        borderRadius: '24px', 
        padding: '1.75rem', 
        border: '1px solid var(--border-color)', 
        cursor: 'pointer',
        animationDelay: `${index * 0.05}s`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative'
      }}
    >
      {/* Top Bar: Status & Item Type */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ 
          background: statusColor, 
          color: 'white', 
          padding: '4px 12px', 
          borderRadius: '30px', 
          fontSize: '0.6rem', 
          fontWeight: 900, 
          textTransform: 'uppercase' 
        }}>{proposal.status}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
          {new Date(proposal.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Center: Handshake Visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <img src={proposal.buyer?.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <ArrowRight size={16} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
        <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <img src={proposal.items?.seller?.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
           <div style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--primary)', fontFamily: 'Outfit' }}>₹{proposal.offered_price?.toLocaleString()}</div>
           <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Final Offer</div>
        </div>
      </div>

      {/* Item Brief */}
      <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{proposal.items?.title}</h4>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>Type: {proposal.items?.type} • Cond: {proposal.items?.condition}</div>
      </div>

      {/* Footer: Users Names */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>
        <div style={{ color: '#3B82F6' }}>{proposal.buyer?.full_name?.split(' ')[0]} (B)</div>
        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
        <div style={{ color: '#F59E0B' }}>{proposal.items?.seller?.full_name?.split(' ')[0]} (S)</div>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'finally sold':
    case 'booked':
    case 'paid':
      return '#10B981';
    case 'pending verification':
      return '#F59E0B';
    case 'accepted':
      return 'var(--primary)';
    case 'rejected':
      return '#EF4444';
    default:
      return '#64748B';
  }
}

export default AdminManagePurchases;
