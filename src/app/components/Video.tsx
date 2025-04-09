"use client";

import JSZip from 'jszip';
import { useRef, useState } from "react";
import { useFFmpeg } from "../contexts/FFmpegContext";
import { flattenObject, type FlattenedObject } from "../utils/flattenObject";
import { InfoTable } from "./InfoTable";
import { VideoPlayer } from "./VideoPlayer";

const Video = () => {
  const [file, setFile] = useState<File | null>(null);
  const { loaded, isLoading } = useFFmpeg();
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [datahuman, setDatahuman] = useState<FlattenedObject[] | null>(null);
  const { writeFile, runFFprobe, deleteFile, ffmpeg } = useFFmpeg();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);

      const { name } = file;
      if (messageRef.current) messageRef.current.innerHTML = 'Reading file...';

      await writeFile(name, file);
      const probeResult = await runFFprobe(name);
      setDatahuman(flattenObject(probeResult));
      await deleteFile(name);

      if (messageRef.current) messageRef.current.innerHTML = 'Ready to go!';
    }
  };

  const extractFrameAtTime = async (timestamp: number) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current) messageRef.current.innerHTML = `Extracting frame at ${timestamp.toFixed(2)}s...`;

    try {
      const { name } = file;

      // Write the file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Extract frame at the specified time using FFmpeg
      await ffmpeg.exec([
        "-ss", timestamp.toString(),
        "-i", name,
        "-frames:v", "1",
        "-q:v", "2",
        "extracted_frame.webp"
      ]);

      // Read the extracted frame
      const frameData = await ffmpeg.readFile("extracted_frame.webp");

      const blob = new Blob([frameData], { type: 'image/webp' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame_${timestamp.toFixed(2)}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clean up
      await deleteFile("extracted_frame.webp");
      await deleteFile(name);

      if (messageRef.current) messageRef.current.innerHTML = `Extracted frame at ${timestamp.toFixed(2)}s`;
    } catch (error) {
      console.error('Error extracting frame:', error);
      if (messageRef.current) messageRef.current.innerHTML = 'Error extracting frame';
    }
  };

  const handleFrameExtracted = async (timestamp: number) => {
    await extractFrameAtTime(timestamp);
  };

  const handleVideoCut = async (startTime: number, endTime: number) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current) messageRef.current.innerHTML = 'Cutting video...';

    try {
      const { name } = file;

      // Write the input file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Cut the video using the specified start and end times
      // Using -c:v libx264 for better quality and compatibility
      await ffmpeg.exec([
        "-i", name,
        "-ss", startTime.toString(),
        "-t", (endTime - startTime).toString(),
        "-c:v", "libx264",
        "-preset", "fast",
        "cut_video.mp4"
      ]);

      // Read the cut video
      const cutVideo = await ffmpeg.readFile("cut_video.mp4");

      // Download the cut video
      const blob = new Blob([cutVideo], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.split('.')[0]}_cut.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clean up
      await deleteFile("cut_video.mp4");
      await deleteFile(name);

      if (messageRef.current) messageRef.current.innerHTML = 'Video cut complete!';
    } catch (error) {
      console.error('Error cutting video:', error);
      if (messageRef.current) messageRef.current.innerHTML = 'Error cutting video';
    }
  };

  const handleVideoCutReversed = async (startTime: number, endTime: number) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current) messageRef.current.innerHTML = 'Cutting and reversing video...';

    try {
      const { name } = file;

      // Write the input file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Cut the video using the specified start and end times and reverse it
      await ffmpeg.exec([
        "-i", name,
        "-ss", startTime.toString(),
        "-t", (endTime - startTime).toString(),
        "-c:v", "libx264",
        "-preset", "fast",
        "cut_video.mp4"
      ]);

      await ffmpeg.exec([
        "-i", "cut_video.mp4",
        "-vf", "reverse",
        "cut_reversed_video.mp4"
      ]);

      // Read the cut and reversed video
      const cutReversedVideo = await ffmpeg.readFile("cut_reversed_video.mp4");

      // Download the cut and reversed video
      const blob = new Blob([cutReversedVideo], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.split('.')[0]}_cut_reversed.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clean up
      await deleteFile("cut_video.mp4");
      await deleteFile("cut_reversed_video.mp4");
      await deleteFile(name);

      if (messageRef.current) messageRef.current.innerHTML = 'Video cut and reversed complete!';
    } catch (error) {
      console.error('Error cutting and reversing video:', error);
      if (messageRef.current) messageRef.current.innerHTML = 'Error cutting and reversing video';
    }
  };

  const handleExtractMultipleFrames = async (startTime: number, endTime: number, numFrames: number) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current) messageRef.current.innerHTML = 'Extracting multiple frames...';

    try {
      const { name } = file;

      // Write the input file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Calculate time step between frames
      const timeStep = (endTime - startTime) / (numFrames - 1);

      // Create a zip file for the extracted frames
      const zip = new JSZip();

      // Extract frames at regular intervals
      for (let i = 0; i < numFrames; i++) {
        const frameTime = startTime + (i * timeStep);
        const timestamp = frameTime.toFixed(2);

        // Update progress
        if (messageRef.current) {
          messageRef.current.innerHTML = `Extracting frame ${i + 1}/${numFrames} at ${timestamp}s`;
        }

        // Extract frame at the specified time
        await ffmpeg.exec([
          "-ss", timestamp,
          "-i", name,
          "-frames:v", "1",
          "-q:v", "2",
          `frame_${i.toString().padStart(3, '0')}_${timestamp}.webp`
        ]);

        // Read the extracted frame
        const frame = await ffmpeg.readFile(`frame_${i.toString().padStart(3, '0')}_${timestamp}.webp`);

        // Add frame to zip
        zip.file(`frame_${i.toString().padStart(3, '0')}_${timestamp}.webp`, frame);

        // Clean up the frame file
        await deleteFile(`frame_${i.toString().padStart(3, '0')}_${timestamp}.webp`);
      }

      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.split('.')[0]}_frames.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clean up
      await deleteFile(name);

      if (messageRef.current) messageRef.current.innerHTML = 'Frames extracted and downloaded!';
    } catch (error) {
      console.error('Error extracting frames:', error);
      if (messageRef.current) messageRef.current.innerHTML = 'Error extracting frames';
    }
  };

  return loaded ? (
    <div className="bg-zync-900 text-white flex flex-col items-center justify-center gap-4">
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
              setDatahuman(null);
            }}>X</button>
          </>
        )}
      </div>
      <p ref={messageRef}></p>

      {file && (
        <>
          <VideoPlayer
            file={file}
            onFrameExtracted={handleFrameExtracted}
            onVideoCut={handleVideoCut}
            onVideoCutReversed={handleVideoCutReversed}
            onExtractMultipleFrames={handleExtractMultipleFrames}
          />
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