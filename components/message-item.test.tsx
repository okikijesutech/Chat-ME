import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from './message-item';

describe('MessageItem Component', () => {
  const mockMessage = {
    id: 'msg-1',
    content: 'Hello, world! <script>alert("XSS")</script>',
    created_at: new Date('2024-01-01T12:00:00Z').toISOString(),
    user_id: 'user-1',
    room_id: 'room-1',
    profiles: {
      full_name: 'John Doe',
      avatar_url: '',
    },
  };

  it('renders message content correctly and sanitizes input', () => {
    render(<MessageItem msg={mockMessage} isOwn={false} idx={0} />);
    
    // The basic text should be visible
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    
    // The script tag should be sanitized away by DOMPurify
    const container = screen.getByText('Hello, world!').parentElement;
    expect(container?.innerHTML).not.toContain('<script>');
  });

  it('renders the correct user name', () => {
    render(<MessageItem msg={mockMessage} isOwn={false} idx={0} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders a fallback avatar when no avatar_url is provided', () => {
    render(<MessageItem msg={mockMessage} isOwn={false} idx={0} />);
    // Avatar fallback is the first letter of the name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('applies explicit styling classes to "own" messages', () => {
    render(<MessageItem msg={mockMessage} isOwn={true} idx={0} />);
    
    // The container for the message text should have the specific gradient background class
    const messageContainer = screen.getByText('Hello, world!').closest('div');
    expect(messageContainer).toHaveClass('bg-[var(--brand-gradient)]');
    expect(messageContainer).toHaveClass('text-white');
  });

  it('applies alternate styling classes to "other" messages', () => {
    render(<MessageItem msg={mockMessage} isOwn={false} idx={0} />);
    
    // The container should have the alternate styling
    const messageContainer = screen.getByText('Hello, world!').closest('div');
    expect(messageContainer).toHaveClass('bg-white/5');
    // Ensure it doesn't have the "own" classes
    expect(messageContainer).not.toHaveClass('bg-[var(--brand-gradient)]');
  });
});
