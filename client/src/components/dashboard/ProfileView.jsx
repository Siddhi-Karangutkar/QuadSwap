import React, { useState, useEffect } from 'react';
import { User, GraduationCap, MapPin, ShieldCheck, Camera, Save, Lock, Eye, EyeOff, Loader2, CheckCircle2, ChevronRight, Edit3, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function ProfileView() {
  const [activeTab, setActiveTab] = useState('view'); // 'view', 'edit', 'password'
  const [profile, setProfile] = useState({
    full_name: '',
    college: '',
    year_of_study: '',
    area: '',
    address: '',
    profile_pic_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      if (data) setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          college: profile.college,
          year_of_study: profile.year_of_study,
          area: profile.area,
          address: profile.address
        })
        .eq('id', user.id);

      if (error) throw error;
      alert("Profile updated successfully!");
      setActiveTab('view');
    } catch (err) {
      alert("Error updating profile: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters!");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert("Password changed successfully!");
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('view');
    } catch (err) {
      alert("Error changing password: " + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_pic_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setProfile({ ...profile, profile_pic_url: publicUrl });
      alert("Profile picture updated!");
    } catch (err) {
      alert("Error uploading image: " + err.message);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading your profile...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>My Profile</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your personal identity and account security.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab !== 'view' && (
            <button 
              onClick={() => setActiveTab('view')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--sidebar-bg)', color: 'var(--text-secondary)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Profile
            </button>
          )}
        </div>
      </div>

      {activeTab === 'view' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Profile Card */}
          <div className="premium-card animate-reveal" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: '-50px', left: '2rem', border: '6px solid white', borderRadius: '50%', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--sidebar-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {profile.profile_pic_url ? (
                    <img src={profile.profile_pic_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    profile.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '60px 2rem 2rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    {profile.full_name} <CheckCircle2 size={24} color={profile.is_verified ? "var(--success)" : "#94A3B8"} />
                  </h3>
                  <p style={{ color: profile.is_verified ? 'var(--text-secondary)' : '#94A3B8', fontSize: '1rem', fontWeight: 600, marginTop: '4px' }}>{profile.is_verified ? 'Verified' : 'Unverified'} Student @ {profile.college}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setActiveTab('password')} className="btn btn-outline" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px' }}>
                    <Lock size={18} /> Security
                  </button>
                  <button onClick={() => setActiveTab('edit')} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px' }}>
                    <Edit3 size={18} /> Edit Profile
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ padding: '10px', background: '#EEF2FF', borderRadius: '12px' }}><GraduationCap size={20} color="var(--primary)" /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Academic Detail</span>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '2px 0 0 0' }}>{profile.year_of_study} - {profile.college}</p>
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ padding: '10px', background: '#F0FDF4', borderRadius: '12px' }}><MapPin size={20} color="var(--success)" /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Preferred Area</span>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '2px 0 0 0' }}>{profile.area || 'Not Set'}</p>
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ padding: '10px', background: '#FFF7ED', borderRadius: '12px' }}><ShieldCheck size={20} color="#F97316" /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Campus Trust Score</span>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '2px 0 0 0', color: 'var(--success)' }}>98% / High Campus Trust</p>
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: '12px' }}><User size={20} color="#64748B" /></div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Member Since</span>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '2px 0 0 0' }}>March 2026</p>
                      </div>
                   </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Bio/Address</span>
                  <p style={{ margin: '0.5rem 0 0 0', lineHeight: 1.5, color: 'var(--text-primary)' }}>{profile.address || 'No bio or detailed address provided yet.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="glass-morphism animate-card-entrance" style={{ padding: '2rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--sidebar-bg)', overflow: 'hidden', border: '3px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'var(--primary)', fontWeight: 800 }}>
                {profile.profile_pic_url ? <img src={profile.profile_pic_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.full_name?.charAt(0)}
              </div>
              <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', padding: '6px', borderRadius: '50%', color: 'white', cursor: 'pointer', border: '2px solid white' }}>
                <Camera size={16} />
                <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Update Profile Photo</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Upload a clear photo for higher trust rating.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Full Name</label>
                <input type="text" value={profile.full_name} onChange={e=>setProfile({...profile, full_name: e.target.value})} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 600 }} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>College/University</label>
                <input type="text" value={profile.college} onChange={e=>setProfile({...profile, college: e.target.value})} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Academic Year</label>
                <select value={profile.year_of_study} onChange={e=>setProfile({...profile, year_of_study: e.target.value})} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 600 }}>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>Master's</option>
                </select>
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Campus Area</label>
                <input type="text" value={profile.area} onChange={e=>setProfile({...profile, area: e.target.value})} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 600 }} />
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Detailed Address / Bio</label>
              <textarea rows="3" value={profile.address} onChange={e=>setProfile({...profile, address: e.target.value})} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 500, resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button disabled={updating} type="submit" className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Save Changes
              </button>
              <button onClick={()=>setActiveTab('view')} type="button" className="btn btn-outline" style={{ padding: '1rem 2rem', fontWeight: 700 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div style={{ maxWidth: '500px', margin: '0 auto', background: 'white', padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
             <div style={{ width: '60px', height: '60px', background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <KeyRound size={28} color="var(--primary)" />
             </div>
             <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Security & Password</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Update your password to keep your campus account safe.</p>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group">
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={e=>setNewPassword(e.target.value)} 
                  placeholder="Min. 6 characters"
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 600 }} 
                />
                <button type="button" onClick={()=>setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                   {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Confirm New Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={e=>setConfirmPassword(e.target.value)} 
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontWeight: 600 }} 
              />
            </div>

            <button disabled={passwordLoading} type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {passwordLoading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />} Update Password
            </button>
            <button onClick={()=>setActiveTab('view')} type="button" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Back to Profile</button>
          </form>
        </div>
      )}
    </div>
  );
}
