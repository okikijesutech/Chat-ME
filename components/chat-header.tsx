import { Hash, User as UserIcon, Users, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { Room } from '../types/chat';

interface ChatHeaderProps {
  activeRoom: Room | null;
  onlineUsersCount: number;
  user: any;
  showUsersPanel: boolean;
  showSettingsPanel: boolean;
  onToggleUsersPanel: () => void;
  onToggleSettingsPanel: () => void;
}

export function ChatHeader({
  activeRoom,
  onlineUsersCount,
  user,
  showUsersPanel,
  showSettingsPanel,
  onToggleUsersPanel,
  onToggleSettingsPanel,
}: ChatHeaderProps) {
  const getRoomName = () => {
    if (!activeRoom) return 'Select a channel';
    if (activeRoom.is_private) {
      return activeRoom.name.split(' & ').find(p => p !== user?.user_metadata?.full_name) || activeRoom.name;
    }
    return activeRoom.name;
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 glass-nav border-b border-white/5 z-10 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
          {activeRoom?.is_private ? (
            <UserIcon className="h-4 w-4 text-purple-400" />
          ) : (
            <Hash className="h-4 w-4 text-[var(--color-brand-primary)]" />
          )}
        </div>
        <div>
          <h1 className="font-bold">{getRoomName()}</h1>
          {activeRoom && (
            <p className="text-xs text-[var(--color-text-accent)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              {onlineUsersCount} active now
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleUsersPanel}
          className={cn(
            "p-2 rounded-lg transition-colors", 
            showUsersPanel ? "bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)]" : "hover:bg-white/5 text-[var(--color-text-secondary)]"
          )}
          title="Toggle Users"
        >
          <Users className="h-5 w-5" />
        </button>
        <button 
          onClick={onToggleSettingsPanel}
          className={cn(
            "p-2 rounded-lg transition-colors", 
            showSettingsPanel ? "bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)]" : "hover:bg-white/5 text-[var(--color-text-secondary)]"
          )}
          title="Chat Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
