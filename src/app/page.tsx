'use client';
import dynamic from 'next/dynamic';
const Video = dynamic(() => import('./components/Video'), { ssr: false });

/**
 * Main page component for the Video Editor application
 *
 * This application uses FFmpeg-WASM to process videos directly in the browser.
 * The FFmpeg instance is managed through a React Context (FFmpegContext) to make
 * it available to all components in the application.
 *
 * Key components:
 * - FFmpegProvider: Context provider that manages the FFmpeg instance
 * - Video: Main component that handles file selection and processing
 * - VideoPlayer: Component for playback and interactive controls
 */
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-16 bg-zinc-900 text-white">
      <a
        className={'absolute -top-4 -left-4'}
        style={{ transform: 'rotate(135deg)' }}
        href="https://github.com/danibram/video-editor"
        rel="noopener noreferrer"
        target="_blank"
      >
        <i className="nes-octocat animate" />
      </a>
      <main className="flex flex-col gap-[32px] row-start-2 items-center max-w-4xl">
        <h1 className="text-2xl">Video Editor</h1>
        <Video />
      </main>
      <footer className="flex flex-row gap-4 justify-between items-center mt-20">
        <a
          href="https://www.dbr.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-row gap-4 hover:underline"
        >
          ✨ dbr
        </a>
        <span> 2073 </span>
      </footer>
    </div>
  );
}
