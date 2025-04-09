// src/components/ui/Badge.jsx
import React from 'react';
import { clsx } from 'clsx';

export function Badge({ children, variant = 'default', className = '' }) {
  const base = 'inline-block text-xs font-semibold px-2 py-1 rounded-full';

  const variants = {
    default: 'bg-gray-200 text-gray-800',
    planned: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <span className={clsx(base, variants[variant], className)}>
      {children}
    </span>
  );
}