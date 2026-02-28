import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatHeader } from './chat-header';

// Mock Lucide icons to avoid SVG rendering complexity in tests
vi.mock('lucide-react', () => ({
  Hash: () => <div data-testid="icon-hash" />,
  User: () => <div data-testid="icon-user" />,
  Users: () => <div data-testid="icon-users" />,
  Settings: () => <div data-testid="icon-settings" />,
}));

describe('ChatHeader Component', () => {
  const mockUser = {
    id: 'user-123',
    user_metadata: {
      full_name: 'John Doe',
    },
  };

  const mockPublicRoom = {
    id: 'room-1',
    name: 'General Chat',
    is_private: false,
  };

  const mockPrivateRoom = {
    id: 'room-2',
    name: 'John Doe & Jane Smith',
    is_private: true,
  };

  it('renders public room name correctly', () => {
    render(
      <ChatHeader
        activeRoom={mockPublicRoom}
        onlineUsersCount={5}
        user={mockUser}
        showUsersPanel={false}
        showSettingsPanel={false}
        onToggleUsersPanel={vi.fn()}
        onToggleSettingsPanel={vi.fn()}
      />
    );

    expect(screen.getByText('General Chat')).toBeInTheDocument();
  });

  it('renders private room name correctly by showing only the other persons name', () => {
    render(
      <ChatHeader
        activeRoom={mockPrivateRoom}
        onlineUsersCount={5}
        user={mockUser}
        showUsersPanel={false}
        showSettingsPanel={false}
        onToggleUsersPanel={vi.fn()}
        onToggleSettingsPanel={vi.fn()}
      />
    );

    // It should omit "John Doe & " and just show "Jane Smith"
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders placeholder when no active room is selected', () => {
    render(
      <ChatHeader
        activeRoom={null}
        onlineUsersCount={0}
        user={null}
        showUsersPanel={false}
        showSettingsPanel={false}
        onToggleUsersPanel={vi.fn()}
        onToggleSettingsPanel={vi.fn()}
      />
    );

    expect(screen.getByText('Select a channel')).toBeInTheDocument();
  });

  it('calls panel toggle functions when buttons are clicked', () => {
    const toggleUsers = vi.fn();
    const toggleSettings = vi.fn();

    render(
      <ChatHeader
        activeRoom={mockPublicRoom}
        onlineUsersCount={5}
        user={mockUser}
        showUsersPanel={false}
        showSettingsPanel={false}
        onToggleUsersPanel={toggleUsers}
        onToggleSettingsPanel={toggleSettings}
      />
    );

    // Click the users button
    const usersButton = screen.getByTestId('icon-users').closest('button');
    if (usersButton) {
      fireEvent.click(usersButton);
      expect(toggleUsers).toHaveBeenCalledTimes(1);
    } else {
      throw new Error('Users button not found');
    }

    // Click the settings button
    const settingsButton = screen.getByTestId('icon-settings').closest('button');
    if (settingsButton) {
      fireEvent.click(settingsButton);
      expect(toggleSettings).toHaveBeenCalledTimes(1);
    } else {
      throw new Error('Settings button not found');
    }
  });
});
