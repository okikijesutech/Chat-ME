import React, { memo } from 'react';
import { formatRelative } from 'date-fns';
import DOMPurify from 'dompurify';
import { cn } from '../lib/utils';
import { Message } from '../types/chat';

interface MessageItemProps {
  msg: Message;
  isOwn: boolean;
  idx: number;
}

const MessageItemComponent = ({ msg, isOwn, idx }: MessageItemProps) => {
  const cleanContent = DOMPurify.sanitize(msg.content);

  return (
    <div 
      className={cn(
        "flex gap-4 animate-fade-in group/item",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
      style={{ animationDelay: `${Math.min(idx * 10, 500)}ms` }}
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
};

// Use memo to prevent re-rendering when parent state changes (e.g. typing indicators or unrelated new messages)
// We provide a custom comparison function because Message objects might be re-created but have identical content
export const MessageItem = memo(MessageItemComponent, (prevProps, nextProps) => {
  // A message is considered visually identical if its ID, content, and the own-status remain exactly the same.
  // We ignore other top-level object references to ensure strict value equality check instead of reference check.
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.created_at === nextProps.msg.created_at &&
    prevProps.isOwn === nextProps.isOwn
  );
});
