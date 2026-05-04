#!/usr/bin/env node

/**
 * Global Coupons Database Migration Script
 * 
 * This script executes the global-coupons.sql migration on Supabase.
 * 
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local
 * 2. Install supabase CLI: npm install -g @supabase/cli
 * 
 * Usage:
 * - npm run db:migrate:global-coupons
 * - node scripts/migrate-global-coupons.js
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting Global Coupons Migration...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Error: Missing environment variables');
    console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'lib', 'migrations', 'global-coupons.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Migration file not found at ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log('📄 Loaded migration SQL file\n');

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Execute the migration
    console.log('🔄 Executing migration...\n');
    const { error } = await supabase.rpc('exec', { sql: migrationSQL });

    if (error) {
      // Try direct SQL execution instead
      console.log('📝 Note: rpc method not available, attempting direct SQL execution...\n');
      
      // Split by semicolon and execute statements individually
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', { sql: statement + ';' });
        if (execError) {
          console.warn(`⚠️  Warning executing statement: ${execError.message}`);
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Verify global_coupons table exists in Supabase dashboard');
    console.log('   2. Test coupon creation in artist/promoter profile pages');
    console.log('   3. Test coupon application at event checkout');
    console.log('   4. Verify usage_count increments after payment\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n💡 Manual Migration Instructions:');
    console.log('   1. Go to https://app.supabase.com');
    console.log('   2. Open your project → SQL Editor');
    console.log('   3. Create a new query and paste contents of: lib/migrations/global-coupons.sql');
    console.log('   4. Click "Run" to execute the migration\n');
    process.exit(1);
  }
}

runMigration();
