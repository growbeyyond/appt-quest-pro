import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a signed URL for private storage files
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 */
export const useSignedUrl = (bucket: string, path: string | null | undefined, expiresIn: number = 3600) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!path) {
        setSignedUrl(null);
        return;
      }

      // Extract the actual path from a full URL if needed
      let filePath = path;
      if (path.includes('/storage/v1/object/public/')) {
        const parts = path.split('/storage/v1/object/public/');
        if (parts.length > 1) {
          const pathWithBucket = parts[1];
          // Remove bucket name and leading slash
          filePath = pathWithBucket.replace(`${bucket}/`, '');
        }
      }

      // Remove query params (like cache busters)
      filePath = filePath.split('?')[0];

      setLoading(true);
      setError(null);

      try {
        const { data, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signedUrlError) throw signedUrlError;
        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        setError(err as Error);
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [bucket, path, expiresIn]);

  return { signedUrl, loading, error };
};

/**
 * Utility function to get a signed URL (non-hook version for one-time use)
 */
export const getSignedUrl = async (
  bucket: string, 
  path: string, 
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    // Extract the actual path from a full URL if needed
    let filePath = path;
    if (path.includes('/storage/v1/object/public/')) {
      const parts = path.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        const pathWithBucket = parts[1];
        filePath = pathWithBucket.replace(`${bucket}/`, '');
      }
    }

    // Remove query params
    filePath = filePath.split('?')[0];

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
};
