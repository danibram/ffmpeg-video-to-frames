# Video Editor Web Application

A browser-based video editor using FFmpeg-WASM that lets you edit videos directly in your browser without server-side processing.

## Features

- Video trimming (cut specific segments)
- Reverse video segments
- Frame extraction at specific timestamps
- Extract multiple frames across a range
- View comprehensive video metadata
- Completely client-side processing

## Technical Overview

### Core Technologies

- **Next.js**: React framework for the UI
- **FFmpeg-WASM**: WebAssembly version of FFmpeg that runs in the browser
- **JSZip**: For creating and downloading zip files with extracted frames

### Architecture

The application follows a component-based architecture with React Context for state management:

#### Client-Side Only FFmpeg Context

The `FFmpegContext` centralizes FFmpeg functionality and state management, ensuring FFmpeg only runs on the client side:

```tsx
// src/app/contexts/FFmpegContext.tsx
"use client"; // Mark as client component

const FFmpegContext = createContext<FFmpegContextType | null>(null);

export const FFmpegProvider = ({ children }: { children: ReactNode }) => {
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Initialize FFmpeg instance on client-side only
  useEffect(() => {
    ffmpegRef.current = new FFmpeg();
  }, []);

  // Helper methods for common FFmpeg operations
  const writeFile = async (name: string, file: File) => {
    if (!ffmpegRef.current) return;
    // Implementation...
  }

  // More helper methods...

  return (
    <FFmpegContext.Provider value={{...}}>
      {children}
    </FFmpegContext.Provider>
  );
};
```

Key aspects of this implementation:
- Uses the "use client" directive to ensure it runs only on the client
- Initializes FFmpeg inside a useEffect hook to avoid server-side execution
- Handles null checks throughout to prevent errors during server-side rendering
- Provides a consistent API for all components that need to use FFmpeg

This context is injected at the root level in the application:

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <FFmpegProvider>
          {children}
        </FFmpegProvider>
      </body>
    </html>
  );
}
```

#### Key Components

1. **Video Component** (`src/app/components/Video.tsx`)
   - Main container component that handles file selection and FFmpeg operations
   - Uses the FFmpeg context for all video processing
   - Implements frame extraction directly using FFmpeg
   - Provides video processing functions to the VideoPlayer component

2. **VideoPlayer Component** (`src/app/components/VideoPlayer.tsx`)
   - Interactive video player with custom timeline and controls
   - Allows frame-by-frame navigation and segment selection
   - Delegates actual processing work to the parent Video component

3. **InfoTable Component** (`src/app/components/InfoTable.tsx`)
   - Displays metadata extracted from the video file

#### Frame Extraction Process

1. The VideoPlayer component provides UI controls for selecting timestamps
2. When a user requests a frame extraction:
   - VideoPlayer calls the parent Video component's `handleFrameExtracted` function with the timestamp
   - Video component uses FFmpeg to extract the exact frame at that timestamp
   - The extracted frame is packaged in a zip file and offered for download

This architecture separates UI concerns from processing logic:
- VideoPlayer handles user interaction and visual feedback
- Video component handles FFmpeg operations and file management
- FFmpegContext provides consistent access to the FFmpeg instance

## Development

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### How FFmpeg Processing Works

1. The FFmpeg WASM module is loaded once when the application starts (client-side only)
2. When a video is selected, it's loaded into FFmpeg's virtual filesystem
3. Operations are performed directly on the virtual filesystem
4. Results are extracted and provided to the user as downloads
5. All processing happens entirely in the browser

## Browser Compatibility

This application requires a modern browser with WebAssembly support. For best performance:
- Chrome/Edge/Brave (Chromium-based browsers)
- Firefox
- Safari (14+)

## Limitations

- Processing large videos may be slow depending on the client's hardware
- Some advanced FFmpeg features may have limited browser support
- Must run in browser environment - FFmpeg-WASM cannot run during server-side rendering
