import React from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../Card';

const QUICK_ACTIONS = [
  { id: 'new-feedback', icon: '📝', label: 'Submit Feedback', description: 'Report a bug or request a feature', color: 'from-blue-500 to-cyan-500' },
  { id: 'view-reports', icon: '📊', label: 'View Reports', description: 'Analytics and insights', color: 'from-purple-500 to-pink-500' },
  { id: 'team-settings', icon: '⚙️', label: 'Team Settings', description: 'Manage your team', color: 'from-amber-500 to-orange-500' },
  { id: 'integrations', icon: '🔗', label: 'Integrations', description: 'Connect your tools', color: 'from-green-500 to-emerald-500' },
];

export function QuickActions() {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle subtitle="Shortcuts to common tasks">Quick Actions</CardTitle>
      </CardHeader>
      <CardBody className="p-4">
        <ActionGrid actions={QUICK_ACTIONS} />
      </CardBody>
    </Card>
  );
}

QuickActions.displayName = 'QuickActions';

function ActionGrid({ actions }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}
    </div>
  );
}

ActionGrid.displayName = 'ActionGrid';

function ActionCard({ action }) {
  return (
    <button
      onClick={() => console.log(`Action clicked: ${action.id}`)}
      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group text-left"
    >
      <ActionIcon icon={action.icon} color={action.color} />
      <ActionLabel label={action.label} />
      <ActionDescription description={action.description} />
    </button>
  );
}

ActionCard.displayName = 'ActionCard';

function ActionIcon({ icon, color }) {
  return (
    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
      {icon}
    </div>
  );
}

ActionIcon.displayName = 'ActionIcon';

function ActionLabel({ label }) {
  return (
    <p className="font-semibold text-gray-900 dark:text-white text-sm">
      {label}
    </p>
  );
}

ActionLabel.displayName = 'ActionLabel';

function ActionDescription({ description }) {
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
      {description}
    </p>
  );
}

ActionDescription.displayName = 'ActionDescription';
