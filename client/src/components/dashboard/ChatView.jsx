import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, UserCircle, CheckCircle2, MoreVertical, Paperclip, MessageSquare, Loader2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function ChatView() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        fetchConversations(user.id);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      
      // Subscribe to real-time messages for this conversation
      const channel = supabase
        .channel(`chat_${activeConversation.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${activeConversation.id}` 
        }, payload => {
          // IMPORTANT: If we are the sender, we handle our own optimistic UI above.
          // We only add from the subscription if the sender is the OTHER person.
          // This prevents "flickering" or "doubling" on the sender's side.
          setMessages(prev => {
            if (payload.new.sender_id === currentUser?.id) {
              // We've already dealt with this locally via optimistic UI
              // But if the local state hasn't been updated with the real ID yet,
              // we ensure we don't duplicate it.
              const exists = prev.some(m => m.id === payload.new.id);
              if (exists) return prev;
              
              // If it lacks a local temp counterpart, we might still want to add it,
              // but usually the local handleSendMessage handles this.
              return prev;
            }
            return [...prev, payload.new];
          });
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.warn("Chat Subscription Status:", status);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeConversation, currentUser]); // Added currentUser to dependency to ensure check works

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:users!user1_id(id, full_name, profile_pic_url),
          user2:users!user2_id(id, full_name, profile_pic_url)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);

      // Auto-select conversation if passed in state
      if (location.state?.conversationId) {
        const target = data.find(c => c.id === location.state.conversationId);
        if (target) {
          setActiveConversation(target);
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const receiverId = activeConversation.user1_id === currentUser.id 
      ? activeConversation.user2_id 
      : activeConversation.user1_id;

    const msgData = {
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      content: newMessage,
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Optimistic Update
    const tempId = Date.now();
    setMessages(prev => [...prev, { ...msgData, id: tempId, is_temp: true }]);
    setNewMessage('');

    try {
      const { data: sentMsg, error } = await supabase
        .from('messages')
        .insert([
          { 
            conversation_id: msgData.conversation_id, 
            sender_id: msgData.sender_id, 
            receiver_id: msgData.receiver_id, 
            content: msgData.content, 
            is_read: msgData.is_read 
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      // Update local state with real ID
      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
      
      // Update last_message in conversation
      await supabase
        .from('conversations')
        .update({ last_message: newMessage, updated_at: new Date().toISOString() })
        .eq('id', activeConversation.id);

    } catch (err) {
      console.error("Error sending message:", err.message);
      // Remove failed message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Failed to send message.");
    }
  };

  const getPartner = (conv) => {
    return conv.user1_id === currentUser?.id ? conv.user2 : conv.user1;
  };

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', background: 'var(--bg-color)', overflow: 'hidden' }}>
      
      {/* LEFT: Conversation List */}
      <div className="glass-morphism" style={{ width: '350px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--sidebar-bg)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Messages</h2>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--text-tertiary)" />
            <input type="text" placeholder="Search chats..." style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', fontSize: '0.9rem', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" color="var(--primary)" /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>No conversations yet.</p>
            </div>
          ) : (
            conversations.map(conv => {
              const partner = getPartner(conv);
              const isActive = activeConversation?.id === conv.id;
              return (
                <div 
                  key={conv.id} 
                  onClick={() => setActiveConversation(conv)}
                  style={{ 
                    padding: '1.25rem 1.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    cursor: 'pointer', 
                    borderBottom: '1px solid var(--border-color)',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: isActive ? 'white' : 'var(--primary)', color: isActive ? 'var(--primary)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0, overflow: 'hidden' }}>
                    {partner?.profile_pic_url ? <img src={partner.profile_pic_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : partner?.full_name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isActive ? 'white' : 'var(--text-primary)' }}>{partner?.full_name}</h4>
                      <span style={{ fontSize: '0.7rem', color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>{new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message || 'Start a conversation'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Active Chat Window */}
      {activeConversation ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', backdropFilter: 'blur(10px)' }}>
          {/* Top Bar */}
          <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden' }}>
                  {getPartner(activeConversation)?.profile_pic_url ? <img src={getPartner(activeConversation).profile_pic_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getPartner(activeConversation)?.full_name?.charAt(0)}
               </div>
               <div>
                 <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                    {getPartner(activeConversation)?.full_name} <CheckCircle2 size={16} color="var(--success)" />
                 </h3>
                 <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div> Online
                 </span>
               </div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setActiveConversation(null)}><X size={20} /></button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser?.id;
              return (
                <div 
                  key={msg.id || idx} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginBottom: '0.25rem'
                  }} 
                  className="animate-reveal"
                >
                  <div style={{ 
                    maxWidth: '75%', 
                    padding: '0.9rem 1.35rem', 
                    borderRadius: isMe ? '22px 22px 4px 22px' : '22px 22px 22px 4px', 
                    background: isMe ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' : 'var(--sidebar-bg)', 
                    color: isMe ? 'white' : 'var(--text-primary)',
                    boxShadow: isMe ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    position: 'relative',
                    border: isMe ? 'none' : '1px solid var(--border-color)',
                    transition: 'all var(--transition-smooth)'
                  }}>
                    {msg.content}
                    <div style={{ fontSize: '0.65rem', marginTop: '6px', opacity: 0.7, textAlign: isMe ? 'right' : 'left', fontWeight: 600 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
             <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><Paperclip size={20} /></button>
             <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message here..." 
              style={{ flex: 1, padding: '0.9rem 1.35rem', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }} 
             />
             <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
               Send <Send size={18} />
             </button>
          </form>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
           <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ width: '80px', height: '80px', background: 'var(--card-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                <MessageSquare size={36} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Select a chat to start messaging</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Choose a conversation from the list or contact a seller directly from their listing.</p>
           </div>
        </div>
      )}
    </div>
  );
}
