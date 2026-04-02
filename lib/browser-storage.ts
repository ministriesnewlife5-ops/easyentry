import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'event-files';

let browserSupabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return browserSupabaseClient;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-');
}

export async function uploadFileDirectToSupabase(
  file: File,
  folder: string
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseBrowserClient();
  const extension = file.name.includes('.') ? file.name.split('.').pop() || '' : '';
  const safeExtension = extension ? `.${extension.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, '')) || 'upload';
  const uniqueSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${folder}/${safeName}-${uniqueSuffix}${safeExtension}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload file to Supabase');
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path,
  };
}