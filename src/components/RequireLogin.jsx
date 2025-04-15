import React from 'react';
import { useUser } from '@/context/UserContext';
import { Navigate } from 'react-router-dom';

export default function RequireLogin({ children }) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
