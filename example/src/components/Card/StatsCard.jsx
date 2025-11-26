import React from 'react';
import { Card, CardBody } from './Card';

export function StatsCard({ title, value, change, changeType = 'positive', icon }) {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <Card variant="elevated" className="hover:shadow-2xl">
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <StatValue value={value} />
            {change && (
              <StatChange change={change} type={changeType} />
            )}
          </div>
          {icon && (
            <StatIcon icon={icon} />
          )}
        </div>
      </CardBody>
    </Card>
  );
}

StatsCard.displayName = 'StatsCard';

function StatValue({ value }) {
  return (
    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
      {value}
    </p>
  );
}

StatValue.displayName = 'StatValue';

function StatChange({ change, type }) {
  const colors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const icons = {
    positive: '↑',
    negative: '↓',
    neutral: '→',
  };

  return (
    <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${colors[type]}`}>
      <span>{icons[type]}</span>
      <span>{change}</span>
      <span className="text-gray-400 font-normal">vs last month</span>
    </div>
  );
}

StatChange.displayName = 'StatChange';

function StatIcon({ icon }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
      {icon}
    </div>
  );
}

StatIcon.displayName = 'StatIcon';
