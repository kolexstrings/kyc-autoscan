/**
 * Convert a Blob to base64 data URI
 * This format is ready for Innovatrics API: { image: { data: "base64..." } }
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Extract just the base64 part (remove "data:image/jpeg;base64," prefix)
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a Blob to full data URI (with prefix)
 * Format: data:image/jpeg;base64,/9j/4AAQ...
 */
export async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download blob as JPEG file to device storage
 * - On mobile: Triggers download (user can save to Gallery/Photos)
 * - On desktop: Downloads to Downloads folder
 */
export function downloadImage(blob: Blob, filename: string): void {
  // Create a temporary anchor element
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.jpg`;
}

/**
 * Convert blob to JPEG blob with specific quality
 * Useful for resizing or compressing images before sending to backend
 */
export async function blobToJpeg(blob: Blob, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (jpegBlob) => {
          URL.revokeObjectURL(url);
          if (jpegBlob) {
            resolve(jpegBlob);
          } else {
            reject(new Error('Failed to convert to JPEG'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}
