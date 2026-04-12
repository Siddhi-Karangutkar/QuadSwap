import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import '../index.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setTheme(savedTheme);
  }, []);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    // Fallback Mock block if keys are not set
    if(supabase.supabaseUrl === 'https://placeholder.supabase.co') {
        alert("Supabase keys are not configured in client/.env yet! Redirecting to dashboard as mock.");
        navigate('/dashboard');
        return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      console.error("Login Error:", error);
      if (error?.message) {
        setErrorMsg(error.message);
      } else if (typeof error === 'object') {
        setErrorMsg("Network Timeout (504). Please check your internet connection and try again.");
      } else {
        setErrorMsg("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', width: '100%', transition: 'background-color 0.3s' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)', padding: '3rem', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: '450px', border: '1px solid var(--border-color)' }}>
        
        <div className="flex justify-center mb-6">
          <div className="nav-brand">
            <ShoppingBag size={32} />
            <span>QuadSwap</span>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>Welcome Back!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log in to your campus marketplace.</p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="flex-col gap-4" style={{ display: 'flex' }}>
          <div className="input-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
              <input 
                required 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu" 
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} 
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
              <input 
                required 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} 
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
            {loading ? 'Entering...' : 'Log In'}
          </button>
        </form>

        <p className="text-center" style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create Free Account</Link>
        </p>
      </div>
    </div>
  );
}
