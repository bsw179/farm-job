// src/components/ui/button.jsx
import React from 'react';

export function Button({ children, onClick, variant = 'default', size = 'default', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-md transition focus:outline-none';
  const sizes = {
    default: 'px-4 py-2 text-sm',
    icon: 'p-2',
    sm: 'px-3 py-1.5 text-sm',
  };
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-100',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
