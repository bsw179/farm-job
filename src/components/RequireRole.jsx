import React from 'react';
import { useUser } from '@/context/UserContext';

export default function RequireRole({ role: requiredRole, children }) {
  const { user, role, loading } = useUser();

  if (loading || !user || !role) return null;

  console.log('💬 RequireRole checking for:', requiredRole);
  console.log('👤 Current user role is:', role);

  const allowed = Array.isArray(requiredRole)
    ? requiredRole.includes(role)
    : role === requiredRole;

  if (!allowed) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        🚫 Access Denied – You do not have permission to view this page.
      </div>
    );
  }

  return children;
}
