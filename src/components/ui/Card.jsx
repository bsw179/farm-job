// src/components/ui/Card.jsx
import React from 'react';
import { clsx } from 'clsx';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={clsx(
        'bg-white shadow rounded-xl p-4 border border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
