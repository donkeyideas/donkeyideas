'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@donkey-ideas/ui';

interface SectionImageUploadProps {
  imageUrl?: string | null;
  imagePosition?: 'left' | 'right' | 'center';
  onImageChange: (imageUrl: string | null) => void;
  onPositionChange: (position: 'left' | 'right' | 'center') => void;
  sectionName: string;
}

export function SectionImageUpload({
  imageUrl,
  imagePosition = 'center',
  onImageChange,
  onPositionChange,
  sectionName,
}: SectionImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(imageUrl || null);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalImageUrl(imageUrl || null);
  }, [imageUrl]);

  // Helper function to compress images
  const compressImage = (file: File, maxSizeKB: number = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions to keep aspect ratio
        const maxWidth = 1200;
        const maxHeight = 800;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels until under size limit
        let quality = 0.8;
        const tryCompress = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const sizeInKB = new Blob([dataUrl]).size / 1024;
          
          if (sizeInKB <= maxSizeKB || quality <= 0.1) {
            resolve(dataUrl);
          } else {
            quality -= 0.1;
            tryCompress();
          }
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      alert('Please select a PNG or JPEG image file.');
      return;
    }

    // Validate file size (max 10MB for initial upload)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB.');
      return;
    }

    setUploading(true);

    try {
      // Compress the image to under 500KB
      const compressedDataUrl = await compressImage(file, 500);
      
      // Calculate final size
      const finalSizeKB = new Blob([compressedDataUrl]).size / 1024;
      console.log(`Image compressed from ${Math.round(file.size / 1024)}KB to ${Math.round(finalSizeKB)}KB`);
      
      setLocalImageUrl(compressedDataUrl);
      onImageChange(compressedDataUrl);
      setUploading(false);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Failed to process image. Please try a different image.');
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setLocalImageUrl(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 mt-4 p-4 bg-white/5 border border-white/10 rounded-md">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Section Image</label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${sectionName}`}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm"
          >
            {uploading ? 'Uploading...' : localImageUrl ? 'Change Image' : 'Upload Image'}
          </Button>
          {localImageUrl && (
            <Button
              variant="secondary"
              onClick={handleRemoveImage}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {localImageUrl && (
        <>
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/60">Image Position:</label>
            <div className="flex gap-2">
              <Button
                variant={imagePosition === 'left' ? 'primary' : 'secondary'}
                onClick={() => onPositionChange('left')}
                className="text-xs px-3 py-1"
              >
                Left
              </Button>
              <Button
                variant={imagePosition === 'center' ? 'primary' : 'secondary'}
                onClick={() => onPositionChange('center')}
                className="text-xs px-3 py-1"
              >
                Center
              </Button>
              <Button
                variant={imagePosition === 'right' ? 'primary' : 'secondary'}
                onClick={() => onPositionChange('right')}
                className="text-xs px-3 py-1"
              >
                Right
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <img
              src={localImageUrl}
              alt={`${sectionName} image`}
              className="max-w-full max-h-48 object-contain rounded-md border border-white/10"
            />
          </div>
        </>
      )}
    </div>
  );
}

