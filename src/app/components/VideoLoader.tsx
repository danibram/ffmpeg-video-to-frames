'use client';

import { fetchFile } from '@ffmpeg/util';
import type React from 'react';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useFFmpeg } from '../contexts/FFmpegContext';
import { flattenObject } from '../utils/flattenObject';
import { InfoTable } from './InfoTable';
import InputVideoUrl from './InputVideoUrl';
import Video from './Video';
const VideoLoader = () => {
  const [file, setFile] = useState<File | null>(null);
  const { loaded, isLoading } = useFFmpeg();
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [videoInfo, setVideoInfo] = useState<Record<string, unknown> | null>(
    null,
  );
  const { writeFile, runFFprobe, deleteFile } = useFFmpeg();

  const extractInfoFromVideo = async (file: File) => {
    const { name } = file;
    await writeFile(name, file);
    const probeResult = await runFFprobe(name);
    setVideoInfo(probeResult);
    await deleteFile(name);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);

      if (messageRef.current) messageRef.current.innerHTML = 'Reading file...';

      await extractInfoFromVideo(file);

      if (messageRef.current) messageRef.current.innerHTML = 'Ready to go!';
    }
  };

  const handleLoadVideo = async (url: string) => {
    const fileFetched = await fetchFile(url);
    const fileName = url.split('/').pop() || 'video.mp4';
    const file = new File([fileFetched], fileName, { type: 'video/mp4' });
    setFile(file);

    if (messageRef.current) messageRef.current.innerHTML = 'Reading file...';

    await extractInfoFromVideo(file);

    if (messageRef.current) messageRef.current.innerHTML = 'Ready to go!';
  };

  const videoDuration =
    videoInfo?.format &&
    typeof videoInfo.format === 'object' &&
    'duration' in videoInfo.format
      ? Number(videoInfo.format.duration)
      : 0;

  return loaded ? (
    <div className="bg-zync-900 text-white flex flex-col items-center justify-center gap-4">
      <div className="flex flex-row items-center justify-center gap-4">
        {!file && (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-row items-center justify-center gap-4">
              <label
                htmlFor="uploader"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
              >
                {file ? 'Change video' : 'Select a video'}
              </label>
              <input
                ref={fileRef}
                type="file"
                id="uploader"
                accept="video/*"
                onChange={handleFileChange}
              />
            </div>
            <p>or</p>
            <div className="flex flex-row items-center justify-center gap-4">
              <InputVideoUrl loadVideo={handleLoadVideo} />
            </div>
          </div>
        )}
        {file && (
          <>
            <p>{file.name}</p>
            <Button
              variant="destructive"
              onClick={async () => {
                setFile(null);
                if (fileRef.current) {
                  fileRef.current.value = '';
                }
                setVideoInfo(null);
              }}
            >
              X
            </Button>
          </>
        )}
      </div>

      {file && <Video file={file} videoDuration={videoDuration} />}

      {videoInfo && <InfoTable data={flattenObject(videoInfo)} />}
    </div>
  ) : isLoading ? (
    <span className="animate-spin ml-3">
      <svg
        viewBox="0 0 1024 1024"
        focusable="false"
        data-icon="loading"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z" />
      </svg>
    </span>
  ) : (
    <div className="flex flex-col items-center justify-center">
      <p>No video selected</p>
    </div>
  );
};

export default VideoLoader;
