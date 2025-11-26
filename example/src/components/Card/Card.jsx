import React from 'react';

export function Card({ children, className = '', variant = 'default', onClick }) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-xl',
    gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
    outlined: 'bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-600',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl overflow-hidden transition-all duration-300
        ${variants[variant]}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-2xl' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

Card.displayName = 'Card';

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

CardHeader.displayName = 'CardHeader';

export function CardTitle({ children, subtitle }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{children}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

CardTitle.displayName = 'CardTitle';

export function CardBody({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

CardBody.displayName = 'CardBody';

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

CardFooter.displayName = 'CardFooter';
