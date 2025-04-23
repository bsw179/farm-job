import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { canAccess } from '../utils/routeAccess';

export default function ProtectedRoute({ path, children }) {
  const { role, loading } = useUser();

  if (loading) return null;

  return canAccess(path, role) ? children : <Navigate to="/" />;
}
