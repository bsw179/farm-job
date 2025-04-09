// src/components/ui/tabs.jsx
import React from 'react';

export function Tabs({ children, value, onValueChange, className = '', ...props }) {
  return (
    <div className={`flex gap-2 ${className}`} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          isActive: value === child.props.value,
          onClick: () => onValueChange(child.props.value),
        })
      )}
    </div>
  );
}

export function Tab({ value, children, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
        isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
