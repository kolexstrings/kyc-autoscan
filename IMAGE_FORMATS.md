# Image Capture Formats Documentation

## Overview

When you capture a document or selfie, the application automatically generates **4 different formats** and **downloads the JPEG to your device**. This gives you flexibility for different use cases.

## Captured Formats

Each captured image is stored with the following properties:

```typescript
interface CapturedImageData {
  blob: Blob;         // Original image blob from Innovatrics SDK
  dataUrl: string;    // Object URL for preview (blob:http://...)
  base64: string;     // Pure base64 string (for Innovatrics API)
  dataUri: string;    // Full data URI (data:image/jpeg;base64,...)
  filename: string;   // Filename of downloaded JPEG
}
```

## Format Details

### 1. **Blob** (`blob`)
- **Type:** `Blob`
- **Use case:** Raw image data, file uploads, processing
- **Example:**
  ```javascript
  const documentBlob = capturedData.document.blob;
  // Upload to server
  const formData = new FormData();
  formData.append('document', documentBlob, 'document.jpg');
  ```

### 2. **Object URL** (`dataUrl`)
- **Type:** `string`
- **Format:** `blob:http://localhost:5173/abc123...`
- **Use case:** Displaying images in preview (`<img src={dataUrl} />`)
- **Note:** Temporary URL that needs to be revoked after use
- **Example:**
  ```javascript
  <img src={capturedData.document.dataUrl} alt="Document preview" />
  ```

### 3. **Base64** (`base64`)
- **Type:** `string`
- **Format:** Pure base64 string (no prefix)
- **Use case:** **Innovatrics API** - This is what you send to the backend
- **Example:**
  ```javascript
  // ✅ READY FOR INNOVATRICS API
  const innovatricsPayload = {
    image: {
      data: capturedData.document.base64
    }
  };
  
  // Send to your backend
  await fetch('/api/kyc/verify-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(innovatricsPayload)
  });
  ```

### 4. **Data URI** (`dataUri`)
- **Type:** `string`
- **Format:** `data:image/jpeg;base64,/9j/4AAQSkZJRg...`
- **Use case:** Embedding in HTML, storing in database, emails
- **Example:**
  ```javascript
  // Display in img tag
  <img src={capturedData.document.dataUri} />
  
  // Store in database
  await db.users.update({
    documentImage: capturedData.document.dataUri
  });
  ```

### 5. **Downloaded JPEG** (`filename`)
- **Type:** `string` (filename)
- **Location:** 
  - **Mobile:** Downloads folder (user can save to Gallery/Photos)
  - **Desktop:** Downloads folder (e.g., Mac Downloads, Windows Downloads)
- **Format:** `document_2025-11-07T22-30-45.jpg` or `selfie_2025-11-07T22-30-45.jpg`
- **Use case:** User has a local copy for their records
- **Example:**
  ```javascript
  console.log(capturedData.document.filename);
  // Output: "document_2025-11-07T22-30-45.jpg"
  ```

## Usage Examples

### Sending to Innovatrics Backend

```typescript
async function submitKYCVerification(capturedData: CapturedData) {
  const response = await fetch('/api/kyc/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: {
        image: {
          data: capturedData.document.base64  // ✅ Innovatrics format
        }
      },
      selfie: {
        image: {
          data: capturedData.face.base64  // ✅ Innovatrics format
        }
      }
    })
  });
  
  return response.json();
}
```

### Displaying Images in Review Screen

```typescript
function ReviewScreen({ capturedData }: Props) {
  return (
    <div>
      <img src={capturedData.document.dataUrl} alt="Document" />
      <img src={capturedData.face.dataUrl} alt="Selfie" />
    </div>
  );
}
```

### Uploading to Your Own Storage (e.g., Cloudinary, S3)

```typescript
async function uploadToCloudinary(blob: Blob, filename: string) {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('upload_preset', 'your_preset');
  
  const response = await fetch(
    'https://api.cloudinary.com/v1_1/your-cloud/image/upload',
    { method: 'POST', body: formData }
  );
  
  return response.json();
}

// Usage
const documentUrl = await uploadToCloudinary(
  capturedData.document.blob,
  capturedData.document.filename
);
```

### Storing in Supabase Database

```typescript
async function saveToDatabase(capturedData: CapturedData) {
  // Option 1: Store data URI (includes full image data)
  const { data, error } = await supabase
    .from('kyc_submissions')
    .insert({
      user_id: userId,
      document_image: capturedData.document.dataUri,  // Store full data URI
      selfie_image: capturedData.face.dataUri,
      created_at: new Date()
    });
    
  // Option 2: Upload blob to Supabase Storage, store URL
  const { data: fileData } = await supabase.storage
    .from('kyc-images')
    .upload(`${userId}/${capturedData.document.filename}`, capturedData.document.blob);
    
  const { data: dbData } = await supabase
    .from('kyc_submissions')
    .insert({
      user_id: userId,
      document_url: fileData.path,  // Store reference only
    });
}
```

## File Download Behavior

### Desktop (Mac/Windows)
- Images automatically download to your **Downloads** folder
- Filenames: `document_2025-11-07T22-30-45.jpg`, `selfie_2025-11-07T22-30-45.jpg`
- Browser may show download notification

### Mobile (iOS/Android)
- Images download to **Files/Downloads** folder
- User can then save to **Photos/Gallery** app from Files
- On some browsers, user may be prompted to choose location

### Browser Compatibility
- ✅ Chrome/Edge: Auto-downloads to Downloads folder
- ✅ Safari: Downloads or opens Save dialog
- ✅ Firefox: Downloads to Downloads folder
- ✅ Mobile browsers: Downloads to device storage

## Console Output

When an image is captured, you'll see detailed logs:

```javascript
📄 Document captured: {
  filename: "document_2025-11-07T22-30-45.jpg",
  blobSize: "245.67 KB",
  base64Length: 335120,
  format: "image/jpeg",
  innovatricsFormat: { image: { data: "..." } }
}

🤳 Selfie captured: {
  filename: "selfie_2025-11-07T22-30-45.jpg",
  blobSize: "189.23 KB",
  base64Length: 258456,
  format: "image/jpeg",
  innovatricsFormat: { image: { data: "..." } }
}

✅ VERIFICATION COMPLETE - All captured data: {
  document: { ... },
  face: { ... }
}

📦 How to use this data:
1. JPEG Files: Already downloaded to your device storage
2. For Innovatrics API: Use capturedData.document.base64 or capturedData.face.base64
3. For display: Use capturedData.document.dataUri or capturedData.face.dataUri
4. Raw blob: Use capturedData.document.blob or capturedData.face.blob
```

## Integration with Innovatrics Backend

Based on your existing `id-verification-system`, here's how to integrate:

```typescript
// Frontend: Send to your backend
async function submitKYC() {
  const response = await fetch('http://localhost:3000/api/kyc/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentFront: capturedData.document.base64,  // Just the base64 string
      selfie: capturedData.face.base64,
      // Your backend will format it for Innovatrics
    })
  });
}

// Backend: Your existing kycController.ts can use it directly
const innovatricsPayload = {
  image: {
    data: req.body.documentFront  // Already in base64
  }
};
await innovatricsClient.verifyDocument(customerId, innovatricsPayload);
```

## Best Practices

1. **For Innovatrics API:** Always use `base64` format (without data URI prefix)
2. **For display:** Use `dataUrl` for best performance
3. **For storage:** Consider uploading `blob` to cloud storage, store URL in database
4. **For user records:** JPEG files are automatically downloaded to device
5. **Memory management:** Remember to revoke object URLs when done:
   ```javascript
   URL.revokeObjectURL(capturedData.document.dataUrl);
   ```

## Summary

| Format | Use For | Innovatrics API? |
|--------|---------|------------------|
| `blob` | File uploads, processing | ❌ No |
| `dataUrl` | Image preview in UI | ❌ No |
| `base64` | **Innovatrics API** | ✅ Yes |
| `dataUri` | Database storage, emails | ❌ No |
| Downloaded JPEG | User's local copy | ❌ No |

**For your backend integration, use `capturedData.document.base64` and `capturedData.face.base64`** - they're already in the exact format Innovatrics expects! 🎯
