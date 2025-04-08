"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import JSZip from 'jszip';
import { useEffect, useRef, useState } from "react";

const FRAMES = 30;

function flattenObject(obj, parentKey = '') {
  let entries = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      entries = entries.concat(flattenObject(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        entries = entries.concat(flattenObject(item, `${fullKey}[${index}]`));
      });
    } else {
      entries.push([fullKey, value]);
    }
  }

  return entries;
}

type Props = {
  data: [string, string | number | boolean | null][];
};

export const InfoTable: React.FC<Props> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left border border-gray-300">
        <thead className="font-semibold">
          <tr>
            <th className="p-2 border-b">Field</th>
            <th className="p-2 border-b">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map(([field, value], idx) => (
            <tr key={idx} className="border-t hover:bg-gray-50">
              <td className="p-2 border-r font-mono">{field}</td>
              <td className="p-2">{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Video = () => {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const framesRef = useRef<HTMLParagraphElement | null>(null);
  const [frames, setFrames] = useState(-1);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const infoRef = useRef<HTMLParagraphElement | null>(null);
  const [datahuman, setDatahuman] = useState<string | null>(null);
  const load = async () => {
    setIsLoading(true);
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      if (messageRef.current) messageRef.current.innerHTML = message;
    });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
    setLoaded(true);
    setIsLoading(false);
  };

  const transcode = async () => {
    const ffmpeg = ffmpegRef.current;
    // u can use 'https://ffmpegwasm.netlify.app/video/video-15s.avi' to download the video to public folder for testing
    await ffmpeg.writeFile(
      "input.avi",
      await fetchFile(
        "https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi"
      )
    );
    await ffmpeg.exec(["-i", "input.avi", "output.mp4"]);
    const data = (await ffmpeg.readFile("output.mp4")) as any;
    if (videoRef.current)
      videoRef.current.src = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" })
      );
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const ffmpeg = ffmpegRef.current;
    const file = event.target.files?.[0];
    if (file) {
      const zip = new JSZip();

      const { name } = file;
      await ffmpeg.writeFile(name, await fetchFile(file));
      if (messageRef.current) messageRef.current.innerHTML = 'Reading file...';
      await ffmpeg.ffprobe(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", name, "-o", "output.txt"]);
      const data = await ffmpeg.readFile("output.txt");
      const datahuman = new TextDecoder().decode(data);
      setDatahuman(flattenObject(JSON.parse(datahuman)));

      try {
       for (let i = 0; i < FRAMES; i++) {
        setFrames(i);
        const timestamp = (i * 0.1).toFixed(2);
        if (messageRef.current) messageRef.current.innerHTML = `Reading frame ${i}...`;
        await ffmpeg.exec(["-i", name, "-ss", `${timestamp}`, "-frames:v", "1", `${timestamp}.png`]);

        const frame = await ffmpeg.readFile(`${timestamp}.png`);

        zip.file(`${timestamp}.png`, frame.buffer);
        await ffmpeg.deleteFile(`${timestamp}.png`);
       }
      } catch (error) {
        console.error('Error:', error);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${name.split('.')[0]}.zip`;
      link.click();

      if (messageRef.current) messageRef.current.innerHTML = 'Complete';
    }
  };

  useEffect(() => {
    load();
  }, []);

  return loaded ? (
    <div className="flex flex-col items-center justify-center">
      <label htmlFor="uploader" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
        Select a video
      </label>
      <input ref={fileRef} type="file" id="uploader" accept="video/*" onChange={handleFileChange} />
      <br/>
      <p ref={messageRef}></p>
      {frames > -1 && (
        <>
          <br/>
          <progress className="nes-progress is-primary" value={frames} max={FRAMES - 1}></progress>
          <br/>
        </>
      )}
      <InfoTable data={datahuman} />
    </div>
  ) :  (
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
      )

}

export default Video;