import React from 'react';
import { StatsCard } from '../Card';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';

export function Dashboard() {
  return (
    <div className="space-y-8">
      <DashboardHeader />
      <StatsGrid />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

Dashboard.displayName = 'Dashboard';

function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's what's happening.</p>
      </div>
      <DashboardActions />
    </div>
  );
}

DashboardHeader.displayName = 'DashboardHeader';

function DashboardActions() {
  return (
    <div className="flex items-center gap-3">
      <button className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
        Export
      </button>
      <button className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all">
        + New Report
      </button>
    </div>
  );
}

DashboardActions.displayName = 'DashboardActions';

function StatsGrid() {
  const stats = [
    { title: 'Total Feedback', value: '2,847', change: '+12.5%', changeType: 'positive', icon: '💬' },
    { title: 'Open Issues', value: '156', change: '-8.2%', changeType: 'positive', icon: '🐛' },
    { title: 'Response Rate', value: '94.2%', change: '+2.1%', changeType: 'positive', icon: '⚡' },
    { title: 'Avg Resolution', value: '2.4 days', change: '-18%', changeType: 'positive', icon: '⏱️' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}

StatsGrid.displayName = 'StatsGrid';
