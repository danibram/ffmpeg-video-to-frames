"use client"
import dynamic from 'next/dynamic';
const Video = dynamic(() => import("./components/Video"), { ssr: false });

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-2xl">Video to 30 Frames</h1>
        <Video />
      </main>
    </div>
  );
}
