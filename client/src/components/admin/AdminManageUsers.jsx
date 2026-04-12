import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldAlert, 
  X,
  User,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Search,
  Filter,
  Trash2,
  MoreVertical,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function AdminManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_verified', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeVerification = async (userId) => {
    if (!window.confirm('REVOKE VERIFICATION: This user will be moved back to the Approval Queue and lose their verified privileges. Proceed?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: false })
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(users.filter(u => u.id !== userId));
      setSelectedUser(null);
      alert('Verification revoked. User moved to Approval Queue.');
    } catch (err) {
      alert('Revoke failed: ' + err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`PERMANENT DELETE: Are you absolutely sure you want to delete ${user.full_name}? This will remove their profile and all data. This action is IRREVERSIBLE.`)) return;
    
    setIsDeleting(true);
    try {
      // 1. Call server for cleanup (Auth + Storage)
      const serverResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/reject-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: user.full_name,
          rejectionReason: 'Account deleted by administrator.',
          profilePicUrl: user.profile_pic_url,
          idUploadUrl: user.id_upload_url
        })
      });

      if (!serverResponse.ok) {
        // Continue even if server cleanup fails? Usually yes, but warn.
        console.warn('Server cleanup failed, proceeding with DB delete.');
      }

      // 2. Delete from DB
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;

      setUsers(users.filter(u => u.id !== user.id));
      setSelectedUser(null);
      alert('User deleted successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading Users...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header & Search */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Manage Verified Users</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Community Moderation • Active Profiles</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search by name, college, email..."
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
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border-color)', borderRadius: '12px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
            <Filter size={16} /> {filteredUsers.length} Users
          </div>
        </div>
      </div>

      {/* User Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.25rem',
        overflowY: 'auto',
        paddingRight: '0.5rem'
      }} className="custom-scrollbar">
        {filteredUsers.map((user) => (
          <div 
            key={user.id} 
            onClick={() => setSelectedUser(user)}
            style={{
              background: 'var(--card-bg)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.25rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(79,70,229,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2.5px solid #10b981', background: 'var(--sidebar-bg)' }}>
                {user.profile_pic_url ? (
                  <img src={user.profile_pic_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 900 }}>{user.full_name?.charAt(0)}</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</h3>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', margin: '2px 0' }}>{user.year_of_study || 'Student'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                   <GraduationCap size={12} />
                   <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.college}</span>
                </div>
              </div>
              <div style={{ color: '#10b981' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '2px dashed var(--border-color)' }}>
            <User size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>No active users found</h3>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '2.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', border: '3px solid #10b981' }}>
                  {selectedUser.profile_pic_url ? <img src={selectedUser.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>{selectedUser.full_name?.charAt(0)}</div>}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{selectedUser.full_name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>VERIFIED USER</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> Since {new Date(selectedUser.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem', marginBottom: '2.25rem' }}>
              <div style={{ background: 'var(--sidebar-bg)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: 0 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Identity</p>
                <ProfileInfo icon={<User size={14}/>} label="Year" value={selectedUser.year_of_study} />
                <ProfileInfo icon={<GraduationCap size={14}/>} label="College" value={selectedUser.college} />
                <ProfileInfo icon={<ShieldAlert size={14}/>} label="ID Num" value={selectedUser.student_id_num} />
              </div>
              <div style={{ background: 'var(--sidebar-bg)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: 0 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Contact</p>
                <ProfileInfo icon={<Phone size={14}/>} label="WhatsApp" value={selectedUser.whatsapp_number} />
                <ProfileInfo icon={<Mail size={14}/>} label="Email" value={selectedUser.email} />
                <ProfileInfo icon={<MapPin size={14}/>} label="Location" value={selectedUser.area} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => handleRevokeVerification(selectedUser.id)}
                className="admin-btn"
                style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: '1.5px solid #F59E0B', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                REVOKE VERIFICATION
              </button>
              <button 
                onClick={() => handleDeleteUser(selectedUser)}
                disabled={isDeleting}
                className="admin-btn-danger"
                style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <Trash2 size={18} /> {isDeleting ? 'DELETING...' : 'DELETE ACCOUNT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileInfo({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ color: 'var(--primary)', opacity: 0.6, marginTop: '2px' }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 800, wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.3 }}>{value || 'Not provided'}</p>
      </div>
    </div>
  );
}

export default AdminManageUsers;
