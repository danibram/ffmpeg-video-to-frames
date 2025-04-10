'use client';

import { fetchFile } from '@ffmpeg/util';
import JSZip from 'jszip';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useFFmpeg } from '../contexts/FFmpegContext';
import { fileToBlobDownload } from '../utils/fileToBlobDownload';
import { flattenObject } from '../utils/flattenObject';
import { InfoTable } from './InfoTable';
import { VideoEditor } from './VideoEditor';


const Video = () => {
  const [file, setFile] = useState<File | null>(null);
  const { loaded, isLoading } = useFFmpeg();
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [videoInfo, setVideoInfo] = useState<Record<string, unknown> | null>(
    null,
  );
  const { writeFile, runFFprobe, deleteFile, ffmpeg } = useFFmpeg();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);

      const { name } = file;
      if (messageRef.current) messageRef.current.innerHTML = 'Reading file...';

      await writeFile(name, file);
      const probeResult = await runFFprobe(name);
      setVideoInfo(probeResult);
      await deleteFile(name);

      if (messageRef.current) messageRef.current.innerHTML = 'Ready to go!';
    }
  };

  const handleFrameExtracted = async (timestamp: number) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current)
      messageRef.current.innerHTML = `Extracting frame at ${timestamp.toFixed(2)}s...`;

    try {
      const { name } = file;

      // Write the file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Get video duration info
      const videoDuration =
        videoInfo?.format && typeof videoInfo.format === 'object' &&
          'duration' in videoInfo.format
          ? Number(videoInfo.format.duration)
          : 0;

      // Check if this is the last frame of the video
      const isLastFrame =
        videoDuration > 0 && Math.abs(timestamp - videoDuration) < 0.2;

      if (isLastFrame) {
        console.log('Extracting last frame using sseof parameter');
        // Use the -sseof parameter which is better for extracting the last frame
        await ffmpeg.exec([
          '-sseof',
          '-0.1', // Seek 0.1 seconds before the end of file
          '-i',
          name,
          '-update',
          '1',
          '-vframes',
          '1',
          '-q:v',
          '1',
          'extracted_frame.png',
        ]);
      } else {
        // Normal case - extract frame at the specified time
        await ffmpeg.exec([
          '-ss',
          timestamp.toString(),
          '-i',
          name,
          '-frames:v',
          '1',
          '-q:v',
          '1',
          'extracted_frame.png',
        ]);
      }

      // Read the extracted frame
      const frameData = await ffmpeg.readFile('extracted_frame.png');

      // Use the original data
      fileToBlobDownload(
        frameData,
        file.name,
        'image/webp',
        `frame_${timestamp.toFixed(2)}.webp`,
      );

      // Clean up
      await deleteFile('extracted_frame.png');
      await deleteFile(name);

      if (messageRef.current)
        messageRef.current.innerHTML = `Extracted frame at ${timestamp.toFixed(2)}s`;
    } catch (error) {
      console.error('Error extracting frame:', error);
      if (messageRef.current)
        messageRef.current.innerHTML = `Error extracting frame: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
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
        '-i',
        name,
        '-ss',
        startTime.toString(),
        '-t',
        (endTime - startTime).toString(),
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        'cut_video.mp4',
      ]);

      // Read the cut video
      const cutVideo = await ffmpeg.readFile('cut_video.mp4');

      // Download the cut video
      fileToBlobDownload(cutVideo, file.name, 'video/mp4', 'cut.mp4');

      // Clean up
      await deleteFile('cut_video.mp4');
      await deleteFile(name);

      if (messageRef.current)
        messageRef.current.innerHTML = 'Video cut complete!';
    } catch (error) {
      console.error('Error cutting video:', error);
      if (messageRef.current)
        messageRef.current.innerHTML = 'Error cutting video';
    }
  };

  const handleVideoCutReversed = async (startTime: number, endTime: number) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current)
      messageRef.current.innerHTML = 'Cutting and reversing video...';

    try {
      const { name } = file;

      // Write the input file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Cut the video using the specified start and end times and reverse it
      await ffmpeg.exec([
        '-i',
        name,
        '-ss',
        startTime.toString(),
        '-t',
        (endTime - startTime).toString(),
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        'cut_video.mp4',
      ]);

      await ffmpeg.exec([
        '-i',
        'cut_video.mp4',
        '-vf',
        'reverse',
        'cut_reversed_video.mp4',
      ]);

      // Read the cut and reversed video
      const cutReversedVideo = await ffmpeg.readFile('cut_reversed_video.mp4');

      // Download the cut and reversed video
      fileToBlobDownload(
        cutReversedVideo,
        file.name,
        'video/mp4',
        'cut_reversed.mp4',
      );

      // Clean up
      await deleteFile('cut_video.mp4');
      await deleteFile('cut_reversed_video.mp4');
      await deleteFile(name);

      if (messageRef.current)
        messageRef.current.innerHTML = 'Video cut and reversed complete!';
    } catch (error) {
      console.error('Error cutting and reversing video:', error);
      if (messageRef.current)
        messageRef.current.innerHTML = 'Error cutting and reversing video';
    }
  };

  const handleExtractMultipleFrames = async (
    startTime: number,
    endTime: number,
    numFrames: number,
  ) => {
    if (!file || !ffmpeg) return;

    if (messageRef.current)
      messageRef.current.innerHTML = 'Extracting multiple frames...';

    try {
      const { name } = file;
      const extension = 'png'; //"webp"

      // Write the input file to FFmpeg's virtual filesystem
      await writeFile(name, file);

      // Get video duration info
      const videoDuration =
        videoInfo?.format && typeof videoInfo.format === 'object' &&
          'duration' in videoInfo.format
          ? Number(videoInfo.format.duration)
          : 0;

      // Calculate time step between frames
      const timeStep = (endTime - startTime) / (numFrames - 1);

      // Create a zip file for the extracted frames
      const zip = new JSZip();

      // Extract frames at regular intervals
      for (let i = 0; i < numFrames; i++) {
        const frameTime = startTime + i * timeStep;
        const timestamp = frameTime.toFixed(2);

        // Update progress
        if (messageRef.current) {
          messageRef.current.innerHTML = `Extracting frame ${i + 1}/${numFrames} at ${timestamp}s`;
        }

        // Check if this is the last frame or very close to the end
        const isLastOrNearLastFrame =
          i === numFrames - 1 ||
          (videoDuration > 0 && Math.abs(frameTime - videoDuration) < 0.2);

        // Use different extraction method based on frame position
        if (isLastOrNearLastFrame && videoDuration > 0) {
          console.log(`Frame ${i + 1} is near the end, using sseof method`);
          // For the last frame, use the -sseof parameter which is better for extracting it
          await ffmpeg.exec([
            '-sseof',
            '-0.1', // 0.1 seconds from the end
            '-i',
            name,
            '-update',
            '1',
            '-vframes',
            '1',
            '-q:v',
            '1',
            `frame_${i.toString().padStart(3, '0')}_${timestamp}.${extension}`,
          ]);
        } else {
          // Standard method for most frames
          await ffmpeg.exec([
            '-ss',
            timestamp,
            '-i',
            name,
            '-frames:v',
            '1',
            '-q:v',
            '1',
            `frame_${i.toString().padStart(3, '0')}_${timestamp}.${extension}`,
          ]);
        }

        // Read the extracted frame
        const frame = await ffmpeg.readFile(
          `frame_${i.toString().padStart(3, '0')}_${timestamp}.${extension}`,
        );

        // Add frame to zip
        zip.file(`frame_${i.toString().padStart(3, '0')}.${extension}`, frame);
        console.log(
          `Successfully extracted frame ${i + 1} using standard method`,
        );

        // Clean up the frame file
        await deleteFile(
          `frame_${i.toString().padStart(3, '0')}_${timestamp}.${extension}`,
        );
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

      if (messageRef.current)
        messageRef.current.innerHTML = 'Frames extracted and downloaded!';
    } catch (error) {
      console.error('Error extracting frames:', error);
      if (messageRef.current)
        messageRef.current.innerHTML = `Error extracting frames: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
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
      <p ref={messageRef} />

      {file && (
        <>
          <VideoEditor
            file={file}
            onFrameExtracted={handleFrameExtracted}
            onVideoCut={handleVideoCut}
            onVideoCutReversed={handleVideoCutReversed}
            onExtractMultipleFrames={handleExtractMultipleFrames}
          />
        </>
      )}

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

export default Video;
