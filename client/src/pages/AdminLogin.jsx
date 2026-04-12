import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import '../index.css';

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Hardcoded credentials as per user request
    setTimeout(() => {
      if (email === 'admin@gmail.com' && password === 'admin@gmail.com') {
        localStorage.setItem('admin_token', 'secret_admin_token_123');
        navigate('/admin-dashboard');
      } else {
        setError('Invalid Admin Credentials');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="admin-login-container" style={{ position: 'relative' }}>
      {/* Absolute Back Button - Top Left of Viewport */}
      <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 100 }}>
        <button 
          onClick={() => navigate('/')}
          className="back-btn-premium"
          style={{ padding: '0.6rem 1.2rem', borderRadius: '14px', fontSize: '0.8rem' }}
        >
          <ArrowLeft size={14} /> Back to Landing Page
        </button>
      </div>

      <div className="flex flex-col items-center justify-center w-full animate-reveal px-6">
        <div className="admin-login-box">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Shield className="text-primary" size={28} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Admin Portal</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[0.6rem] mt-1 opacity-60">Management Access Only</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-2xl text-[0.8rem] mb-6 text-center font-black">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="admin-input-group">
              <label className="text-[0.6rem] font-black text-gray-400 dark:text-gray-500 ml-2 uppercase tracking-widest mb-1.5 block">Admin Email</label>
              <div className="admin-input-wrapper" style={{ position: 'relative' }}>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="admin-input"
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 3rem' }}
                />
              </div>
            </div>

            <div className="admin-input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="text-[0.6rem] font-black text-gray-400 dark:text-gray-500 ml-2 uppercase tracking-widest mb-1.5 block">Secret Password</label>
              <div className="admin-input-wrapper" style={{ position: 'relative' }}>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="admin-input"
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 3rem' }}
                />
              </div>
            </div>

            <div className="mt-6">
              <button 
                type="submit"
                disabled={loading}
                className="admin-btn flex items-center justify-center gap-3"
                style={{ padding: '0.9rem', fontSize: '0.85rem' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Authorize Access</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-gray-400 text-[0.6rem] mt-8 font-bold tracking-widest uppercase opacity-40">
            Powered by QuadSwap Security v2.0
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
