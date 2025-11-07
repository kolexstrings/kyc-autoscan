# Deployment Guide

## ✅ Build Successful!

Your KYC AutoCapture application is now built and ready for deployment!

## 📦 Build Output

- **Location:** `dist/` folder
- **Entry Point:** `dist/index.html`
- **Assets:** `dist/assets/`
- **Size:** ~2.2 MB (673 KB gzipped)

## 🚀 Deployment Options

### Option 1: Netlify (Recommended - Easiest)

#### Via Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod
```

When prompted:
- **Publish directory:** `dist`
- **Build command:** `yarn build`

#### Via Drag & Drop:
1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag the `dist/` folder onto the upload area
3. Done! Your site is live

#### Via Git Integration:
1. Push code to GitHub
2. Connect repository to Netlify
3. Set build command: `yarn build`
4. Set publish directory: `dist`
5. Deploy!

**Netlify Configuration File (`netlify.toml`):**
```toml
[build]
  command = "yarn build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

---

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

When prompted:
- **Build Command:** `yarn build`
- **Output Directory:** `dist`

**Vercel Configuration File (`vercel.json`):**
```json
{
  "buildCommand": "yarn build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### Option 3: AWS S3 + CloudFront

```bash
# Build the app
yarn build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**S3 Bucket Configuration:**
- Enable static website hosting
- Set index document: `index.html`
- Set error document: `index.html`

---

### Option 4: Docker + Any Cloud Provider

**Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing - return index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

**Build and deploy:**
```bash
# Build Docker image
docker build -t kyc-autocapture .

# Run locally
docker run -p 8080:80 kyc-autocapture

# Push to registry
docker tag kyc-autocapture your-registry/kyc-autocapture
docker push your-registry/kyc-autocapture
```

---

### Option 5: GitHub Pages

```bash
# Install gh-pages
yarn add -D gh-pages

# Add to package.json scripts:
# "deploy": "yarn build && gh-pages -d dist"

# Deploy
yarn deploy
```

**Note:** Update `vite.config.ts` for GitHub Pages:
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/', // Add this
})
```

---

## 🔧 Environment Variables

If you need environment variables in production:

**Create `.env.production`:**
```bash
VITE_API_URL=https://api.yourbackend.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

**Access in code:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 📱 Important Deployment Considerations

### 1. **HTTPS is Required**
- Camera access requires HTTPS (or localhost for development)
- All deployment platforms provide free SSL certificates

### 2. **Camera Permissions**
- Users will be prompted for camera permissions
- Make sure your deployment domain is trusted

### 3. **CORS Configuration**
If connecting to a backend API:
```typescript
// Your backend needs CORS headers
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### 4. **Asset Loading**
- Ensure `public/dot-assets/` is included in deployment
- Run `yarn copy-assets` before building if needed
- The build automatically includes public folder contents

### 5. **Browser Compatibility**
Tested and working on:
- ✅ Chrome/Edge 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 8+)

---

## 🎯 Performance Optimization

### Reduce Bundle Size

The warning about chunk size can be addressed:

**Option 1: Code Splitting (Future Enhancement)**
```typescript
// In App.tsx - lazy load components
const DocumentAutoCapture = lazy(() => import('./components/DocumentAutoCapture'));
const FaceAutoCapture = lazy(() => import('./components/FaceAutoCapture'));
```

**Option 2: Update `vite.config.ts`**
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000, // Increase limit
    rollupOptions: {
      output: {
        manualChunks: {
          'innovatrics-document': ['@innovatrics/dot-document-auto-capture'],
          'innovatrics-face': ['@innovatrics/dot-face-auto-capture'],
          'innovatrics-ui': ['@innovatrics/dot-auto-capture-ui'],
        }
      }
    }
  }
})
```

**Note:** The large bundle is expected due to Innovatrics WASM modules. It's optimized when gzipped (673 KB).

---

## ✅ Pre-Deployment Checklist

- [x] Build succeeds without errors
- [x] Test locally with `yarn preview`
- [x] Camera access works
- [x] Document capture works
- [x] Face capture works
- [x] Image download works
- [x] Mobile responsive
- [x] Console logs show correct data
- [ ] Update VITE_API_URL if using backend
- [ ] Test on target deployment platform
- [ ] Configure analytics (optional)
- [ ] Set up error monitoring (optional)

---

## 🧪 Test Production Build Locally

```bash
# Build
yarn build

# Preview production build
yarn preview
```

This starts a local server serving the production build at `http://localhost:4173`

---

## 📊 Monitoring & Analytics (Optional)

### Add Google Analytics:
```bash
yarn add react-ga4
```

```typescript
// In main.tsx
import ReactGA from 'react-ga4';

ReactGA.initialize('G-XXXXXXXXXX');
ReactGA.send('pageview');
```

### Add Sentry for Error Tracking:
```bash
yarn add @sentry/react
```

```typescript
// In main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

---

## 🔗 Backend Integration

When deploying with a backend, update your API calls:

```typescript
// src/config.ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// In your submit handler
const response = await fetch(`${API_URL}/api/kyc/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentBase64: capturedData.document.base64,
    selfieBase64: capturedData.face.base64,
  })
});
```

---

## 🎉 Quick Deploy Commands

**Netlify:**
```bash
yarn build && netlify deploy --prod
```

**Vercel:**
```bash
vercel --prod
```

**Manual:**
```bash
yarn build
# Then upload dist/ folder to your hosting
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify HTTPS is enabled
3. Test camera permissions
4. Ensure all assets are loaded

---

Your app is production-ready! 🚀
