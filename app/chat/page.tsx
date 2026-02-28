'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut, Send, User as UserIcon, Settings, Hash, Users, ChevronDown, X } from 'lucide-react';
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
  is_private?: boolean;
  user_id_1?: string;
  user_id_2?: string;
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

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

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
    // We fetch all rooms we have access to (RLS handles filtering out unauthorized private rooms)
    const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setRooms(data);
      if (!activeRoom) {
        // Default to the first public room
        const firstPublic = data.find(r => !r.is_private) || data[0];
        setActiveRoom(firstPublic);
        fetchMessages(firstPublic.id);
      }
    } else {
      setLoading(false);
    }
  };

  const handleCreatePrivateChat = async (otherUserId: string, otherUserName: string) => {
    if (!user) return;
    
    // Check if DM room already exists between these two users
    const existingRoom = rooms.find(r => 
      r.is_private && 
      ((r.user_id_1 === user.id && r.user_id_2 === otherUserId) || 
       (r.user_id_1 === otherUserId && r.user_id_2 === user.id))
    );

    if (existingRoom) {
      setActiveRoom(existingRoom);
      fetchMessages(existingRoom.id);
      if (window.innerWidth < 768) {
        setShowUsersPanel(false);
      }
      return;
    }

    // Create a new private room
    const roomName = `${user.user_metadata.full_name} & ${otherUserName}`;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ 
        name: roomName, 
        is_private: true, 
        user_id_1: user.id, 
        user_id_2: otherUserId 
      }])
      .select();

    if (error) {
      console.error('Error creating private chat:', error);
      alert('Failed to create private chat.');
    } else if (data) {
      setRooms(prev => [...prev, data[0]]);
      setActiveRoom(data[0]);
      fetchMessages(data[0].id);
      if (window.innerWidth < 768) {
        setShowUsersPanel(false);
      }
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name: newChannelName.trim() }])
      .select();

    if (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel. Make sure you ran the SQL policy command!');
    } else if (data) {
      setRooms(prev => [...prev, data[0]]);
      setActiveRoom(data[0]);
      fetchMessages(data[0].id);
      setIsCreatingChannel(false);
      setNewChannelName('');
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
          // Check if we already have this message (e.g., from an optimistic update)
          // We can't check by ID because optimistic updates use temp IDs,
          // but we can check by content and proximity in time.
          // For simplicity, we'll just check if the exact content was recently added by this user.
          
          setMessages((current) => {
            const isDuplicate = current.some(
              (m) => m.content === payload.new.content && m.user_id === payload.new.user_id
            );
            
            if (isDuplicate) return current;

            // Fetch the full message with profile data only if we don't already have it
            supabase
              .from('messages')
              .select('*, profiles(full_name, avatar_url)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setMessages((prev) => {
                    // Double check again just before inserting to be strictly safe
                    if (prev.some(m => m.id === data.id || (m.content === data.content && m.user_id === data.user_id))) {
                       return prev;
                    }
                    if (!showScrollButton) {
                      scrollToBottom();
                    }
                    return [...prev, data];
                  });
                }
              });

            return current;
          });
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

    // Optimistic Update: instantly show message in UI
    const tempMessage: Message = {
      id: crypto.randomUUID(), // temp ID
      content: content,
      created_at: new Date().toISOString(),
      user_id: user.id,
      profiles: {
        full_name: user.user_metadata?.full_name || 'Me',
        avatar_url: user.user_metadata?.avatar_url || '',
      }
    };
    
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    const { error } = await supabase.from('messages').insert({
      content,
      room_id: activeRoom.id,
      user_id: user.id,
    });

    if (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      alert('Failed to send message: ' + error.message);
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
    <div className="flex h-screen bg-[var(--color-bg-main)] text-[var(--color-text-primary)] relative">
      
      {/* Create Channel Modal */}
      {isCreatingChannel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="premium-card p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4 text-white">Create New Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. general, frontend-devs"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="w-full premium-input mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingChannel(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim()}
                  className="premium-button text-sm !px-4 !py-2"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 glass-nav flex flex-col border-r border-white/5 z-20">
        <div className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Hash className="text-[var(--color-brand-primary)]" />
            Chatter
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-premium">
          {/* Public Channels */}
          <div className="mb-6">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Channels
              </p>
              <button 
                onClick={() => setIsCreatingChannel(true)}
                className="text-xs text-[var(--color-brand-primary)] hover:text-white transition-colors"
              >
                + Add
              </button>
            </div>
            {rooms.filter(r => !r.is_private).length === 0 && (
              <p className="px-2 text-sm text-[var(--color-text-muted)] italic">No channels yet.</p>
            )}
            {rooms.filter(r => !r.is_private).map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  setActiveRoom(room);
                  fetchMessages(room.id);
                  if (window.innerWidth < 768) {
                    setShowUsersPanel(false);
                    setShowSettingsPanel(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
                  activeRoom?.id === room.id 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white"
                )}
              >
                <Hash className="h-4 w-4 opacity-50 flex-shrink-0" />
                <span className="font-medium truncate">{room.name}</span>
              </button>
            ))}
          </div>

          {/* Direct Messages */}
          <div className="mb-6">
            <p className="px-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Direct Messages
            </p>
            {rooms.filter(r => r.is_private).length === 0 && (
              <p className="px-2 text-sm text-[var(--color-text-muted)] italic">No private chats yet.</p>
            )}
            {rooms.filter(r => r.is_private).map((room) => {
              // For DMs, show the name of the *other* person. 
              // We'll roughly parse it from the combined name, or just show the full name.
              const parts = room.name.split(' & ');
              const displayName = parts.find(p => p !== user?.user_metadata?.full_name) || room.name;

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room);
                    fetchMessages(room.id);
                    if (window.innerWidth < 768) {
                      setShowUsersPanel(false);
                      setShowSettingsPanel(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
                    activeRoom?.id === room.id 
                      ? "bg-white/10 text-white shadow-lg" 
                      : "text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-[8px] font-bold border border-white/5 flex-shrink-0">
                    {displayName[0]}
                  </div>
                  <span className="font-medium truncate">{displayName}</span>
                </button>
              );
            })}
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
              {activeRoom?.is_private ? (
                <UserIcon className="h-4 w-4 text-purple-400" />
              ) : (
                <Hash className="h-4 w-4 text-[var(--color-brand-primary)]" />
              )}
            </div>
            <div>
              <h1 className="font-bold">
                {activeRoom?.is_private 
                  ? (activeRoom.name.split(' & ').find(p => p !== user?.user_metadata?.full_name) || activeRoom.name)
                  : (activeRoom?.name || 'Select a channel')
                }
              </h1>
              {activeRoom && (
                <p className="text-xs text-[var(--color-text-accent)] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  {Object.keys(onlineUsers).length} active now
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setShowUsersPanel(!showUsersPanel);
                setShowSettingsPanel(false);
              }}
              className={cn("p-2 rounded-lg transition-colors", showUsersPanel ? "bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)]" : "hover:bg-white/5 text-[var(--color-text-secondary)]")}
              title="Toggle Users"
            >
              <Users className="h-5 w-5" />
            </button>
            <button 
              onClick={() => {
                setShowSettingsPanel(!showSettingsPanel);
                setShowUsersPanel(false);
              }}
              className={cn("p-2 rounded-lg transition-colors", showSettingsPanel ? "bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)]" : "hover:bg-white/5 text-[var(--color-text-secondary)]")}
              title="Chat Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Panels Layout Sequence */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Messages Area */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-premium flex flex-col"
          >
            {!activeRoom ? (
               <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] italic">
                <Hash className="h-12 w-12 mb-4 opacity-10" />
                <p>Welcome! Create a new channel or select an existing one.</p>
                <button 
                  onClick={() => setIsCreatingChannel(true)}
                  className="mt-4 premium-button !py-2 !px-4 text-sm"
                >
                  Create Channel
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-brand-primary)]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-[var(--color-text-muted)] italic">
                <Send className="h-12 w-12 mb-4 opacity-10" />
                <p>No messages yet in #{activeRoom.name}. Be the first!</p>
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
                    style={{ animationDelay: `${idx * 10}ms` }}
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
                    
                    <div className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-sm font-bold">{msg.profiles?.full_name || 'Anonymous'}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                          {formatRelative(new Date(msg.created_at), new Date())}
                        </span>
                      </div>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-[0.95rem] leading-relaxed shadow-sm transition-all break-words",
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
            <div ref={messagesEndRef} className="mt-4" />
          </div>

          {/* Right Side Panels (Users or Settings Toggle) */}
          {(showUsersPanel || showSettingsPanel) && (
             <div className="w-64 border-l border-white/5 bg-black/20 glass-nav h-full animate-fade-in flex flex-col hidden md:flex">
               {showUsersPanel && (
                 <div className="p-4">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold flex items-center gap-2">
                       <Users className="h-4 w-4 text-[var(--color-brand-primary)]" />
                       Room Members
                     </h3>
                     <button onClick={() => setShowUsersPanel(false)} className="p-1 hover:bg-white/10 rounded-md text-[var(--color-text-muted)] hover:text-white transition-colors">
                       <X className="h-4 w-4" />
                     </button>
                   </div>
                   <div className="space-y-3">
                       {Object.values(onlineUsers).map((u: any) => (
                        <button 
                          key={u.user_id} 
                          onClick={() => {
                            if (u.user_id !== user?.id) {
                              handleCreatePrivateChat(u.user_id, u.full_name);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left",
                            u.user_id === user?.id 
                              ? "cursor-default opacity-70" 
                              : "hover:bg-white/5 group"
                          )}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-green-500 absolute -right-0.5 -bottom-0.5" />
                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs group-hover:border-[var(--color-brand-primary)]/50 border border-transparent transition-colors">
                              {u.full_name?.[0]}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name} {u.user_id === user?.id && '(You)'}</p>
                            <p className="text-xs text-[var(--color-text-muted)] truncate">Online</p>
                          </div>
                        </button>
                      ))}
                   </div>
                 </div>
               )}

               {showSettingsPanel && (
                 <div className="p-4">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold flex items-center gap-2">
                       <Settings className="h-4 w-4 text-[var(--color-brand-primary)]" />
                       Room Settings
                     </h3>
                     <button onClick={() => setShowSettingsPanel(false)} className="p-1 hover:bg-white/10 rounded-md text-[var(--color-text-muted)] hover:text-white transition-colors">
                       <X className="h-4 w-4" />
                     </button>
                   </div>
                   {activeRoom ? (
                     <div className="space-y-4">
                       <div>
                         <label className="text-xs text-[var(--color-text-muted)] block mb-1">Room Name</label>
                         <p className="font-medium bg-white/5 rounded-lg p-2 text-sm">{activeRoom.name}</p>
                       </div>
                       <div>
                         <label className="text-xs text-[var(--color-text-muted)] block mb-1">Room ID</label>
                         <p className="font-mono text-xs bg-white/5 rounded-lg p-2 text-[var(--color-text-secondary)] break-all select-all">
                           {activeRoom.id}
                         </p>
                       </div>
                       <div className="pt-4 border-t border-white/5">
                         <p className="text-xs text-[var(--color-text-muted)] mb-2">Private messaging is coming soon.</p>
                       </div>
                     </div>
                   ) : (
                     <p className="text-sm text-[var(--color-text-muted)]">Select a room first.</p>
                   )}
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && activeRoom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-8 p-3 rounded-full bg-[var(--color-brand-primary)] text-white shadow-2xl animate-bounce hover:scale-110 transition-transform active:scale-95 z-20"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}

        {/* Typing and Message Input */}
        {activeRoom && (
          <div className="p-6 pt-2 bg-transparent z-10">
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
              className="relative flex items-center p-2 bg-[var(--color-bg-card)] border border-white/10 rounded-2xl backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] focus-within:border-[var(--color-brand-primary)]/50 transition-all"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={`Message #${activeRoom.name}`}
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
        )}
      </main>
    </div>
  );
}
