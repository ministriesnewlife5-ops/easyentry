export async function uploadFileDirectToSupabase(
  file: File,
  folder: string
): Promise<{ url: string; path: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', folder || 'upload');

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    let message = 'Failed to upload file';
    try {
      const errorData = await response.json();
      message = errorData?.error || message;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }

  const data = await response.json();
  const url = String(data.url || '');

  if (!url) {
    throw new Error('Upload did not return a valid URL');
  }

  return {
    url,
    path: String(data.fileName || ''),
  };
}