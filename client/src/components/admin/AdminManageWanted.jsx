import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  MapPin, 
  Clock, 
  Trash2, 
  X, 
  User, 
  Tag, 
  IndianRupee,
  Eye,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function AdminManageWanted() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Active', 'Fulfilled'
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wanted_items')
        .select(`
          *,
          users ( id, full_name, email, profile_pic_url, college )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error.message);
        throw error;
      }
      
      // Sanitizing data: Ensure status isn't null for visibility
      const sanitizedData = (data || []).map(item => ({
        ...item,
        status: item.status || 'Active'
      }));

      setRequests(sanitizedData);
    } catch (err) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('PERMANENT DELETE: This will remove the request from the campus board forever. Proceed?')) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase.from('wanted_items').delete().eq('id', id);
      if (error) throw error;
      
      // Notify user if possible
      if (id && requests.find(r => r.id === id)?.user_id) {
        await supabase.from('notifications').insert([{
          user_id: requests.find(r => r.id === id).user_id,
          title: 'Request Removed by Admin 🛡️',
          message: `Your wanted request for "${requests.find(r => r.id === id).title}" was removed by a moderator for compliance or fulfillment.`,
          type: 'alert'
        }]);
      }

      setRequests(requests.filter(r => r.id !== id));
      setSelectedRequest(null);
      alert('Request removed successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading Requests...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header & Search */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Wanted Board Moderation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Community Requests • Board Oversight</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>

          {/* Status Filter Toggle */}
          <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: '12px', border: '1.5px solid var(--border-color)', padding: '4px' }}>
            {['All', 'Active', 'Fulfilled'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: statusFilter === status ? 'var(--primary)' : 'transparent',
                  color: statusFilter === status ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {status}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '12px',
                background: 'var(--card-bg)',
                border: '1.5px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border-color)', borderRadius: '12px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, minWidth: '100px' }}>
            <Filter size={16} /> {filteredRequests.length} Posts
          </div>
        </div>
      </div>

      {/* Request Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.25rem',
        overflowY: 'auto',
        paddingRight: '0.5rem'
      }} className="custom-scrollbar">
        {filteredRequests.map((req) => (
          <div 
            key={req.id} 
            onClick={() => setSelectedRequest(req)}
            style={{
              background: 'var(--card-bg)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              opacity: req.status === 'Fulfilled' ? 0.75 : 1
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', background: 'rgba(79,70,229,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                  {req.category}
                </span>
                <span style={{ 
                  fontSize: '0.6rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  color: req.status === 'Fulfilled' ? '#10b981' : '#3b82f6', 
                  background: req.status === 'Fulfilled' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', 
                  padding: '3px 8px', 
                  borderRadius: '4px' 
                }}>
                  {req.status}
                </span>
              </div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                {new Date(req.created_at).toLocaleDateString()}
              </span>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{req.title}</h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
              {req.description}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: req.users ? 'var(--primary)' : 'var(--text-tertiary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                  {req.users?.full_name?.charAt(0) || '?'}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{req.users?.full_name || 'Legacy / Deleted User'}</span>
              </div>
              <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.85rem' }}>
                {req.budget_range}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '28px', width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-2xl)', overflow: 'hidden', animation: 'modalReveal 0.3s ease-out' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sidebar-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(79,70,229,0.1)', borderRadius: '14px', color: 'var(--primary)' }}>
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Request Details</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus Wanted Board • ID: {selectedRequest.id.slice(0,8)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRequest(null)} style={{ background: 'var(--border-color)', border: 'none', padding: '8px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                {/* Left: Content */}
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '1rem' }}>{selectedRequest.title}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(79,70,229,0.1)', color: 'var(--primary)', padding: '5px 12px', borderRadius: '8px' }}>
                      <Tag size={12} /> {selectedRequest.category}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '5px 12px', borderRadius: '8px' }}>
                      <IndianRupee size={12} /> {selectedRequest.budget_range}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedRequest.description}
                  </p>
                </div>

                {/* Right: Requester Info */}
                <div style={{ background: 'var(--sidebar-bg)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>Requester Profile</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${selectedRequest.users ? 'var(--primary)' : 'var(--text-tertiary)'}` }}>
                      {selectedRequest.users?.profile_pic_url ? (
                        <img src={selectedRequest.users.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: selectedRequest.users ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                          {selectedRequest.users?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedRequest.users?.full_name || 'System / Deleted User'}</h4>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{selectedRequest.users?.college || 'No college data'}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} /> Posted {new Date(selectedRequest.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Tag size={14} /> Status: <strong>{selectedRequest.status}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                onClick={() => handleDeleteRequest(selectedRequest.id)}
                disabled={deletingId === selectedRequest.id}
                className="admin-btn admin-btn-danger"
                style={{ flex: 1, minWidth: 0, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
              >
                <Trash2 size={20} /> {deletingId === selectedRequest.id ? 'REMOVING...' : 'REMOVE REQUEST'}
              </button>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="admin-btn"
                style={{ flex: 1, minWidth: 0, height: '52px', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManageWanted;
