import React from 'react';
import { Sparkles } from 'lucide-react';

const EmptyState = ({ 
  Icon, 
  title, 
  message, 
  actionText, 
  onAction 
}) => {
  return (
    <div className="glass-morphism animate-reveal" style={{ 
      padding: '4rem 2rem', 
      borderRadius: '24px', 
      textAlign: 'center',
      background: 'var(--sidebar-bg)',
      border: '1px dashed var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      maxWidth: '600px',
      margin: '2rem auto'
    }}>
      <div style={{ 
        width: '100px', 
        height: '100px', 
        borderRadius: '50%', 
        background: 'rgba(79, 70, 229, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        boxShadow: 'var(--card-glow)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          animation: 'pulse-glow 2s infinite'
        }}>
          <Sparkles size={24} color="var(--secondary)" />
        </div>
        {Icon && <Icon size={48} color="var(--primary)" />}
      </div>

      <div style={{ maxWidth: '400px' }}>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem' }}>{message}</p>
      </div>

      {actionText && (
        <button 
          onClick={onAction}
          className="btn btn-primary btn-glow"
          style={{ 
            padding: '0.85rem 2rem', 
            borderRadius: '12px', 
            fontSize: '1rem', 
            fontWeight: 800,
            marginTop: '0.5rem'
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
