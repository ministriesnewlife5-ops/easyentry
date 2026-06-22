export const APP_ROLES = [
  'ADMIN',
  'SUB_ADMIN',
  'STAFF',
  'ORGANIZER',
  'ARTIST',
  'PROMOTER',
  'CUSTOMER',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const LEGACY_ROLE_ALIASES = {
  admin: 'ADMIN',
  sub_admin: 'SUB_ADMIN',
  outlet: 'ORGANIZER',
  outlet_provider: 'ORGANIZER',
  artist: 'ARTIST',
  promoter: 'PROMOTER',
  influencer: 'PROMOTER',
  user: 'CUSTOMER',
} as const satisfies Record<string, AppRole>;

export type LegacyRole = keyof typeof LEGACY_ROLE_ALIASES;
export type RoleValue = AppRole | LegacyRole | (string & {});

export function normalizeRole(role: RoleValue | null | undefined): AppRole | null {
  if (!role) {
    return null;
  }

  const normalized = String(role).trim();
  if (!normalized) {
    return null;
  }

  const upper = normalized.toUpperCase() as AppRole;
  if (APP_ROLES.includes(upper)) {
    return upper;
  }

  return LEGACY_ROLE_ALIASES[normalized.toLowerCase() as LegacyRole] || null;
}

export function isAdminRole(role: RoleValue | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'ADMIN' || normalized === 'SUB_ADMIN';
}

export function isCustomerRole(role: RoleValue | null | undefined): boolean {
  return normalizeRole(role) === 'CUSTOMER';
}

export function isOrganizerRole(role: RoleValue | null | undefined): boolean {
  return normalizeRole(role) === 'ORGANIZER';
}

export function isCreatorRole(role: RoleValue | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'ARTIST' || normalized === 'PROMOTER' || normalized === 'ORGANIZER';
}

export function getRoleDisplayName(role: RoleValue | null | undefined): string {
  switch (normalizeRole(role)) {
    case 'ADMIN':
      return 'Admin';
    case 'SUB_ADMIN':
      return 'Sub Admin';
      case 'STAFF':
        return 'Staff';
    case 'ORGANIZER':
      return 'Organizer';
    case 'ARTIST':
      return 'Artist';
    case 'PROMOTER':
      return 'Promoter';
    case 'CUSTOMER':
      return 'Customer';
    default:
      return 'User';
  }
}

export function getRoleHomePath(role: RoleValue | null | undefined): string {
  switch (normalizeRole(role)) {
    case 'ADMIN':
    case 'SUB_ADMIN':
    case 'STAFF':
      return '/admin';
    case 'ORGANIZER':
      return '/outlet/profile';
    case 'ARTIST':
      return '/artist/profile';
    case 'PROMOTER':
      return '/promoter/profile';
    case 'CUSTOMER':
    default:
      return '/profile';
  }
}

export function getRoleDashboardPath(role: RoleValue | null | undefined): string {
  switch (normalizeRole(role)) {
    case 'ADMIN':
    case 'SUB_ADMIN':
    case 'STAFF':
      return '/admin';
    case 'ORGANIZER':
      return '/outlet/dashboard';
    case 'ARTIST':
      return '/artist/profile';
    case 'PROMOTER':
      return '/promoter/profile';
    case 'CUSTOMER':
    default:
      return '/profile';
  }
}

export function getRoleRegistrationPath(role: RoleValue | null | undefined): string {
  switch (normalizeRole(role)) {
    case 'ORGANIZER':
      return '/work/register?role=organizer';
    case 'ARTIST':
      return '/work/register?role=artist';
    case 'PROMOTER':
      return '/work/register?role=promoter';
    case 'CUSTOMER':
    default:
      return '/login';
  }
}

export function getRoleIconKey(role: RoleValue | null | undefined): 'admin' | 'organizer' | 'artist' | 'promoter' | 'customer' {
  switch (normalizeRole(role)) {
    case 'ADMIN':
    case 'SUB_ADMIN':
    case 'STAFF':
      return 'admin';
    case 'ORGANIZER':
      return 'organizer';
    case 'ARTIST':
      return 'artist';
    case 'PROMOTER':
      return 'promoter';
    case 'CUSTOMER':
    default:
      return 'customer';
  }
}
