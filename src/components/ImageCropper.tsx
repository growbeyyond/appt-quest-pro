import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImage: Blob, thumbnail: Blob) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    
    const scale = zoom;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    ctx.drawImage(
      image,
      position.x + (size - scaledWidth) / 2,
      position.y + (size - scaledHeight) / 2,
      scaledWidth,
      scaledHeight
    );

    // Draw crop overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
  }, [zoom, position]);

  React.useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      imageRef.current = image;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const scale = Math.min(400 / image.width, 400 / image.height);
      setZoom(scale);
      drawCanvas();
    };
    image.src = imageUrl;
  }, [imageUrl, drawCanvas]);

  React.useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleCrop = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create full size crop (max 1MB)
    const fullBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        0.9
      );
    });

    // Create thumbnail (150x150)
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 150;
    thumbCanvas.height = 150;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(canvas, 0, 0, 400, 400, 0, 0, 150, 150);
    }

    const thumbnailBlob = await new Promise<Blob>((resolve) => {
      thumbCanvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        0.8
      );
    });

    onCropComplete(fullBlob, thumbnailBlob);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border border-border rounded-lg cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      <div className="w-full max-w-md space-y-2">
        <label className="text-sm font-medium">Zoom</label>
        <Slider
          value={[zoom]}
          onValueChange={([value]) => setZoom(value)}
          min={0.1}
          max={3}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleCrop}>
          Save Photo
        </Button>
      </div>
    </div>
  );
};
