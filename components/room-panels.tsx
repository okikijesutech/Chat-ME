import { Settings, Users, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Room } from '../types/chat';

interface RoomPanelsProps {
  showUsersPanel: boolean;
  showSettingsPanel: boolean;
  activeRoom: Room | null;
  onlineUsers: Record<string, any>;
  user: any;
  onCloseUsersPanel: () => void;
  onCloseSettingsPanel: () => void;
  onCreatePrivateChat: (userId: string, userName: string) => void;
}

export function RoomPanels({
  showUsersPanel,
  showSettingsPanel,
  activeRoom,
  onlineUsers,
  user,
  onCloseUsersPanel,
  onCloseSettingsPanel,
  onCreatePrivateChat,
}: RoomPanelsProps) {
  if (!showUsersPanel && !showSettingsPanel) return null;

  return (
    <div className="w-64 border-l border-white/5 bg-black/20 glass-nav h-full animate-fade-in flex flex-col hidden md:flex">
      {showUsersPanel && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--color-brand-primary)]" />
              Room Members
            </h3>
            <button onClick={onCloseUsersPanel} className="p-1 hover:bg-white/10 rounded-md text-[var(--color-text-muted)] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {Object.values(onlineUsers).map((u: any) => (
              <button 
                key={u.user_id} 
                onClick={() => {
                  if (u.user_id !== user?.id) {
                    onCreatePrivateChat(u.user_id, u.full_name);
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
            <button onClick={onCloseSettingsPanel} className="p-1 hover:bg-white/10 rounded-md text-[var(--color-text-muted)] hover:text-white transition-colors">
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
  );
}
