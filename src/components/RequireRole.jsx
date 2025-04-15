import React from 'react';
import { useUser } from '@/context/UserContext';
import { Navigate } from 'react-router-dom';

export default function RequireRole({ role: requiredRole, children }) {
  const { user, role, loading } = useUser();

  if (loading) return null;

  if (!user || !role || (requiredRole && role !== requiredRole)) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        🚫 Access Denied – You do not have permission to view this page.
      </div>
    );
  }

  return children;
}
