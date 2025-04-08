"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import JSZip from 'jszip';
import { useEffect, useRef, useState } from "react";
import { flattenObject, type FlattenedObject } from "../utils/flattenObject";
import { InfoTable } from "./InfoTable";

const FRAMES = 30;

const downloadURL = (data: string, fileName: string) => {
  const a = document.createElement('a')
  a.href = data
  a.download = fileName
  document.body.appendChild(a)
  a.style.display = 'none'
  a.click()
  a.remove()
}

const downloadBlob = (data: Uint8Array<ArrayBufferLike>, fileName: string, mimeType: string) => {

  const blob = new Blob([data], {
    type: mimeType
  })

  const url = window.URL.createObjectURL(blob)

  downloadURL(url, fileName)

  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

const Video = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const [frames, setFrames] = useState(-1);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [datahuman, setDatahuman] = useState<FlattenedObject[] | null>(null);
  const load = async () => {
    setIsLoading(true);
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      if (messageRef.current) messageRef.current.innerHTML = message;
    });

    await ffmpeg.load();
    setLoaded(true);
    setIsLoading(false);
  };

  const extractFrames = async (nFrames: number, file: File, onFrame: (n: number) => void): Promise<Uint8Array<ArrayBufferLike>[]> => {
    if (messageRef.current) messageRef.current.innerHTML = `Extracting frames...`;
    const frames: Uint8Array<ArrayBufferLike>[] = [];
    const ffmpeg = ffmpegRef.current;
    const { name } = file;
    await ffmpeg.writeFile(name, await fetchFile(file));
    for (let i = 0; i < nFrames; i++) {
      onFrame(i);
      const timestamp = (i * 0.1).toFixed(2);

      await ffmpeg.exec(["-ss", `${timestamp}`, "-i", name, "-frames:v", "1", `${timestamp}.webp`]);

      const frame = await ffmpeg.readFile(`${timestamp}.webp`) as Uint8Array;

      frames.push(frame);
      await ffmpeg.deleteFile(`${timestamp}.webp`);
    }
    await ffmpeg.deleteFile(name);
    if (messageRef.current) messageRef.current.innerHTML = `Complete`;
    return frames;
  }

  const zipFramesAndDownload = async (frames: Uint8Array<ArrayBufferLike>[], name: string) => {
    const zip = new JSZip();
    frames.forEach((frame, i) => {
      zip.file(`${i}.webp`, frame);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content)
    downloadURL(url, `${name}.zip`)
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const ffmpeg = ffmpegRef.current;
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);

      const { name } = file;
      await ffmpeg.writeFile(name, await fetchFile(file));
      if (messageRef.current) messageRef.current.innerHTML = 'Reading file...';
      await ffmpeg.ffprobe(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", name, "-o", "output.txt"]);
      const data = await ffmpeg.readFile("output.txt");
      const datahuman = new TextDecoder().decode(data as AllowSharedBufferSource);
      setDatahuman(flattenObject(JSON.parse(datahuman)));
      await ffmpeg.deleteFile(`output.txt`);
      await ffmpeg.deleteFile(name);
      if (messageRef.current) messageRef.current.innerHTML = 'Ready to go!';

      // let frames: Uint8Array<ArrayBufferLike>[] = [];
      // try {
      //   frames = await extractFrames(FRAMES, file, (n) => setFrames(n));
      // } catch (error) {
      //   console.error('Error:', error);
      // }

      // await zipFramesAndDownload(frames, name.split('.')[0]);
      // if (messageRef.current) messageRef.current.innerHTML = 'Complete';
    }
  };

  const handleExtractFramesAndDownload = async (nFrames: number, file: File) => {
    if (messageRef.current) messageRef.current.innerHTML = 'Extracting...';
    if (nFrames === 1) {
      const frame = await extractFrames(nFrames, file, () => ({}));
      downloadBlob(frame[0], `${file.name.split('.')[0]}.webp`, 'image/webp');
    } else {
      let frames: Uint8Array<ArrayBufferLike>[] = [];
      try {
        frames = await extractFrames(nFrames, file, (n) => setFrames(n));
      } catch (error) {
        console.error('Error:', error);
      }

      await zipFramesAndDownload(frames, file.name.split('.')[0]);
    }
    if (messageRef.current) messageRef.current.innerHTML = 'Complete';


  }



  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded]);

  return loaded ? (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex flex-row items-center justify-center gap-4">
        <label htmlFor="uploader" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          {file ? "Change video" : "Select a video"}
        </label>
        <input ref={fileRef} type="file" id="uploader" accept="video/*" onChange={handleFileChange} />
        {file && (
          <>
            <p>{file.name}</p>
            <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={async () => {
              setFile(null)
              if (fileRef.current) {
                fileRef.current.value = ''
              }
              const ffmpeg = ffmpegRef.current;
              await ffmpeg.terminate();
              setLoaded(false);
              setFile(null);
              setDatahuman(null);
              setFrames(-1);
            }}>X</button>
          </>
        )}
      </div>
      <p ref={messageRef}></p>
      {file && (<div className="flex flex-row items-center justify-center gap-4">
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => {
          handleExtractFramesAndDownload(1, file);
        }}>Extract first frame</button>
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => {
          handleExtractFramesAndDownload(30, file);
        }}>Extract 30 frames</button>
      </div>
      )}
      {frames > -1 && (
        <>
          <br />
          <progress className="nes-progress is-primary" value={frames} max={FRAMES - 1}></progress>
          <br />
          <p>{`Extracted ${frames} frames`}</p>
        </>
      )}
      {datahuman && (
        <InfoTable data={datahuman} />
      )}
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
        <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
      </svg>
    </span>
  ) : (
    <div className="flex flex-col items-center justify-center">
      <p>No video selected</p>
    </div>
  )

}

export default Video;