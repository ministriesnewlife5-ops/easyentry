
# Route Protection Audit

## Summary

The app now has a centralized route-access policy in `lib/route-access.ts`, and the root layout delegates shell rendering to `components/layout/RouteShell.tsx`.

Middleware now enforces server-side protection for page routes before protected UI can render, so client-side guards are no longer the primary security boundary.

## Route Classification

### Public
- `/`
- `/about`
- `/blog`
- `/blog/[id]`
- `/events`
- `/events/[id]`
- `/help`
- `/venues`
- `/venue/[id]`
- `/promoters`
- `/artist/[id]`
- `/promoter/[id]`
- `/outlet/[id]`
- `/login`
- `/forgot-password`
- `/work/register`

### Authenticated
- `/profile`

### Admin-only
- `/admin`
- `/admin/*`

### Organizer-only
- `/seller-form`
- `/outlet/dashboard`
- `/outlet/profile`
- `/outlet/host-event`

### Creator-only
- `/artist/profile`
- `/promoter/profile`

## Direct URL Reachability

### Previously publicly reachable, now server-protected
- `/admin`
- `/profile`
- `/seller-form`
- `/outlet/dashboard`
- `/outlet/profile`
- `/outlet/host-event`
- `/artist/profile`
- `/promoter/profile`

### Intentionally public by design
- Public discovery pages, event details, venue pages, and profile detail pages listed above.

## Recommended Folder / Layout Structure

The app is currently protected with a shared shell and middleware. The cleanest long-term route-group structure would be:

- `app/(public)/...` for marketing and discovery pages
- `app/(auth)/...` for login, forgot-password, registration, and onboarding forms
- `app/(dashboard)/...` for authenticated dashboards and role dashboards

Suggested shell behavior:
- Public shell: navigation + footer
- Auth shell: minimal centered layout, no navigation/footer
- Dashboard shell: no public navigation/footer, role-specific dashboard chrome only

## Exact Files Modified

- `lib/route-access.ts`
- `components/layout/RouteShell.tsx`
- `app/layout.tsx`
- `middleware.ts`
- `app/seller-form/page.tsx`
- `app/api/admin/event-requests/route.ts`
- `app/api/admin/onboard/route.ts`
- `app/api/admin/host-event/route.ts`
- `app/api/admin/companies/route.ts`
- `app/api/admin/analytics/route.ts`
- `app/api/admin/archive-delete/route.ts`
- `app/api/ads-banners/route.ts`
- `app/profile/page.tsx`

## Remaining Security Risks

- Some page components still contain client-side role checks for UX; these should be treated as secondary only.
- Server-side APIs still depend on their own authorization checks, so every new API route should use the centralized role helpers.
- Public detail pages remain intentionally reachable by direct URL; that is expected and not a security issue.
- `seller-form` still depends on browser-side data flow and organizer APIs, so its UX is protected by middleware but its business payloads still need API-level validation.

## Implementation Notes

- Role normalization continues to happen through `lib/roles.ts`.
- Middleware now resolves access from the centralized route policy instead of duplicating role strings.
- Public shell vs dashboard shell is now separated without changing route URLs or business logic.
