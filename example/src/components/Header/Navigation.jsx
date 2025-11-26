import React, { useState } from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'feedback', label: 'Feedback', icon: '💬' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
];

export function Navigation() {
  const [activeItem, setActiveItem] = useState('dashboard');

  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          isActive={activeItem === item.id}
          onClick={() => setActiveItem(item.id)}
        />
      ))}
    </nav>
  );
}

Navigation.displayName = 'Navigation';

function NavItem({ item, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
        ${isActive
          ? 'bg-white/20 text-white shadow-lg'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

NavItem.displayName = 'NavItem';
