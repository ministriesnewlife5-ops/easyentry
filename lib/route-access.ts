import { isAdminRole, isCreatorRole, isOrganizerRole, normalizeRole, type RoleValue } from '@/lib/roles';

export type RouteAccess = 'public' | 'authenticated' | 'admin-only' | 'organizer-only' | 'creator-only';
export type RouteShell = 'public' | 'auth' | 'dashboard';

type RouteRule = {
  pattern: RegExp;
  access: RouteAccess;
  shell: RouteShell;
};

const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/$/, access: 'public', shell: 'public' },
  { pattern: /^\/about(?:\/.*)?$/, access: 'public', shell: 'public' },
  { pattern: /^\/blog(?:\/.*)?$/, access: 'public', shell: 'public' },
  { pattern: /^\/events(?:\/.*)?$/, access: 'public', shell: 'public' },
  { pattern: /^\/help(?:\/.*)?$/, access: 'public', shell: 'public' },
  { pattern: /^\/venues(?:\/.*)?$/, access: 'public', shell: 'public' },
  { pattern: /^\/venue\/[^/]+$/, access: 'public', shell: 'public' },
  { pattern: /^\/artist\/[^/]+$/, access: 'public', shell: 'public' },
  { pattern: /^\/promoter\/[^/]+$/, access: 'public', shell: 'public' },
  { pattern: /^\/outlet\/[^/]+$/, access: 'public', shell: 'public' },
  { pattern: /^\/promoters(?:\/.*)?$/, access: 'public', shell: 'public' },
  { pattern: /^\/login(?:\/.*)?$/, access: 'public', shell: 'auth' },
  { pattern: /^\/forgot-password(?:\/.*)?$/, access: 'public', shell: 'auth' },
  { pattern: /^\/work\/register(?:\/.*)?$/, access: 'public', shell: 'auth' },
  { pattern: /^\/seller-form(?:\/.*)?$/, access: 'organizer-only', shell: 'auth' },
  { pattern: /^\/profile(?:\/.*)?$/, access: 'authenticated', shell: 'dashboard' },
  { pattern: /^\/admin(?:\/.*)?$/, access: 'admin-only', shell: 'dashboard' },
  { pattern: /^\/outlet\/dashboard(?:\/.*)?$/, access: 'organizer-only', shell: 'dashboard' },
  { pattern: /^\/outlet\/profile(?:\/.*)?$/, access: 'organizer-only', shell: 'dashboard' },
  { pattern: /^\/outlet\/host-event(?:\/.*)?$/, access: 'organizer-only', shell: 'dashboard' },
  { pattern: /^\/artist\/profile(?:\/.*)?$/, access: 'creator-only', shell: 'dashboard' },
  { pattern: /^\/promoter\/profile(?:\/.*)?$/, access: 'creator-only', shell: 'dashboard' },
];

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function getRouteRule(pathname: string): RouteRule | undefined {
  const normalizedPath = normalizePathname(pathname);
  return ROUTE_RULES.find((rule) => rule.pattern.test(normalizedPath));
}

export function getRouteAccess(pathname: string): RouteAccess {
  return getRouteRule(pathname)?.access ?? 'public';
}

export function getRouteShell(pathname: string): RouteShell {
  return getRouteRule(pathname)?.shell ?? 'public';
}

export function isPublicRoute(pathname: string): boolean {
  return getRouteAccess(pathname) === 'public';
}

export function isAuthenticatedRoute(pathname: string): boolean {
  return getRouteAccess(pathname) === 'authenticated';
}

export function canAccessRoute(pathname: string, role: RoleValue | null | undefined): boolean {
  const access = getRouteAccess(pathname);
  const normalizedRole = normalizeRole(role);

  switch (access) {
    case 'public':
      return true;
    case 'authenticated':
      return Boolean(normalizedRole);
    case 'admin-only':
      return isAdminRole(normalizedRole);
    case 'organizer-only':
      return isAdminRole(normalizedRole) || isOrganizerRole(normalizedRole);
    case 'creator-only':
      return isAdminRole(normalizedRole) || isCreatorRole(normalizedRole);
    default:
      return false;
  }
}

export function getRouteAccessLabel(access: RouteAccess): string {
  switch (access) {
    case 'public':
      return 'public';
    case 'authenticated':
      return 'authenticated';
    case 'admin-only':
      return 'admin-only';
    case 'organizer-only':
      return 'organizer-only';
    case 'creator-only':
      return 'creator-only';
  }
}
