"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
    file: File;
    onFrameExtracted?: (frame: Uint8Array, timestamp: number) => void;
    onVideoCut?: (startTime: number, endTime: number) => void;
    onVideoCutReversed?: (startTime: number, endTime: number) => void;
    onExtractMultipleFrames?: (startTime: number, endTime: number, numFrames: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    file,
    onFrameExtracted,
    onVideoCut,
    onVideoCutReversed,
    onExtractMultipleFrames,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isDraggingStart, setIsDraggingStart] = useState(false);
    const [isDraggingEnd, setIsDraggingEnd] = useState(false);
    const [selectedTime, setSelectedTime] = useState<number | null>(null);
    const [canExtractFrame, setCanExtractFrame] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [numFramesToExtract, setNumFramesToExtract] = useState(10);
    const [isExtractingFrames, setIsExtractingFrames] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(0);

    useEffect(() => {
        if (videoRef.current) {
            const video = videoRef.current;
            video.src = URL.createObjectURL(file);

            const handleLoadedMetadata = () => {
                setDuration(video.duration);
                setEndTime(video.duration);
            };

            video.addEventListener("loadedmetadata", handleLoadedMetadata);

            return () => {
                video.removeEventListener("loadedmetadata", handleLoadedMetadata);
                URL.revokeObjectURL(video.src);
            };
        }
    }, [file]);

    useEffect(() => {
        if (videoRef.current) {
            const video = videoRef.current;

            const handleTimeUpdate = () => {
                setCurrentTime(video.currentTime);

                // Stop playback if we reach the end marker during playback
                if (video.currentTime >= endTime) {
                    video.pause();
                    video.currentTime = endTime;
                    setIsPlaying(false);
                }
            };

            video.addEventListener("timeupdate", handleTimeUpdate);

            return () => {
                video.removeEventListener("timeupdate", handleTimeUpdate);
            };
        }
    }, [endTime]);

    // Check if we can extract a frame
    useEffect(() => {
        setCanExtractFrame(selectedTime !== null);
    }, [selectedTime]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFocused) return;

            if (videoRef.current) {
                const video = videoRef.current;
                // Frame step (assuming 30fps) or second step when shift is pressed
                const frameStep = 1 / 30; // One frame at 30fps
                const secondStep = 1; // One second
                const step = e.shiftKey ? secondStep : frameStep;

                switch (e.key) {
                    case "ArrowLeft":
                        e.preventDefault();
                        const newTimeLeft = Math.max(startTime, currentTime - step);
                        video.currentTime = newTimeLeft;
                        setCurrentTime(newTimeLeft);
                        setSelectedTime(newTimeLeft);
                        break;
                    case "ArrowRight":
                        e.preventDefault();
                        const newTimeRight = Math.min(endTime, currentTime + step);
                        video.currentTime = newTimeRight;
                        setCurrentTime(newTimeRight);
                        setSelectedTime(newTimeRight);
                        break;
                    case "Home":
                        e.preventDefault();
                        video.currentTime = startTime;
                        setCurrentTime(startTime);
                        setSelectedTime(startTime);
                        break;
                    case "End":
                        e.preventDefault();
                        video.currentTime = endTime;
                        setCurrentTime(endTime);
                        setSelectedTime(endTime);
                        break;
                    case " ":
                        e.preventDefault();
                        togglePlay();
                        break;
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [currentTime, startTime, endTime, isPlaying, isFocused]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                // If current time is at or past the end marker during playback, reset to start marker
                if (currentTime >= endTime) {
                    videoRef.current.currentTime = startTime;
                }

                // If current time is before start marker, set to start marker
                if (currentTime < startTime) {
                    videoRef.current.currentTime = startTime;
                }

                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const clickPosition = (offsetX / rect.width) * duration;

            videoRef.current.currentTime = clickPosition;
            setCurrentTime(clickPosition);
            setSelectedTime(clickPosition);
        }
    };

    const handleStartMarkerMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingStart(true);
    };

    const handleEndMarkerMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingEnd(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if ((isDraggingStart || isDraggingEnd) && videoRef.current) {
                const rect = videoRef.current.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const newPosition = Math.max(0, Math.min((offsetX / rect.width) * duration, duration));

                if (isDraggingStart) {
                    const newStartTime = Math.min(newPosition, endTime - 0.5);
                    setStartTime(newStartTime);
                    if (currentTime < newStartTime) {
                        setCurrentTime(newStartTime);
                        if (videoRef.current) videoRef.current.currentTime = newStartTime;
                    }
                }

                if (isDraggingEnd) {
                    const newEndTime = Math.max(newPosition, startTime + 0.5);
                    setEndTime(newEndTime);
                    if (currentTime > newEndTime) {
                        setCurrentTime(newEndTime);
                        if (videoRef.current) videoRef.current.currentTime = newEndTime;
                    }
                }
            }
        };

        const handleMouseUp = () => {
            setIsDraggingStart(false);
            setIsDraggingEnd(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingStart, isDraggingEnd, duration, startTime, endTime, currentTime]);

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }

        if (newVolume === 0) {
            setIsMuted(true);
        } else {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            if (isMuted) {
                videoRef.current.volume = volume;
                setIsMuted(false);
            } else {
                videoRef.current.volume = 0;
                setIsMuted(true);
            }
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const handleExtractFrame = async () => {
        if (selectedTime === null) return;
        await extractFrameAtTime(selectedTime);
    };

    const extractFrameAtTime = async (time: number) => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Save current time
        const originalTime = video.currentTime;

        // Set video to the specified time
        video.currentTime = time;

        // Wait for the video to seek to the new time
        await new Promise<void>((resolve) => {
            const seekedHandler = () => {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw current frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Restore original time
                video.currentTime = originalTime;

                // Remove the event listener
                video.removeEventListener('seeked', seekedHandler);
                resolve();
            };

            video.addEventListener('seeked', seekedHandler);
        });

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
            }, 'image/webp');
        });

        // Convert blob to Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Notify parent component
        if (onFrameExtracted) {
            onFrameExtracted(uint8Array, time);
        }
    };

    const handleCutVideo = () => {
        if (onVideoCut) {
            onVideoCut(startTime, endTime);
        }
    };

    const handleCutReversedVideo = () => {
        if (onVideoCutReversed) {
            onVideoCutReversed(startTime, endTime);
        }
    };

    const jumpToStart = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = startTime;
            setCurrentTime(startTime);
            setSelectedTime(startTime);
        }
    };

    const jumpToEnd = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = endTime;
            setCurrentTime(endTime);
            setSelectedTime(endTime);
        }
    };

    const handleExtractMultipleFrames = async () => {
        if (!onExtractMultipleFrames) return;

        setIsExtractingFrames(true);
        setExtractionProgress(0);

        // Call the parent component's function to extract multiple frames
        onExtractMultipleFrames(startTime, endTime, numFramesToExtract);

        // Simulate progress updates (since we don't have direct access to the actual progress)
        const progressInterval = setInterval(() => {
            setExtractionProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    setIsExtractingFrames(false);
                    return 100;
                }
                return prev + 5;
            });
        }, 200);

        // Clean up interval after 4 seconds (assuming extraction takes about that long)
        setTimeout(() => {
            clearInterval(progressInterval);
            setIsExtractingFrames(false);
        }, 4000);
    };

    return (
        <div className="flex flex-col w-full rounded-lg shadow-xl">

            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-md overflow-hidden mb-4">
                <video
                    ref={videoRef}
                    className="w-full h-full"
                />
            </div>

            {/* Timeline */}
            <div className="mb-4">
                <div
                    className="relative h-16 bg-zinc-800 rounded-md cursor-pointer"
                    onClick={handleTimelineClick}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    tabIndex={0}
                    aria-label="Timeline"
                >
                    {/* Timeline background */}
                    <div className="absolute inset-0 flex items-center px-2">
                        {/* Generate frame markers */}
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="h-8 border-l border-zinc-600 flex-grow" />
                        ))}
                    </div>

                    {/* Selected region */}
                    <div
                        className="absolute h-full bg-blue-500/20"
                        style={{
                            left: `${(startTime / duration) * 100}%`,
                            width: `${((endTime - startTime) / duration) * 100}%`,
                        }}
                    />

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                        <div className="w-3 h-3 bg-white rounded-full -ml-1.5 -mt-1.5" />
                    </div>

                    {/* Start marker */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize"
                        style={{ left: `${(startTime / duration) * 100}%` }}
                        onMouseDown={handleStartMarkerMouseDown}
                    >
                        <div className="absolute top-0 -ml-2 w-4 h-4 bg-blue-500 rounded-sm" />
                        <div className="absolute bottom-0 -ml-2 w-4 h-4 bg-blue-500 rounded-sm" />
                    </div>

                    {/* End marker */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize"
                        style={{ left: `${(endTime / duration) * 100}%` }}
                        onMouseDown={handleEndMarkerMouseDown}
                    >
                        <div className="absolute top-0 -ml-2 w-4 h-4 bg-blue-500 rounded-sm" />
                        <div className="absolute bottom-0 -ml-2 w-4 h-4 bg-blue-500 rounded-sm" />
                    </div>

                    {/* Selected time marker */}
                    {/* {selectedTime !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-yellow-500"
                            style={{ left: `${(selectedTime / duration) * 100}%` }}
                        />
                    )} */}

                    {/* Time indicators */}
                    <div className="absolute -bottom-6 left-0 text-xs text-zinc-400">{formatTime(startTime)}</div>
                    <div className="absolute -bottom-6 right-0 text-xs text-zinc-400">{formatTime(duration)}</div>
                </div>

                {/* Keyboard navigation instructions */}
                <div className="mt-6 text-xs text-zinc-400">
                    <p>Keyboard controls: ← → (frame by frame), Shift+← → (second by second), Home/End, Space (play/pause)</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4 mb-4">
                <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-zinc-800">
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </Button>

                <Button variant="ghost" size="icon" onClick={jumpToStart} className="text-white hover:bg-zinc-800">
                    <SkipBack size={20} />
                </Button>

                <Button variant="ghost" size="icon" onClick={jumpToEnd} className="text-white hover:bg-zinc-800">
                    <SkipForward size={20} />
                </Button>

                <div className="text-sm text-white">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <div className="flex items-center ml-auto">
                    <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-zinc-800">
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </Button>

                    <div className="w-24">
                        <Slider
                            value={[isMuted ? 0 : volume]}
                            min={0}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-zinc-700"
                        />
                    </div>
                </div>
            </div>

            {/* Frame extraction controls */}
            <div className="mb-4 p-4 bg-zinc-800 rounded-md">
                <h3 className="text-white font-medium mb-2">Extract Multiple Frames</h3>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="numFrames" className="text-white text-sm">Number of frames:</label>
                        <input
                            id="numFrames"
                            type="number"
                            min="1"
                            max="100"
                            value={numFramesToExtract}
                            onChange={(e) => setNumFramesToExtract(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                            className="w-16 px-2 py-1 bg-zinc-700 text-white rounded border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <Button
                        onClick={handleExtractMultipleFrames}
                        disabled={isExtractingFrames || !onExtractMultipleFrames}
                        variant="outline"
                        className="flex items-center"
                    >
                        <Download size={16} className="mr-1" />
                        {isExtractingFrames ? `Extracting (${extractionProgress}%)` : 'Extract & Download'}
                    </Button>
                </div>

                {isExtractingFrames && (
                    <div className="mt-2 w-full bg-zinc-700 rounded-full h-2.5">
                        <div
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${extractionProgress}%` }}
                        ></div>
                    </div>
                )}
            </div>

            {/* Cut controls */}
            <div className="flex items-center space-x-4">
                <div className="text-white text-sm">
                    Selection:{" "}
                    <span className="font-medium">
                        {formatTime(startTime)} - {formatTime(endTime)}
                    </span>
                    <span className="text-zinc-400 ml-2">({formatTime(endTime - startTime)})</span>
                </div>

                {canExtractFrame && (
                    <Button
                        onClick={handleExtractFrame}
                        variant="outline"
                    >
                        Extract Frame
                    </Button>
                )}

                <div className="flex space-x-2 ml-auto">
                    <Button onClick={handleCutVideo} variant="outline">
                        Cut Video
                    </Button>
                    <Button
                        onClick={handleCutReversedVideo}
                        variant="outline"
                        className="flex items-center"
                    >
                        <RotateCcw size={16} className="mr-1" />
                        Cut Reversed
                    </Button>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};