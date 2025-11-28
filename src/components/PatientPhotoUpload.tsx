import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ImageCropper } from './ImageCropper';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Camera } from 'lucide-react';

interface PatientPhotoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onUploadComplete: (photoUrl: string, thumbnailUrl: string) => void;
}

export const PatientPhotoUpload: React.FC<PatientPhotoUploadProps> = ({
  open,
  onOpenChange,
  patientId,
  onUploadComplete,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob, thumbnailBlob: Blob) => {
    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const photoPath = `${patientId}/photos/photo.jpg`;
      const thumbnailPath = `${patientId}/photos/thumbnail.jpg`;

      // Upload full photo
      const { error: photoError } = await supabase.storage
        .from('patient-files')
        .upload(photoPath, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (photoError) throw photoError;

      // Upload thumbnail
      const { error: thumbError } = await supabase.storage
        .from('patient-files')
        .upload(thumbnailPath, thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (thumbError) throw thumbError;

      // Get public URLs
      const { data: photoData } = supabase.storage
        .from('patient-files')
        .getPublicUrl(photoPath);

      const { data: thumbData } = supabase.storage
        .from('patient-files')
        .getPublicUrl(thumbnailPath);

      // Update patient record
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          photo_url: `${photoData.publicUrl}?t=${timestamp}`,
          photo_thumbnail_url: `${thumbData.publicUrl}?t=${timestamp}`,
        })
        .eq('id', patientId);

      if (updateError) throw updateError;

      toast.success('Photo uploaded successfully');
      onUploadComplete(photoData.publicUrl, thumbData.publicUrl);
      onOpenChange(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Patient Photo</DialogTitle>
        </DialogHeader>

        {!selectedImage ? (
          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select a photo to upload (max 5MB)
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload">
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          </div>
        ) : (
          <ImageCropper
            imageUrl={selectedImage}
            onCropComplete={handleCropComplete}
            onCancel={handleCancel}
          />
        )}

        {isUploading && (
          <div className="text-center text-sm text-muted-foreground">
            Uploading photo...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
