import React from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../Card';

const ACTIVITIES = [
  { id: 1, user: 'Alice Chen', action: 'submitted feedback', target: 'Login Page', time: '5 min ago', avatar: '👩‍💻', type: 'feedback' },
  { id: 2, user: 'Bob Smith', action: 'resolved bug', target: '#BUG-1234', time: '12 min ago', avatar: '👨‍🔧', type: 'resolved' },
  { id: 3, user: 'Carol Davis', action: 'commented on', target: 'Mobile Navigation', time: '1 hour ago', avatar: '👩‍🎨', type: 'comment' },
  { id: 4, user: 'David Wilson', action: 'updated status', target: '#BUG-1198', time: '2 hours ago', avatar: '👨‍💼', type: 'update' },
  { id: 5, user: 'Eva Martinez', action: 'submitted feedback', target: 'Checkout Flow', time: '3 hours ago', avatar: '👩‍🚀', type: 'feedback' },
];

export function RecentActivity() {
  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle subtitle="Latest updates from your team">Recent Activity</CardTitle>
          <ViewAllButton />
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <ActivityList activities={ACTIVITIES} />
      </CardBody>
    </Card>
  );
}

RecentActivity.displayName = 'RecentActivity';

function ViewAllButton() {
  return (
    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
      View all →
    </button>
  );
}

ViewAllButton.displayName = 'ViewAllButton';

function ActivityList({ activities }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

ActivityList.displayName = 'ActivityList';

function ActivityItem({ activity }) {
  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start gap-4">
        <ActivityAvatar avatar={activity.avatar} />
        <ActivityContent activity={activity} />
        <ActivityTime time={activity.time} />
      </div>
    </div>
  );
}

ActivityItem.displayName = 'ActivityItem';

function ActivityAvatar({ avatar }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-lg flex-shrink-0">
      {avatar}
    </div>
  );
}

ActivityAvatar.displayName = 'ActivityAvatar';

function ActivityContent({ activity }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-900 dark:text-white">
        <span className="font-semibold">{activity.user}</span>
        {' '}{activity.action}{' '}
        <span className="font-medium text-indigo-600 dark:text-indigo-400">{activity.target}</span>
      </p>
      <ActivityBadge type={activity.type} />
    </div>
  );
}

ActivityContent.displayName = 'ActivityContent';

function ActivityBadge({ type }) {
  const badges = {
    feedback: { label: 'Feedback', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    comment: { label: 'Comment', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
    update: { label: 'Update', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  };

  const badge = badges[type] || badges.feedback;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${badge.color}`}>
      {badge.label}
    </span>
  );
}

ActivityBadge.displayName = 'ActivityBadge';

function ActivityTime({ time }) {
  return (
    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
      {time}
    </span>
  );
}

ActivityTime.displayName = 'ActivityTime';
