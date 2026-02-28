'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut, Send, User as UserIcon, Settings, Hash, Users, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRelative } from 'date-fns';
import DOMPurify from 'dompurify';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface Room {
  id: string;
  name: string;
}

interface PresenceState {
  user_id: string;
  full_name: string;
  is_typing: boolean;
  online_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Initial Fetch
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchRooms();
    };
    checkUser();
  }, [router]);

  const fetchRooms = async () => {
    const { data, error } = await supabase.from('rooms').select('*');
    if (data && data.length > 0) {
      setRooms(data);
      setActiveRoom(data[0]);
      fetchMessages(data[0].id);
    }
  };

  const fetchMessages = async (roomId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles(full_name, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    setLoading(false);
    scrollToBottom();
  };

  // Real-time Subscription (Messages & Presence)
  useEffect(() => {
    if (!activeRoom || !user) return;

    const channel = supabase.channel(`room:${activeRoom.id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${activeRoom.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((current) => [...current, data]);
            if (!showScrollButton) {
              scrollToBottom();
            }
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const active: Record<string, any> = {};
        const typing: Record<string, string> = {};

        Object.keys(state).forEach((key) => {
          const presence = state[key][0] as any;
          active[key] = presence;
          if (presence.is_typing && key !== user.id) {
            typing[key] = presence.full_name;
          }
        });

        setOnlineUsers(active);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            full_name: user.user_metadata.full_name,
            online_at: new Date().toISOString(),
            is_typing: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom, user]);

  const handleTyping = () => {
    if (!user || !activeRoom) return;

    const channel = supabase.channel(`room:${activeRoom.id}`);
    channel.track({
      user_id: user.id,
      full_name: user.user_metadata.full_name,
      online_at: new Date().toISOString(),
      is_typing: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({
        user_id: user.id,
        full_name: user.user_metadata.full_name,
        online_at: new Date().toISOString(),
        is_typing: false,
      });
    }, 3000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    const channel = supabase.channel(`room:${activeRoom.id}`);
      channel.track({
        user_id: user.id,
        full_name: user.user_metadata.full_name,
        online_at: new Date().toISOString(),
        is_typing: false,
    });

    const { error } = await supabase.from('messages').insert({
      content,
      room_id: activeRoom.id,
      user_id: user.id,
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-main)] text-[var(--color-text-primary)]">
      {/* Sidebar */}
      <aside className="w-64 glass-nav flex flex-col border-r border-white/5 z-20">
        <div className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Hash className="text-[var(--color-brand-primary)]" />
            Chatter
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-premium">
          <div className="mb-6">
            <p className="px-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Channels
            </p>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  setActiveRoom(room);
                  fetchMessages(room.id);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
                  activeRoom?.id === room.id 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white"
                )}
              >
                <Hash className="h-4 w-4 opacity-50" />
                <span className="font-medium">{room.name}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="px-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Online — {Object.keys(onlineUsers).length}
            </p>
            {Object.values(onlineUsers).map((u: any) => (
              <div key={u.user_id} className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-green-500 absolute -right-0.5 -bottom-0.5 border border-[var(--color-bg-main)]" />
                  <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold">
                    {u.full_name?.[0]}
                  </div>
                </div>
                <span className="truncate">{u.full_name}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {user?.user_metadata?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.05),transparent_50%)]">
        {/* Chat Header */}
        <header className="h-16 flex items-center justify-between px-6 glass-nav border-b border-white/5 z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Hash className="h-4 w-4 text-[var(--color-brand-primary)]" />
            </div>
            <div>
              <h1 className="font-bold">{activeRoom?.name || 'Loading...'}</h1>
              <p className="text-xs text-[var(--color-text-accent)] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                {Object.keys(onlineUsers).length} active now
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Users className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Settings className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        </header>

        {/* Message List */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-premium"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-brand-primary)]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] italic">
              <Send className="h-12 w-12 mb-4 opacity-10" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.user_id === user?.id;
              const cleanContent = DOMPurify.sanitize(msg.content);
              
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex gap-4 animate-fade-in group/item",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 overflow-hidden flex items-center justify-center group-hover/item:border-[var(--color-brand-primary)]/30 transition-colors">
                      {msg.profiles?.avatar_url ? (
                        <img src={msg.profiles.avatar_url} alt={msg.profiles.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-bold text-[var(--color-text-secondary)]">
                          {msg.profiles?.full_name?.[0] || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-sm font-bold">{msg.profiles?.full_name || 'Anonymous'}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                        {formatRelative(new Date(msg.created_at), new Date())}
                      </span>
                    </div>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[0.95rem] leading-relaxed shadow-sm transition-all",
                      isOwn 
                        ? "bg-[var(--brand-gradient)] text-white rounded-tr-none hover:shadow-lg hover:shadow-indigo-500/20" 
                        : "bg-white/5 border border-white/5 rounded-tl-none hover:bg-white/10"
                    )}>
                      <p dangerouslySetInnerHTML={{ __html: cleanContent }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-32 right-8 p-3 rounded-full bg-[var(--color-brand-primary)] text-white shadow-2xl animate-bounce hover:scale-110 transition-transform active:scale-95 z-20"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}

        {/* Typing and Message Input */}
        <div className="p-6 pt-0 bg-transparent z-10">
          <div className="h-6 mb-2">
            {Object.keys(typingUsers).length > 0 && (
              <div className="text-xs text-[var(--color-text-muted)] italic transition-all flex items-center gap-2 ml-2">
                <div className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" />
                  <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:0.4s]" />
                </div>
                {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
          </div>
          
          <form 
            onSubmit={sendMessage}
            className="relative flex items-center p-2 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-3xl shadow-2xl focus-within:border-[var(--color-brand-primary)]/50 transition-all"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder={`Message #${activeRoom?.name || 'channel'}`}
              className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-white placeholder:text-[var(--color-text-muted)]"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="h-10 w-10 premium-button !p-0 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Send className="h-5 w-5 transition-transform group-hover:rotate-12" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
