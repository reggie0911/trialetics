'use client';

import { useState, useRef, useEffect } from 'react';
import { User, X, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/client';

interface ContactImageUploadProps {
  currentImageUrl?: string | null;
  contactId: string;
  onUploadComplete: (url: string) => void;
  onUploadError: (error: string) => void;
}

export function ContactImageUpload({
  currentImageUrl,
  contactId,
  onUploadComplete,
  onUploadError,
}: ContactImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImageUrl changes
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  const validateFile = (file: File): string | null => {
    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return 'File size must be less than 2MB';
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'File must be JPEG, PNG, or WebP';
    }

    return null;
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    
    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        onUploadError(validationError);
        setUploading(false);
        return;
      }

      // Create preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Supabase Storage
      const supabase = createClient();
      
      // Debug logging
      console.log('Uploading contact image:', {
        contactId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `contacts/${contactId}/${fileName}`;

      console.log('Upload path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      console.log('Upload response:', { data: uploadData, error: uploadError });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', urlData.publicUrl);

      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);
      
      // Set the permanent URL
      setPreviewUrl(urlData.publicUrl);
      onUploadComplete(urlData.publicUrl);
      setUploading(false);
    } catch (error) {
      console.error('Error uploading contact image:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      onUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      setPreviewUrl(null);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentImageUrl;
  
  // Add cache busting timestamp to force image reload
  const displayUrlWithCache = displayUrl ? `${displayUrl}?t=${Date.now()}` : displayUrl;

  return (
    <div 
      className={`flex items-center gap-4 rounded-lg border transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-border'
      } p-3`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Avatar on the left */}
      <Avatar className="h-16 w-16 shrink-0">
        <AvatarImage 
          src={displayUrlWithCache || undefined} 
          alt="Contact profile" 
          key={displayUrlWithCache}
        />
        <AvatarFallback className="text-xs">
          <User className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>

      {/* Upload controls on the right */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 text-xs h-7"
          >
            {uploading ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3" />
                Choose Photo
              </>
            )}
          </Button>
          
          {displayUrl && !uploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="gap-2 text-xs h-7"
            >
              <X className="h-3 w-3" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG or WebP (max. 2MB)
        </p>
      </div>
    </div>
  );
}
