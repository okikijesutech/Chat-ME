import { LogOut, Hash } from 'lucide-react';
import { cn } from '../lib/utils';
import { Room } from '../types/chat';

interface ChatSidebarProps {
  rooms: Room[];
  activeRoom: Room | null;
  onlineUsers: Record<string, any>;
  user: any;
  onRoomSelect: (room: Room) => void;
  onLogout: () => void;
  onCreateChannelClick: () => void;
}

export function ChatSidebar({
  rooms,
  activeRoom,
  onlineUsers,
  user,
  onRoomSelect,
  onLogout,
  onCreateChannelClick,
}: ChatSidebarProps) {
  return (
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
              onClick={onCreateChannelClick}
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
              onClick={() => onRoomSelect(room)}
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
            const parts = room.name.split(' & ');
            const displayName = parts.find(p => p !== user?.user_metadata?.full_name) || room.name;

            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room)}
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

        {/* Online Users Preview */}
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

      {/* User Profile / Logout */}
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
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </aside>
  );
}
