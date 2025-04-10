'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';

const InputVideoUrl = ({ loadVideo }: { loadVideo: (url: string) => void }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  return (
    <div className="flex flex-row items-center justify-center gap-4">
      <input
        type="text"
        onChange={(e) => setVideoUrl(e.target.value)}
        className="px-2 py-1 bg-zinc-700 text-white rounded border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button
        variant="outline"
        onClick={() => {
          if (videoUrl) {
            loadVideo(videoUrl);
          }
        }}
      >
        Load from url
      </Button>
    </div>
  );
};

export default InputVideoUrl;
