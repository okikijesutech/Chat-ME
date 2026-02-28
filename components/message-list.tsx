import { Hash, Send } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageItem } from './message-item';
import { cn } from '../lib/utils';
import { useRef, useEffect } from 'react';
import { Message, Room } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  activeRoom: Room | null;
  loading: boolean;
  user: any;
  hasNoChannels: boolean;
  onCreateChannelClick: () => void;
}

export function MessageList({
  messages,
  activeRoom,
  loading,
  user,
  hasNoChannels,
  onCreateChannelClick,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Auto-scroll logic for new messages when at bottom
  useEffect(() => {
    if (messages.length > 0 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: messages.length - 1,
          align: 'end',
          behavior: 'auto'
        });
    }
  }, [messages.length]);

  return (
    <div 
      className="flex-1 overflow-hidden p-0 m-0 flex flex-col pt-6"
    >
      {!activeRoom ? (
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] italic">
          <Hash className="h-12 w-12 mb-4 opacity-10" />
          <p>Welcome! Create a new channel or select an existing one.</p>
          {hasNoChannels && (
            <button 
              onClick={onCreateChannelClick}
              className="mt-4 premium-button !py-2 !px-4 text-sm"
            >
              Create Channel
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-brand-primary)]" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-[var(--color-text-muted)] italic">
          <Send className="h-12 w-12 mb-4 opacity-10" />
          <p>No messages yet here. Be the first!</p>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          className="scrollbar-premium !h-full w-full"
          data={messages}
          initialTopMostItemIndex={messages.length - 1} // Start at the bottom
          itemContent={(index, msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div className="px-6 pb-6">
                <MessageItem key={msg.id} msg={msg} isOwn={isOwn} idx={index} />
              </div>
            );
          }}
          alignToBottom={true}
          followOutput="smooth"
        />
      )}
    </div>
  );
}
