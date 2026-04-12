import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  FileText, 
  ShieldAlert, 
  X,
  User,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Eye,
  Check,
  Ban,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function ApproveUsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });
      
      setUsers(usersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async (userId, status) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: status })
        .eq('id', userId);
      
      if (error) throw error;

      // If approving, send a notification
      if (status === true) {
        await supabase.from('notifications').insert([
          {
            user_id: userId,
            type: 'system',
            title: 'Account Verified!',
            message: 'Congratulations! Your student identity has been verified. You can now post items and make proposals.',
            link: '/dashboard/profile'
          }
        ]);
      }
      
      // Remove from the local list regardless (since this is the PENDING list)
      setUsers(users.filter(u => u.id !== userId));
      setIsModalOpen(false);
      setIsPreviewingDoc(false);
      
      if (status === true) {
        alert('User approved and moved to Manage Users.');
      }
    } catch (err) {
      alert('Verification update failed: ' + err.message);
    }
  }

  const handleRejectUser = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setRejecting(true);
    try {
      // 1. Call server for comprehensive cleanup FIRST (Auth + Storage + Email)
      // We do this first because we need the selectedUser data (URLs) before deleting from DB
      const serverResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/reject-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          userEmail: selectedUser.email,
          userName: selectedUser.full_name,
          rejectionReason: rejectionReason.trim(),
          profilePicUrl: selectedUser.profile_pic_url,
          idUploadUrl: selectedUser.id_upload_url
        })
      });

      if (!serverResponse.ok) {
        const errData = await serverResponse.json();
        throw new Error(errData.error || 'Server rejection failed');
      }

      // 2. Delete user from 'users' table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (dbError) console.warn('DB delete warning (may have been handled by server):', dbError.message);

      // 3. Update local state
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setIsModalOpen(false);
      setShowRejectModal(false);
      const rejectedName = selectedUser.full_name;
      setRejectionReason('');
      setSelectedUser(null);
      alert(`User ${rejectedName} has been fully rejected and all data (Auth, DB, Storage) has been removed.`);
    } catch (err) {
      alert('Rejection failed: ' + err.message + '\n\nTIP: Check if your server is running and if you used the correct SERVICE_ROLE_KEY.');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading Users...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>User Verification Queue</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Identity Authentication • Campus Security</p>
      </div>

      {/* ====== 3-COLUMN CARD GRID ====== */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.25rem' 
      }}>
        {users.map((user) => (
          <div 
            key={user.id} 
            onClick={() => { setSelectedUser(user); setIsModalOpen(true); setIsPreviewingDoc(false); }}
            style={{
              background: 'var(--card-bg)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '1rem',
              position: 'relative',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(79,70,229,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {/* Round Profile Picture */}
            <div style={{
              width: '56px',
              height: '56px',
              minWidth: '56px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2.5px solid var(--primary)',
              background: 'var(--sidebar-bg)',
            }}>
              {user.profile_pic_url ? (
                <img 
                  src={user.profile_pic_url} 
                  alt={user.full_name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 900, fontSize: '1.25rem' }}>
                  {user.full_name?.charAt(0)}
                </div>
              )}
            </div>

            {/* Name / Year / College */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </h3>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', margin: '2px 0 4px 0' }}>
                {user.year_of_study || 'Student'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <GraduationCap size={12} style={{ color: 'var(--primary)', opacity: 0.5, flexShrink: 0 }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.college}
                </span>
              </div>
            </div>

            {/* Status Tag */}
            <div style={{ position: 'absolute', top: '0.6rem', right: '0.75rem' }}>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: user.is_verified ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                color: user.is_verified ? '#10b981' : '#64748b',
                border: `1px solid ${user.is_verified ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.25)'}`,
              }}>
                {user.is_verified ? 'Accepted' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ====== MODAL ====== */}
      {isModalOpen && selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem',
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            animation: 'modalReveal 0.35s cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {/* Rounded Square Profile Pic */}
              <div style={{
                width: '72px', height: '72px', minWidth: '72px',
                borderRadius: '14px', overflow: 'hidden',
                border: '2px solid var(--border-color)',
                background: 'var(--sidebar-bg)',
              }}>
                {selectedUser.profile_pic_url ? (
                  <img src={selectedUser.profile_pic_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 900, fontSize: '2rem' }}>
                    {selectedUser.full_name?.charAt(0)}
                  </div>
                )}
              </div>
              {/* Name & Status */}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{selectedUser.full_name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: '6px',
                    background: selectedUser.is_verified ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                    color: selectedUser.is_verified ? '#10b981' : '#64748b',
                    border: `1px solid ${selectedUser.is_verified ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.25)'}`,
                  }}>
                    {selectedUser.is_verified ? 'Verified' : 'Pending Verification'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {/* Close */}
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
              {!isPreviewingDoc ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Left Column: Identity */}
                  <div style={{ background: 'var(--sidebar-bg)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', opacity: 0.6 }}>Identity Details</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <InfoRow icon={<User size={15} />} label="Year / Job Title" value={selectedUser.year_of_study || 'N/A'} color="var(--primary)" />
                      <InfoRow icon={<GraduationCap size={15} />} label="College / Institute" value={selectedUser.college || 'N/A'} color="var(--primary)" />
                      <InfoRow icon={<FileText size={15} />} label="ID / Aadhar Number" value={selectedUser.student_id_num || 'N/A'} color="var(--primary)" />
                    </div>
                  </div>

                  {/* Right Column: Contact */}
                  <div style={{ background: 'var(--sidebar-bg)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', opacity: 0.6 }}>Contact Details</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <InfoRow icon={<Phone size={15} />} label="WhatsApp" value={selectedUser.whatsapp_number || 'N/A'} color="#10b981" />
                      <InfoRow icon={<Mail size={15} />} label="Email" value={selectedUser.email || 'N/A'} color="#3b82f6" />
                      <InfoRow icon={<MapPin size={15} />} label="Location" value={`${selectedUser.area || ''}, ${selectedUser.city || ''}`} color="#f59e0b" />
                    </div>
                  </div>

                  {/* Preview Button - Full Width */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setIsPreviewingDoc(true)}
                      style={{
                        width: '100%', padding: '0.9rem', borderRadius: '12px',
                        border: '2px dashed var(--primary)', background: 'transparent',
                        color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.05)'; e.currentTarget.style.borderStyle = 'solid'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderStyle = 'dashed'; }}
                    >
                      <Eye size={18} /> Preview Uploaded Document
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <button 
                      onClick={() => setIsPreviewingDoc(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      ← Back to Details
                    </button>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedUser.id_upload_url ? (
                      selectedUser.id_upload_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={selectedUser.id_upload_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="ID Document" />
                      ) : (
                        <iframe src={selectedUser.id_upload_url} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Preview" />
                      )
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748b' }}>
                        <ShieldAlert size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>No Document Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
              {!selectedUser.is_verified ? (
                <>
                  <button 
                    onClick={() => handleToggleVerification(selectedUser.id, true)} 
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '12px',
                      background: 'var(--primary)', color: 'white', border: 'none',
                      fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}
                  >
                    <Check size={18} /> Approve
                  </button>
                  <button 
                    onClick={() => { setShowRejectModal(true); setRejectionReason(''); }}
                    style={{
                      padding: '0.75rem 1.5rem', borderRadius: '12px',
                      background: 'transparent', color: '#ef4444', border: '1.5px solid #ef4444',
                      fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}
                  >
                    <Ban size={18} /> Reject
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleToggleVerification(selectedUser.id, false)}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '12px',
                    background: 'transparent', color: '#f59e0b', border: '1.5px solid #f59e0b',
                    fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  <ShieldAlert size={18} /> Revoke Verification
                </button>
              )}
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: '12px',
                  background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== REJECTION REASON MODAL ====== */}
      {showRejectModal && selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem',
        }}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)', padding: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Reject {selectedUser.full_name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>This will delete their account and send them a rejection email</p>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reason for Rejection *
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid ID document, unclear photo, mismatched name..."
              rows={4}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px',
                border: '1.5px solid var(--border-color)', background: 'var(--sidebar-bg)',
                color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'none',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleRejectUser}
                disabled={rejecting || !rejectionReason.trim()}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '12px',
                  background: '#ef4444', color: 'white', border: 'none',
                  fontWeight: 800, fontSize: '0.85rem', cursor: rejecting ? 'wait' : 'pointer',
                  opacity: rejecting || !rejectionReason.trim() ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                <Ban size={16} /> {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: '12px',
                  background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Small reusable row for modal info */
function InfoRow({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
      <div style={{
        width: '30px', height: '30px', minWidth: '30px',
        borderRadius: '8px', background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: color,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, opacity: 0.7 }}>{label}</p>
        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0', wordBreak: 'break-word' }}>{value}</p>
      </div>
    </div>
  );
}

export default ApproveUsersView;
