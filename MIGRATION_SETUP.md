# Global Coupons Database Migration Guide

## Overview

This guide walks you through setting up the `global_coupons` table on Supabase. This table powers the global coupon system that allows artists and promoters to create discount codes applicable across all their events.

## Prerequisites

- Supabase project created and configured
- `.env.local` file with Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

## Migration Options

### Option 1: Automated Migration (Recommended)

Run the automated migration script:

```bash
npm run db:migrate:global-coupons
```

**What this does:**
1. Loads the migration SQL from `lib/migrations/global-coupons.sql`
2. Connects to Supabase using service role credentials
3. Executes the migration to create the `global_coupons` table
4. Verifies successful completion

**Troubleshooting:**
- If the script fails, check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Ensure you're using a valid Supabase project

### Option 2: Manual Migration via Supabase Dashboard

If the automated script doesn't work:

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Open `lib/migrations/global-coupons.sql` in your editor
6. Copy the entire contents
7. Paste into the Supabase SQL Editor
8. Click **Run** (or press Ctrl+Enter)
9. Wait for the migration to complete

### Option 3: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install CLI if not already installed
npm install -g @supabase/cli

# Run migration
supabase db push lib/migrations/global-coupons.sql
```

## What Gets Created

### Table: `global_coupons`

| Column | Type | Details |
|--------|------|---------|
| `id` | UUID | Primary key |
| `code` | VARCHAR | Unique discount code (e.g., "ARTIST123", "PARTY456") |
| `source_type` | VARCHAR | Either "artist" or "promoter" |
| `created_by` | UUID | User ID of the creator (links to auth.users) |
| `max_uses` | INT | Maximum number of times coupon can be used |
| `usage_count` | INT | Current number of times coupon has been used |
| `is_active` | BOOLEAN | Whether coupon is currently active |
| `created_at` | TIMESTAMP | Creation timestamp |
| `expires_at` | TIMESTAMP | Optional expiration date |
| `notes` | TEXT | Optional internal notes |

### Indexes & Constraints

- **Unique Index**: `global_coupons_code_idx` on `code` column (case-insensitive)
- **Index**: `global_coupons_created_by_idx` on `created_by` column
- **Check Constraint**: `usage_count <= max_uses`
- **Check Constraint**: `expires_at >= created_at` (if set)

### Functions & Views

- **Function**: `validate_global_coupon(p_code)` - Validates a coupon code
- **View**: `global_coupon_earnings_view` - Shows earnings by coupon creator

## Verification

After migration, verify the table was created:

1. In Supabase dashboard, go to **Table Editor**
2. Look for `global_coupons` in the left sidebar
3. You should see a single row if any test coupons were created

Or query it directly:

```sql
SELECT * FROM global_coupons;
```

Expected result: Empty table initially (until artists/promoters create coupons)

## Next Steps

Once migration is complete:

1. **Test Coupon Creation**
   - Go to Artist Dashboard → Manage Coupons
   - Create a test coupon with code "TEST123"
   - Verify it appears in your Supabase table

2. **Test Coupon Application**
   - Create/browse an event
   - Add the coupon code at checkout
   - Verify discount is calculated correctly

3. **Test Usage Tracking**
   - Complete a payment with the coupon
   - Check Supabase: `SELECT usage_count FROM global_coupons WHERE code = 'TEST123'`
   - Should show `usage_count: 1`

4. **Monitor Earnings**
   - Query the earnings view:
     ```sql
     SELECT * FROM global_coupon_earnings_view;
     ```

## Troubleshooting

### Error: "global_coupons table already exists"
- The table was already created - no action needed
- Check Supabase dashboard to verify

### Error: "Relation 'global_coupons' does not exist"
- Migration hasn't been executed
- Try running the automated script again
- Or manually execute Option 2 above

### Coupons not working at checkout
1. Verify `global_coupons` table exists
2. Verify `getGlobalCouponByCode()` in `/lib/global-coupons-store.ts` is working
3. Check browser console for errors
4. Check Supabase logs for failed queries

### Usage count not incrementing
1. Verify `incrementGlobalCouponUsage()` is being called in `/app/api/payment/verify/route.ts`
2. Check that coupon verification returned `discountModel: 'event-based'`
3. Verify booking was successfully inserted in `ticket_bookings`

## Rollback

If you need to rollback the migration:

```sql
DROP TABLE IF EXISTS global_coupons CASCADE;
```

⚠️ This will delete all global coupons! Use only if absolutely necessary.

## Related Files

- **Migration SQL**: `lib/migrations/global-coupons.sql`
- **Migration Script**: `scripts/migrate-global-coupons.js`
- **Coupon Store**: `lib/global-coupons-store.ts`
- **API Endpoint**: `app/api/global-coupons/route.ts`
- **Payment Integration**: `app/api/payment/create-order/route.ts`
- **Usage Tracking**: `app/api/payment/verify/route.ts`

## Support

For issues:
1. Check Supabase dashboard for error messages
2. Review migration SQL syntax in `lib/migrations/global-coupons.sql`
3. Verify all environment variables are correctly set
4. Check application logs for API errors
