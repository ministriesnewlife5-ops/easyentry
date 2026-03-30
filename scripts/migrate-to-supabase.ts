/**
 * Migration Script: JSON File Storage to Supabase
 * 
 * This script reads event data from local JSON files and migrates it to Supabase.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-to-supabase.ts
 * 
 * Prerequisites:
 *   - Set up environment variables in .env file:
 *     NEXT_PUBLIC_SUPABASE_URL
 *     SUPABASE_SERVICE_ROLE_KEY
 *   - Run the schema script in Supabase SQL Editor
 *   - Install dependencies: npm install @supabase/supabase-js dotenv
 */

/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DATA_DIR = resolve(__dirname, '../.easyentry-data');

// Types matching the JSON file structure
interface LegacyEventRequest {
  id: string;
  outletUserId: string;
  outletName: string;
  eventData: {
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    price: string;
    image: string;
    mediaFiles?: string[];
    numberOfTickets?: string;
    rules?: string[];
    ticketCategories?: Array<{
      id: string;
      name: string;
      price: number;
      availableFrom?: string;
      availableUntil?: string;
    }>;
    description: string;
    fullDescription: string;
    gatesOpen: string;
    entryAge: string;
    layout: string;
    seating: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface LegacyPublishedEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  distance: string;
  gatesOpen: string;
  price: string;
  priceSubtext: string;
  image: string;
  images: string[];
  mediaFiles?: string[];
  description: string;
  fullDescription: string;
  category: string;
  entryAge: string;
  layout: string;
  seating: string;
  promoterName: string;
  promoterLabel: string;
  highlights: Array<{
    iconKey: string;
    title: string;
    description: string;
  }>;
  thingsToKnow: Array<{
    iconKey: string;
    label: string;
    value: string;
  }>;
  artists: unknown[];
  publishedAt: number;
  sourceRequestId?: string;
  ticketCategories?: unknown[];
}

/**
 * Read and parse JSON file
 */
function readJsonFile<T>(filename: string): T[] {
  const filepath = resolve(DATA_DIR, filename);
  
  if (!existsSync(filepath)) {
    console.warn(`⚠️  File not found: ${filepath}`);
    return [];
  }

  try {
    const content = readFileSync(filepath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error);
    return [];
  }
}

/**
 * Map legacy event request to database schema
 */
function mapEventRequestToDb(request: LegacyEventRequest): Record<string, unknown> {
  const attachments: string[] = [];
  if (request.eventData.image) attachments.push(request.eventData.image);
  if (request.eventData.mediaFiles) attachments.push(...request.eventData.mediaFiles);

  return {
    id: request.id,
    title: request.eventData.title,
    date: request.eventData.date,
    description: request.eventData.description || request.eventData.fullDescription,
    status: request.status === 'rejected' ? 'cancelled' : request.status,
    user_id: request.outletUserId,
    venue_id: null,
    event_type: request.eventData.category,
    expected_attendance: request.eventData.numberOfTickets 
      ? parseInt(request.eventData.numberOfTickets, 10) || null 
      : null,
    budget: request.eventData.price ? parseFloat(request.eventData.price) || null : null,
    requirements: request.eventData.rules || null,
    attachments: attachments.length > 0 ? [...new Set(attachments)] : null,
    contact_email: null,
    contact_phone: null,
    notes: request.rejectionReason || null,
    submitted_at: new Date(request.submittedAt).toISOString(),
    reviewed_at: request.reviewedAt ? new Date(request.reviewedAt).toISOString() : null,
    reviewed_by: request.reviewedBy || null,
    created_at: new Date(request.submittedAt).toISOString(),
    updated_at: request.reviewedAt ? new Date(request.reviewedAt).toISOString() : new Date(request.submittedAt).toISOString(),
  };
}

/**
 * Map legacy published event to database schema
 */
function mapPublishedEventToDb(event: LegacyPublishedEvent): Record<string, unknown> {
  const galleryImages = [...event.images];
  if (event.mediaFiles && event.mediaFiles.length > 0) {
    galleryImages.push(...event.mediaFiles);
  }

  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time || null,
    description: event.description || event.fullDescription,
    venue_id: null,
    organizer_id: null,
    event_type: event.category,
    category: event.category,
    image_url: event.image || galleryImages[0] || null,
    gallery_images: galleryImages.length > 0 ? [...new Set(galleryImages)] : null,
    ticket_price: event.price ? parseFloat(event.price) || null : null,
    ticket_url: null,
    max_attendance: null,
    registered_attendees: 0,
    tags: null,
    is_featured: false,
    is_public: true,
    status: 'upcoming',
    social_links: null,
    request_id: event.sourceRequestId || null,
    published_at: new Date(event.publishedAt).toISOString(),
    created_at: new Date(event.publishedAt).toISOString(),
    updated_at: new Date(event.publishedAt).toISOString(),
  };
}

/**
 * Migrate event requests
 */
async function migrateEventRequests(): Promise<{ success: number; failed: number }> {
  console.log('\n📦 Migrating Event Requests...');
  
  const requests = readJsonFile<LegacyEventRequest>('event-requests.json');
  console.log(`   Found ${requests.length} event requests`);

  let success = 0;
  let failed = 0;

  for (const request of requests) {
    try {
      const dbData = mapEventRequestToDb(request);
      
      const { error } = await supabase
        .from('event_requests')
        .upsert(dbData, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Failed to migrate request ${request.id}:`, error.message);
        failed++;
      } else {
        success++;
        process.stdout.write(`   ✅ Migrated ${success}/${requests.length}\r`);
      }
    } catch (error) {
      console.error(`   ❌ Error migrating request ${request.id}:`, error);
      failed++;
    }
  }

  console.log(`\n   ✓ Event Requests: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * Migrate published events
 */
async function migratePublishedEvents(): Promise<{ success: number; failed: number }> {
  console.log('\n📦 Migrating Published Events...');
  
  const events = readJsonFile<LegacyPublishedEvent>('published-events.json');
  console.log(`   Found ${events.length} published events`);

  let success = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const dbData = mapPublishedEventToDb(event);
      
      const { error } = await supabase
        .from('published_events')
        .upsert(dbData, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Failed to migrate event ${event.id}:`, error.message);
        failed++;
      } else {
        success++;
        process.stdout.write(`   ✅ Migrated ${success}/${events.length}\r`);
      }
    } catch (error) {
      console.error(`   ❌ Error migrating event ${event.id}:`, error);
      failed++;
    }
  }

  console.log(`\n   ✓ Published Events: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('🚀 Starting EasyEntry Migration to Supabase\n');
  console.log(`   Supabase URL: ${supabaseUrl?.substring(0, 30)}...`);
  console.log(`   Data Directory: ${DATA_DIR}`);

  // Test connection
  console.log('\n🔌 Testing Supabase connection...');
  const { data: testData, error: testError } = await supabase
    .from('app_users')
    .select('count')
    .single();

  if (testError) {
    console.error('❌ Failed to connect to Supabase:', testError.message);
    console.error('\nPossible issues:');
    console.error('   - Check your SUPABASE_SERVICE_ROLE_KEY is correct');
    console.error('   - Ensure the database schema has been applied');
    console.error('   - Verify the app_users table exists');
    process.exit(1);
  }

  console.log('✅ Connected to Supabase successfully!');

  // Run migrations
  const requestResults = await migrateEventRequests();
  const eventResults = await migratePublishedEvents();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Event Requests:  ${requestResults.success} succeeded, ${requestResults.failed} failed`);
  console.log(`Published Events: ${eventResults.success} succeeded, ${eventResults.failed} failed`);
  
  const totalSuccess = requestResults.success + eventResults.success;
  const totalFailed = requestResults.failed + eventResults.failed;
  
  console.log(`Total:            ${totalSuccess} succeeded, ${totalFailed} failed`);
  console.log('='.repeat(50));

  if (totalFailed > 0) {
    console.log('\n⚠️  Some records failed to migrate. Check the error messages above.');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('\n💥 Unexpected error during migration:', error);
  process.exit(1);
});
