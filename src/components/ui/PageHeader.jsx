// src/components/ui/PageHeader.jsx
import React from 'react';
import { clsx } from 'clsx';

export function PageHeader({ title, actions = null, className = '' }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      <h1 className="text-2xl font-bold text-blue-800 tracking-tight">{title}</h1>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
