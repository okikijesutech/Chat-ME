'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

import { Message, Room } from '../../types/chat';
import { ChatSidebar } from '../../components/chat-sidebar';
import { ChatHeader } from '../../components/chat-header';
import { MessageList } from '../../components/message-list';
import { RoomPanels } from '../../components/room-panels';
import { MessageInput } from '../../components/message-input';
import { ChevronDown } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
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
    const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setRooms(data);
      if (!activeRoom) {
        const firstPublic = data.find((r: Room) => !r.is_private) || data[0];
        setActiveRoom(firstPublic);
        fetchMessages(firstPublic.id);
      }
    } else {
      setLoading(false);
    }
  };

  const handleCreatePrivateChat = async (otherUserId: string, otherUserName: string) => {
    if (!user) return;
    
    const existingRoom = rooms.find(r => 
      r.is_private && 
      ((r.user_id_1 === user.id && r.user_id_2 === otherUserId) || 
       (r.user_id_1 === otherUserId && r.user_id_2 === user.id))
    );

    if (existingRoom) {
      setActiveRoom(existingRoom);
      fetchMessages(existingRoom.id);
      if (window.innerWidth < 768) setShowUsersPanel(false);
      return;
    }

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
      if (window.innerWidth < 768) setShowUsersPanel(false);
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
  };

  // Real-time Subscription (Messages & Presence)
  useEffect(() => {
    if (!activeRoom || !user) return;

    const channel = supabase.channel(`room:${activeRoom.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoom.id}` },
        async (payload: any) => {
          setMessages((current) => {
            const isDuplicate = current.some(
              (m) => m.content === payload.new.content && m.user_id === payload.new.user_id
            );
            if (isDuplicate) return current;

            supabase
              .from('messages')
              .select('*, profiles(full_name, avatar_url)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }: { data: any }) => {
                if (data) {
                  setMessages((prev) => {
                    if (prev.some(m => m.id === data.id || (m.content === data.content && m.user_id === data.user_id))) {
                       return prev;
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
          if (presence.is_typing && key !== user.id) typing[key] = presence.full_name;
        });

        setOnlineUsers(active);
        setTypingUsers(typing);
      })
      .subscribe(async (status: string) => {
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

    const channel = supabase.channel(`room:${activeRoom.id}`);
    channel.track({
      user_id: user.id,
      full_name: user.user_metadata.full_name,
      online_at: new Date().toISOString(),
      is_typing: false,
    });

    const tempMessage: Message = {
      id: crypto.randomUUID(),
      content: content,
      created_at: new Date().toISOString(),
      user_id: user.id,
      profiles: {
        full_name: user.user_metadata?.full_name || 'Me',
        avatar_url: user.user_metadata?.avatar_url || '',
      }
    };
    
    setMessages(prev => [...prev, tempMessage]);

    const { error } = await supabase.from('messages').insert({
      content,
      room_id: activeRoom.id,
      user_id: user.id,
    });

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      alert('Failed to send message: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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

      {/* Extracted Sidebar */}
      <ChatSidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onlineUsers={onlineUsers}
        user={user}
        onRoomSelect={(room) => {
          setActiveRoom(room);
          fetchMessages(room.id);
          if (window.innerWidth < 768) {
            setShowUsersPanel(false);
            setShowSettingsPanel(false);
          }
        }}
        onLogout={handleLogout}
        onCreateChannelClick={() => setIsCreatingChannel(true)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.05),transparent_50%)]">
        {/* Extracted Header */}
        <ChatHeader
          activeRoom={activeRoom}
          onlineUsersCount={Object.keys(onlineUsers).length}
          user={user}
          showUsersPanel={showUsersPanel}
          showSettingsPanel={showSettingsPanel}
          onToggleUsersPanel={() => {
            setShowUsersPanel(!showUsersPanel);
            setShowSettingsPanel(false);
          }}
          onToggleSettingsPanel={() => {
            setShowSettingsPanel(!showSettingsPanel);
            setShowUsersPanel(false);
          }}
        />

        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Extracted Message List (The scrollable middle section) */}
          <MessageList
            messages={messages}
            activeRoom={activeRoom}
            loading={loading}
            user={user}
            hasNoChannels={rooms.filter(r => !r.is_private).length === 0}
            onCreateChannelClick={() => setIsCreatingChannel(true)}
          />

          {/* Extracted Side Panels */}
          <RoomPanels
            showUsersPanel={showUsersPanel}
            showSettingsPanel={showSettingsPanel}
            activeRoom={activeRoom}
            onlineUsers={onlineUsers}
            user={user}
            onCloseUsersPanel={() => setShowUsersPanel(false)}
            onCloseSettingsPanel={() => setShowSettingsPanel(false)}
            onCreatePrivateChat={handleCreatePrivateChat}
          />

        </div>

        {/* Extracted Message Input */}
        <MessageInput
          activeRoom={activeRoom}
          newMessage={newMessage}
          typingUsers={typingUsers}
          onMessageChange={(val: string) => {
            setNewMessage(val);
            handleTyping();
          }}
          onSendMessage={sendMessage}
        />
      </main>
    </div>
  );
}
