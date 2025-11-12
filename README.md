# KYC AutoCapture Frontend (Vite)

A modern KYC verification frontend built with **Vite + React + TypeScript** and **Innovatrics DOT AutoCapture SDK v7.5.1**.

## Features

- ✅ **Document Capture**: Capture government-issued ID documents with auto-detection
- ✅ **Face Capture**: Selfie capture with face detection
- ✅ **Flexible Flow**: Users can capture document or face in any order
- ✅ **Review & Submit**: Preview captured images before submission
- ✅ **Auto-Download**: JPEGs automatically saved to device storage
- ✅ **Multiple Formats**: Blob, Base64, Data URI - ready for any backend
- ✅ **Innovatrics-Ready**: Base64 format matches Innovatrics API requirements
- ✅ **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile
- ✅ **Vite-based**: Fast HMR and optimized builds (no webpack issues!)

## Prerequisites

- **Node.js** 18+ and **Yarn**
- Modern web browser with camera access

## Getting Started

### 1. Install Dependencies

```bash
yarn install
```

### 2. Copy Innovatrics Assets

The assets are automatically copied before running dev server, but you can also run:

```bash
yarn copy-assets
```

This copies:
- UI assets from `@innovatrics/dot-auto-capture-ui/dot-assets` to `public/dot-assets/`
- WASM files (`sam.wasm`) from document and face packages to `public/`

### 3. Configure Environment

Create a `.env.local` (or `.env`) file based on the provided `.env.example` and set the backend base URL:

```
VITE_ID_VERIFICATION_BASE_URL=http://localhost:3000
```

Adjust the value to the environment where the ID verification backend is running.

### 4. Start Development Server

```bash
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production

```bash
yarn build
```

Production files will be in the `dist/` folder.

## Project Structure

```
src/
├── components/
│   ├── DocumentCamera.tsx       # Document camera wrapper
│   ├── DocumentUi.tsx            # Document UI wrapper
│   ├── DocumentAutoCapture.tsx   # Document capture orchestrator
│   ├── FaceCamera.tsx            # Face camera wrapper
│   ├── FaceUi.tsx                # Face UI wrapper
│   └── FaceAutoCapture.tsx       # Face capture orchestrator
├── types/
│   ├── index.ts                  # Step enum and types
│   └── web-components.d.ts       # Web component type declarations
├── App.tsx                       # Main application with flow control
├── App.css                       # Application styles
└── main.tsx                      # Application entry point

public/
├── dot-assets/                   # Innovatrics UI assets (auto-copied)
└── sam.wasm                      # WASM files (auto-copied)
```

## Technology Stack

- **Vite 7.2.2**: Lightning-fast bundler
- **React 19.2**: UI library
- **TypeScript 5.9**: Type safety
- **Innovatrics DOT SDK 7.5.1**: WebAssembly-based auto-capture (no license required for this version)

## How It Works

1. **Welcome Screen**: User starts the verification process
2. **Select Capture**: User chooses to capture document or face (in any order)
3. **Document Capture**: Camera opens with auto-detection overlay and quality checks
4. **Photo Preview**: View captured image with Accept/Retake options
5. **Auto-Download**: JPEG automatically saved to device storage
6. **Face Capture**: Selfie camera with face detection and quality checks
7. **Review**: User reviews both captures before submission
8. **Submit**: Multiple formats ready (Blob, Base64, Data URI) for backend integration

### 📸 Image Formats Available

Each capture provides **4 formats**:
- **Blob**: Raw image data for file uploads
- **Base64**: Ready for Innovatrics API (`{ image: { data: base64 } }`)
- **Data URI**: Full data URI for display or storage
- **Downloaded JPEG**: Auto-saved to device (Gallery on mobile, Downloads on desktop)

See [IMAGE_FORMATS.md](./IMAGE_FORMATS.md) for detailed documentation.

## Notes

- **Version 7.5.1** of Innovatrics SDK does not require a license
- WASM files must be in `public/` root for the SDK to load them
- Camera permissions are required for capture functionality
- This project uses Vite instead of Next.js for better Innovatrics SDK compatibility

## Troubleshooting

### Assets not loading?
Run `yarn copy-assets` manually and restart dev server.

### Camera not working?
Ensure you're using HTTPS in production or localhost in development. Browsers require secure context for camera access.

### TypeScript errors?
The web components are declared in `src/types/web-components.d.ts`. If you still see errors, restart your TypeScript server.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
