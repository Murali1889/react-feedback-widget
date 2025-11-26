import React from 'react';
import { Navigation } from './Navigation';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

export function Header({ title, user, onLogout }) {
  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            <Logo />
            <Navigation />
          </div>
          <div className="flex items-center gap-4">
            <SearchBar />
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}

Header.displayName = 'Header';

function SearchBar() {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search..."
        className="w-64 px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}

SearchBar.displayName = 'SearchBar';
