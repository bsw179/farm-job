// src/utils/routeAccess.js

const restrictedRoutes = {
  '/products': ['admin', 'manager'],
  '/jobs/create': ['admin', 'manager'],
  '/manage-users': ['admin'],
  '/manage-partners': ['admin', 'manager'],
  '/setup/manage-crop-types': ['admin', 'manager'],
  '/setup/import-boundaries': ['admin', 'manager'],
  '/setup/manage-job-types': ['admin', 'manager'],
  '/admin-tools': ['admin'],
  '/jobs/summary': ['admin', 'manager'],
  '/jobs/edit-area/:fieldId': ['admin', 'manager'],
  '/fields/:fieldId/boundary-editor': ['admin', 'manager'],
  '/map-viewer': ['admin', 'manager'],
  '/jobs/field/:jobId': ['admin', 'manager'],
  '/fields/:fieldId': ['admin', 'manager'],
  '/inputs': ['admin', 'manager'],

};

export function canAccess(path, role) {
  const allowedRoles = restrictedRoutes[path];
  return !allowedRoles || allowedRoles.includes(role);
}
