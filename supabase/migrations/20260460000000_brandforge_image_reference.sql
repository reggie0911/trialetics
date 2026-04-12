-- Allow JPEG and WebP uploads for BrandForge reference images (optional future storage use).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/svg+xml',
  'image/png',
  'application/zip',
  'image/x-icon',
  'image/jpeg',
  'image/webp'
]::text[]
WHERE id = 'brandforge-assets';
