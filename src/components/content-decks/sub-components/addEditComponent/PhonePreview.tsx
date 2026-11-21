import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/store/contentDeckSlice';

interface PhonePreviewProps {
    currentCard: Card;
    watchedValues: {
        question?: string;
        mediaType?: '1' | '2'; // '1' for image, '2' for video
        options?: any[]; // Options can be any type, adjust as needed
    };
    totalCards?: number;
    currentCardIndex?: number;
}

const PhonePreview: React.FC<PhonePreviewProps> = ({ currentCard, watchedValues, totalCards = 1, currentCardIndex = 0 }) => {
    const [volume, setVolume] = useState(0.5);
    const [isScreenOff, setIsScreenOff] = useState(false);
    const [showVolumeToast, setShowVolumeToast] = useState(false);
    const [volumeToastValue, setVolumeToastValue] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Update time every second for AOD
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Volume control functions
    const handleVolumeUp = () => {

        setVolume(prev => {
            const newVolume = Math.min(prev + 0.1, 1);
            if (iframeRef.current && currentCard.mediaType === '2') {
                iframeRef.current.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: 'setVolume', args: [newVolume * 100] }),
                    '*'
                );
            }
            showVolumeIndicator(newVolume);
            return newVolume;
        });
    };

    const handleVolumeDown = () => {
        setVolume(prev => {
            const newVolume = Math.max(prev - 0.1, 0);
            if (iframeRef.current && currentCard.mediaType === '2') {
                iframeRef.current.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: 'setVolume', args: [newVolume * 100] }),
                    '*'
                );
            }
            showVolumeIndicator(newVolume);
            return newVolume;
        });
    };

    const showVolumeIndicator = (value: number) => {
        setVolumeToastValue(value);
        setShowVolumeToast(true);
        setTimeout(() => {
            setShowVolumeToast(false);
        }, 2000);
    };

    const handlePowerButton = () => {
        setIsScreenOff(!isScreenOff);
    };

    const getCurrentTime = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const getCurrentTimeWithSecond = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const getCurrentDate = () => {
        return currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate scale based on container - phone dimensions are 280x600
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight - 16; // padding
                const containerWidth = containerRef.current.clientWidth - 16;
                const phoneHeight = 600;
                const phoneWidth = 280;

                // Calculate scale to fit container while maintaining aspect ratio
                const scaleByHeight = containerHeight / phoneHeight;
                const scaleByWidth = containerWidth / phoneWidth;
                const newScale = Math.min(scaleByHeight, scaleByWidth, 1); // Max scale is 1

                setScale(newScale > 0 ? newScale : 1);
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);

        // Use ResizeObserver for container size changes
        const resizeObserver = new ResizeObserver(updateScale);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateScale);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className="relative h-full w-full flex items-center justify-center overflow-hidden">
            {/* iPhone 16 Pro Max display - scales to fit container */}
            <div
                className="relative flex-shrink-0 origin-center"
                style={{
                    width: '280px',
                    height: '600px',
                    transform: `scale(${scale})`
                }}
            >
                {/* Silver Titanium Frame */}
                <div className="absolute z-10 inset-0 bg-gradient-to-b from-gray-500 via-gray-600 to-gray-700 rounded-[2.5rem] shadow-2xl"></div>

                {/* Volume Up Button */}
                <div
                    className="absolute top-[130px] -left-[3.5px] w-[4px] h-[35px] bg-gradient-to-b from-gray-400 to-gray-600 rounded-r shadow-md transform rotate-180 cursor-pointer hover:from-gray-300 hover:to-gray-500 active:from-gray-500 active:to-gray-700"
                    onClick={handleVolumeUp}
                    title="Volume Up"
                ></div>

                {/* Volume Down Button */}
                <div
                    className="absolute top-[175px] -left-[3.5px] w-[4px] h-[35px] bg-gradient-to-b from-gray-400 to-gray-600 rounded-r shadow-md transform rotate-180 cursor-pointer hover:from-gray-300 hover:to-gray-500 active:from-gray-500 active:to-gray-700"
                    onClick={handleVolumeDown}
                    title="Volume Down"
                ></div>

                {/* Action Button (Orange) */}
                <div className="absolute top-[85px] -left-[3.5px] w-[4px] h-[25px] bg-gradient-to-b from-orange-500 to-orange-700 rounded-r shadow-md transform rotate-180"></div>

                {/* Power Button */}
                <div
                    className="absolute top-[145px] -right-[3.5px] w-[4px] h-[45px] bg-gradient-to-b from-gray-400 to-gray-600 rounded-l shadow-md transform rotate-180 cursor-pointer hover:from-gray-300 hover:to-gray-500 active:from-gray-500 active:to-gray-700"
                    onClick={handlePowerButton}
                    title="Power Button"
                ></div>

                {/* Screen with minimal bezels */}
                <div className="absolute  z-20 inset-[6px] bg-black rounded-[2.2rem] overflow-hidden">

                    {/* Dynamic Island - iPhone 16 Pro Max style */}
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-[90px] h-[26px] bg-black-900 rounded-full z-20">
                        {/* Camera Indicator - Blue/Purple Gradient */}
                        <div className="absolute left-[40%] top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-gradient-to-br from-[#323654] to-[#14193f] rounded-full"></div>
                        {/* Face ID Sensor */}
                        <div className="absolute right-[25%] top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                    </div>

                    {/* Status Bar with iPhone 16 Pro Max specific elements */}
                    <div className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-4 text-white text-[12px] font-medium z-20">
                        <div className="flex items-center space-x-1">
                            <span>{getCurrentTime()}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            {/* 5G Icon */}
                            <span className="absolute bottom-[50%] text-[6px] font-semibold">5G+</span>
                            {/* Signal Bars */}
                            <svg className="w-4 h-4" viewBox="0 0 16 12" fill="white">
                                <rect x="0" y="8" width="3" height="4" rx="0.5" />
                                <rect x="4" y="6" width="3" height="6" rx="0.5" />
                                <rect x="8" y="4" width="3" height="8" rx="0.5" />
                                <rect x="12" y="0" width="3" height="12" rx="0.5" />
                            </svg>
                            {/* WiFi */}
                            <svg className="w-4 h-5" viewBox="0 0 16 12" fill="white">
                                <path d="M8 2.5c2.8 0 5.4 1.1 7.4 3.1l-1.4 1.4c-1.6-1.6-3.7-2.5-6-2.5s-4.4.9-6 2.5L.6 5.6C2.6 3.6 5.2 2.5 8 2.5zm0 3c1.9 0 3.7.8 5 2.1l-1.4 1.4c-.9-.9-2.2-1.5-3.6-1.5s-2.7.6-3.6 1.5L3 7.6C4.3 6.3 6.1 5.5 8 5.5zm0 3c.9 0 1.8.4 2.4 1L8 12 5.6 9.5C6.2 8.9 7.1 8.5 8 8.5z" />
                            </svg>
                            {/* Battery */}
                            <div className="relative">
                                <div className="w-5 h-2.5 border border-white rounded-sm">
                                    <div className="absolute inset-0.5 bg-white rounded-[1px]" style={{ width: '75%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instagram/WhatsApp Style Story Progress Indicator - Only show when screen is ON */}
                    {totalCards > 0 && !isScreenOff && (
                        <div className="absolute top-10 left-0 right-0 z-20 px-2">
                            <div className="flex gap-1">
                                {Array.from({ length: totalCards }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="flex-1 h-[2px] rounded-full overflow-hidden bg-white/30"
                                    >
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                index === currentCardIndex
                                                    ? 'bg-white w-full'
                                                    : index < currentCardIndex
                                                        ? 'bg-white w-full'
                                                        : 'bg-transparent w-0'
                                            }`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Volume Indicator Overlay */}
                    {showVolumeToast && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-black/80 rounded-2xl p-4 transition-opacity duration-300 bg-black-600">
                            <div className="flex items-center space-x-3">

                                {/* Volume Icon and Bar */}
                                <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {volumeToastValue === 0 ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        ) : (
                                            <>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                                                {volumeToastValue > 0.3 && (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07" />
                                                )}
                                                {volumeToastValue > 0.6 && (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.07 4.93a10 10 0 010 14.14" />
                                                )}
                                            </>
                                        )}
                                    </svg>
                                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-200"
                                            style={{ width: `${volumeToastValue * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-white text-xs mt-1">{Math.round(volumeToastValue * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Screen Content */}
                    {isScreenOff && (
                        <div className="absolute inset-0 bg-black-800 top-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500 ">
                            {/* Time */}
                            <div className="text-white/80 text-5xl font-light mb-2">
                                {getCurrentTimeWithSecond()}
                            </div>

                            {/* Date */}
                            <div className="text-white/60 text-sm">
                                {getCurrentDate()}
                            </div>


                            {/* Notification indicators */}
                            <div className="absolute bottom-20 flex space-x-4">
                                <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                                <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                                <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                            </div>

                            {/* Tap to wake hint */}
                            <div className="absolute bottom-8 text-white/20 text-xs">
                                Tap power button to wake
                            </div>
                        </div>
                    )}
                    {/* Screen Content - Standard mobile dimensions */}
                    <div className="absolute inset-0">
                        {/* Top Section - 50% height for media */}
                        <div className={`absolute top-0 left-0 right-0 h-[40%] ${(currentCard.mediaType === '1' && currentCard.mediaUrl) ||
                            (currentCard.mediaType === '2' && currentCard.youtubeUrl)
                            ? 'bg-black-800'
                            : 'bg-[#5B9EF7]'
                            }`}>
                            <div className="h-full pt-10">
                                {currentCard.mediaType === '1' && currentCard.mediaUrl ? (
                                    <img
                                        src={currentCard.mediaUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : currentCard.mediaType === '2' && currentCard.youtubeUrl ? (
                                    <div className="w-full h-full bg-black">
                                        {/* Extract video ID from YouTube URL */}
                                        {(() => {
                                            const videoId = currentCard.youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                                            return videoId ? (
                                                <iframe
                                                    ref={iframeRef}
                                                    className="w-full h-full"
                                                    src={`https://www.youtube.com/embed/${videoId}?controls=1&showinfo=0&loop=3&rel=0&modestbranding=0&fs=0&iv_load_policy=3&cc_load_policy=0&color=white&disablekb=1&playsinline=1&enablejsapi=1`}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />

                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <p className="text-white text-sm">Invalid YouTube URL</p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Bottom Section - 50% height */}
                        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-black-900">
                            <div className="flex flex-col items-center px-5 h-full">
                                {/* Answer Button - 20px from top */}
                                <div className="mt-3 flex flex-col items-center flex-shrink-0">
                                    <button className="w-[120px] h-[36px] bg-white text-black-900 rounded-full text-sm font-medium border border-white">
                                        Answer This
                                    </button>
                                    <svg className="w-4 h-4 text-white mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>


                                <div className="w-[90%] bg-black rounded-xl flex flex-col mt-2 flex-1 min-h-0 overflow-hidden">
                                    {/* Question Box - vertical scroll only */}
                                    <div className="bg-[#2A2A2A] p-3 flex-shrink-0 max-h-[84px] overflow-y-auto overflow-x-hidden">
                                        <p className="text-white text-center text-sm font-semibold leading-6 break-words">
                                            {watchedValues.question || 'WRITE YOUR QUESTION HERE. KEEP IT SHORT!'}
                                        </p>
                                    </div>

                                    {/* Options Container - scrollable */}
                                    <div className="w-full bg-white p-4 overflow-y-auto hide-scrollbar flex-1 rounded-b-xl">
                                        {/* Render all options dynamically */}
                                        {(watchedValues.options || currentCard.options).map((option, index) => {
                                            const optionLetter = String.fromCharCode(65 + index); // A=65, B=66, etc.
                                            return (
                                            <div
                                                key={index}
                                                className={`h-12 flex rounded-3xl p-3 border items-center justify-between mb-3 last:mb-0 transition-all duration-200 ${currentCard.questionType === '1' && option.isCorrect
                                                        ? 'bg-[#00D047] border-[#00D047]'
                                                        : 'bg-white border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center flex-1 min-w-0">
                                                    <div className={`w-6 h-6 border rounded-full flex items-center justify-center flex-shrink-0 ${currentCard.questionType === '1' && option.isCorrect
                                                            ? 'border-white bg-white'
                                                            : 'border-black-900 bg-white'
                                                        }`}>
                                                        {currentCard.questionType === '1' && option.isCorrect ? (
                                                            <svg className="w-4 h-4 text-[#00D047]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <span className="text-xs font-medium">{optionLetter}</span>
                                                        )}
                                                    </div>
                                                    <span className={`text-sm ml-3 truncate ${currentCard.questionType === '1' && option.isCorrect ? 'text-white' : 'text-[#666666]'
                                                        }`}>
                                                        {currentCard.questionType === '1' && option.isCorrect ? "Correct" : option.text || `Answer ${index + 1}`}
                                                    </span>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>



                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhonePreview;