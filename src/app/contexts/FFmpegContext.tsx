'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface FFmpegContextType {
  ffmpeg: FFmpeg | null;
  loaded: boolean;
  isLoading: boolean;
  load: () => Promise<void>;
  writeFile: (name: string, file: File) => Promise<void>;
  runFFprobe: (name: string) => Promise<Record<string, unknown>>;
  deleteFile: (name: string) => Promise<void>;
}

const FFmpegContext = createContext<FFmpegContextType | null>(null);

export const FFmpegProvider = ({ children }: { children: ReactNode }) => {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Initialize FFmpeg instance on client-side only
  useEffect(() => {
    ffmpegRef.current = new FFmpeg();
  }, []);

  const load = useCallback(async () => {
    if (!ffmpegRef.current) return;

    setIsLoading(true);
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }: { message: string }) => {
      console.log(message);
    });

    await ffmpeg.load();
    setLoaded(true);
    setIsLoading(false);
  }, []);

  const writeFile = async (name: string, file: File) => {
    if (!ffmpegRef.current) return;
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile(name, await fetchFile(file));
  };

  const runFFprobe = async (name: string): Promise<Record<string, unknown>> => {
    if (!ffmpegRef.current) return {};

    const ffmpeg = ffmpegRef.current;
    await ffmpeg.ffprobe([
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      name,
      '-o',
      'output.txt',
    ]);
    const data = await ffmpeg.readFile('output.txt');
    const dataString = new TextDecoder().decode(
      data as AllowSharedBufferSource,
    );
    await ffmpeg.deleteFile('output.txt');
    return JSON.parse(dataString);
  };

  const deleteFile = async (name: string) => {
    if (!ffmpegRef.current) return;

    const ffmpeg = ffmpegRef.current;
    await ffmpeg.deleteFile(name);
  };

  useEffect(() => {
    if (!loaded && ffmpegRef.current) {
      load();
    }
  }, [loaded, load]);

  return (
    <FFmpegContext.Provider
      value={{
        ffmpeg: ffmpegRef.current,
        loaded,
        isLoading,
        load,
        writeFile,
        runFFprobe,
        deleteFile,
      }}
    >
      {children}
    </FFmpegContext.Provider>
  );
};

export const useFFmpeg = () => {
  const context = useContext(FFmpegContext);
  if (!context) {
    throw new Error('useFFmpeg must be used within an FFmpegProvider');
  }
  return context;
};
