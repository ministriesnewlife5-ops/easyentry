import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseServerClient } from '@/lib/supabase';

const STORAGE_BUCKET = 'event-files';

function normalizeToHttps(url: string): string {
  try {
    const parsed = new URL(url);
    const isLocalHost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.endsWith('.local');

    if (parsed.protocol === 'http:' && !isLocalHost) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }

    return url;
  } catch {
    return url;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/', 'video/'];
    const isAllowed = allowedTypes.some(t => file.type.startsWith(t));
    if (!isAllowed) {
      return NextResponse.json({ error: 'Invalid file type. Only images and videos allowed.' }, { status: 400 });
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 50MB.' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${type}_${uuidv4()}.${fileExt}`;
    const filePath = `event-media/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const secureUrl = normalizeToHttps(urlData.publicUrl);

    return NextResponse.json({
      success: true,
      url: secureUrl,
      fileName: fileName,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
