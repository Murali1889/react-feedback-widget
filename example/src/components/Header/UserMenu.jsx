import React, { useState } from 'react';

export function UserMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <UserAvatar
        user={user}
        onClick={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <DropdownMenu onClose={() => setIsOpen(false)} onLogout={onLogout} />
      )}
    </div>
  );
}

UserMenu.displayName = 'UserMenu';

function UserAvatar({ user, onClick }) {
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
    >
      <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
        {initials}
      </div>
      <div className="hidden lg:block text-left">
        <p className="text-sm font-medium">{user?.name || 'User'}</p>
        <p className="text-xs text-white/60">{user?.role || 'Member'}</p>
      </div>
      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

UserAvatar.displayName = 'UserAvatar';

function DropdownMenu({ onClose, onLogout }) {
  const menuItems = [
    { icon: '👤', label: 'Profile', action: () => console.log('Profile clicked') },
    { icon: '⚙️', label: 'Settings', action: () => console.log('Settings clicked') },
    { icon: '🔔', label: 'Notifications', action: () => console.log('Notifications clicked') },
    { icon: '🚪', label: 'Logout', action: onLogout },
  ];

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-20 animate-in fade-in slide-in-from-top-2">
        {menuItems.map((item, index) => (
          <DropdownMenuItem key={index} item={item} onClose={onClose} />
        ))}
      </div>
    </>
  );
}

DropdownMenu.displayName = 'DropdownMenu';

function DropdownMenuItem({ item, onClose }) {
  return (
    <button
      onClick={() => {
        item.action();
        onClose();
      }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

DropdownMenuItem.displayName = 'DropdownMenuItem';
