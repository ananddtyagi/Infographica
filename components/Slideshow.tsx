"use client";

import { saveStory } from "@/lib/client-db";
import { Slide, StoredStory } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SlideMediaProps {
    slide: Slide;
    onRetry: () => void;
    isRetrying: boolean;
}

function SlideMedia({ slide, onRetry, isRetrying }: SlideMediaProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadedRef = useRef(false);

    // Effect mainly for timeout management
    useEffect(() => {
        // We rely on the parent keying to reset state on URL/Slide changes.
        // So here we just handle the timeout logic.

        if (slide.assetUrl && slide.type === "image") {
            // Only set timeout if not already loaded (race condition protection)
            if (!isLoadedRef.current) {
                if (timerRef.current) clearTimeout(timerRef.current);

                timerRef.current = setTimeout(() => {
                    if (!isLoadedRef.current) {
                        setHasError(true);
                        setIsLoading(false);
                    }
                }, 10000);
            }
        } else if (!slide.assetUrl) {
            // If no asset, we are technically 'loading' (generating), but not waiting for an image load event.
            // We don't set a timeout here because generation might take longer than 10s and is handled by parent/backend.
            setIsLoading(false);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [slide.assetUrl, slide.type]);

    const handleLoad = () => {
        isLoadedRef.current = true;
        setIsLoading(false);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleError = () => {
        isLoadedRef.current = true; // Mark as done so timeout doesn't fire
        setIsLoading(false);
        setHasError(true);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const isGenerating = (!slide.assetUrl || slide.assetUrl === "") && !slide.failed;

    // Show retry if:
    // 1. Explicit failure (slide.failed)
    // 2. Local error (hasError)
    // 3. Placeholder/Empty url AND not generating
    const isPlaceholder = !slide.assetUrl || slide.assetUrl === "" || slide.assetUrl === "/placeholder.png" || slide.failed || hasError;
    const shouldShowRetry = isPlaceholder && !isGenerating;

    const isOverloaded = slide.errorMessage?.includes("503") || slide.errorMessage?.includes("overloaded") || slide.errorMessage?.includes("UNAVAILABLE");

    // If generating, we want to show the specific generating UI, not the "image loading" spinner.
    // "isLoading" tracks the image tag loading. 
    // If assetUrl is empty, isLoading is set to false by effect, but we render the "Generating" UI based on isGenerating.

    return (
        <div className="w-full h-full relative">
            {slide.type === "video" ? (
                <>
                    {slide.assetUrl && slide.assetUrl !== "" && (
                        <video
                            src={slide.assetUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            onCanPlay={handleLoad}
                            onError={handleError}
                        />
                    )}
                    {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                            <div className="w-10 h-10 border-2 border-gray-200 dark:border-gray-800 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Video is being created!</p>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {slide.assetUrl && slide.assetUrl !== "" && (
                        <img
                            src={slide.assetUrl}
                            alt={slide.title}
                            className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    )}
                    {isLoading && !hasError && slide.assetUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                            <div className="w-10 h-10 border-2 border-gray-200 dark:border-gray-800 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin"></div>
                        </div>
                    )}
                    {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                            <div className="w-10 h-10 border-2 border-gray-200 dark:border-gray-800 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Image is being created!</p>
                        </div>
                    )}
                </>
            )}

            {/* Retry Overlay */}
            {shouldShowRetry && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1a1a1a] z-10">
                    <div className="text-center p-6">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {slide.errorMessage || `${slide.type === "video" ? "Video" : "Image"} failed to load`}
                        </p>
                        <div className="flex flex-col gap-3 items-center">
                            <button
                                onClick={onRetry}
                                disabled={isRetrying}
                                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-500 dark:bg-gray-100 dark:hover:bg-gray-200 dark:disabled:bg-gray-600 text-white dark:text-gray-900 rounded-md font-medium flex items-center gap-2 transition-colors"
                            >
                                <RotateCw className={`w-5 h-5 ${isRetrying ? "animate-spin" : ""}`} />
                                {isRetrying ? "Retrying..." : "Retry Generation"}
                            </button>

                            {isOverloaded && (
                                <button
                                    onClick={() => window.dispatchEvent(new Event('open-key-settings'))}
                                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                >
                                    Model overloaded? Try a different model
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface SlideshowProps {
    story: StoredStory;
    onReset: () => void;
    loadingFacts?: string[];
}

export function Slideshow({ story, onReset, loadingFacts = [] }: SlideshowProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    // Initialize slides from props, but keep local state for optimistic updates during retry
    const [slides, setSlides] = useState(story.slides);
    const [retrying, setRetrying] = useState<number | null>(null);

    // Loading state for facts cycling
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

    const presets = [
        "Researching the topic...",
        "Looking through my files...",
        "Making some images..."
    ];

    const loadingMessages = [...presets, ...loadingFacts];

    useEffect(() => {
        // Reset index when messages change to avoid out of bounds
        setLoadingMessageIndex(prev => prev % loadingMessages.length);
    }, [loadingMessages.length]);

    useEffect(() => {
        if (!slides || slides.length === 0) {
            const interval = setInterval(() => {
                setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
            }, 5000); // Cycle every 5s
            return () => clearInterval(interval);
        }
    }, [slides, loadingMessages.length]);

    // Update local slides when prop changes (e.g. parent finishes generation)
    useEffect(() => {
        setSlides(story.slides);
    }, [story.slides]);

    const nextSlide = useCallback(() => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    }, [currentIndex, slides.length]);

    const prevSlide = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") {
                nextSlide();
            } else if (e.key === "ArrowLeft") {
                prevSlide();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nextSlide, prevSlide]);

    const handleRetry = async (slideIndex: number) => {
        if (!story.id) {
            alert("Cannot retry - story not saved");
            return;
        }

        setRetrying(slideIndex);
        try {
            const apiKey = localStorage.getItem("gemini_api_key");
            const videoModel = localStorage.getItem("gemini_video_model");
            const imageModel = localStorage.getItem("gemini_image_model") || "gemini-3-pro-image-preview";
            const style = story.style || "drawing"; // fallback style
            const slide = slides[slideIndex];

            let assetUrl = "";

            if (slide.type === "image") {
                const res = await fetch("/api/generate-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: slide.imagePrompt, style, apiKey, model: imageModel }),
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.details || errorData.error || "Failed to generate image");
                }
                const data = await res.json();
                assetUrl = data.assetUrl;
            } else if (slide.type === "video") {
                const res = await fetch("/api/generate-video", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: slide.videoPrompt, style, apiKey, model: videoModel }),
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    if (res.status === 429 || errorData.error === "VIDEO_RATE_LIMIT_EXCEEDED") {
                        throw new Error("Video rate limit exceeded");
                    }
                    throw new Error("Failed to generate video");
                }
                const data = await res.json();
                assetUrl = data.assetUrl;
            }

            if (assetUrl) {
                const updatedSlides = [...slides];
                updatedSlides[slideIndex] = {
                    ...updatedSlides[slideIndex],
                    assetUrl: assetUrl,
                    failed: false,
                    errorMessage: undefined
                };
                setSlides(updatedSlides);

                // Save to DB
                const updatedStory = { ...story, slides: updatedSlides };
                await saveStory(updatedStory);
            } else {
                throw new Error("No asset URL returned");
            }

        } catch (error: any) {
            console.error("Error retrying asset:", error);
            const updatedSlides = [...slides];
            updatedSlides[slideIndex] = {
                ...updatedSlides[slideIndex],
                failed: true,
                errorMessage: error.message || "Retry failed"
            };
            setSlides(updatedSlides);
        } finally {
            setRetrying(null);
        }
    };

    const currentSlide = slides[currentIndex];

    // Safety check: if no slides yet, show loading state
    if (!currentSlide || slides.length === 0) {
        return (
            <div className="relative w-full min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin mb-8"></div>

                <div className="max-w-md text-center">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={loadingMessageIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 font-medium"
                        >
                            {loadingMessages[loadingMessageIndex]}
                        </motion.p>
                    </AnimatePresence>

                    {loadingFacts.length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-4 animate-pulse">
                            Starting research...
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
            {/* Header with Infographica branding */}
            <div className="w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 py-3 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        title="Home"
                    >
                        <Home className="w-5 h-5" />
                        <span className="hidden md:inline font-medium">Home</span>
                    </button>

                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Infographica
                    </h1>

                    <div className="w-20" /> {/* Spacer for centering */}
                </div>
            </div>

            {/* Lesson name */}
            <div className="w-full py-6 px-6 text-center border-b border-gray-100 dark:border-gray-900">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {story.topic}
                </h2>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-start md:justify-center pb-8">
                <div className="w-full max-w-4xl">
                    {/* Image/Video Container with Arrows */}
                    <div className="relative w-full px-0 md:px-0 mb-4 md:mb-8 md:flex md:items-center md:gap-4">
                        {/* Left Arrow - Outside on desktop, overlayed on mobile */}
                        <button
                            onClick={prevSlide}
                            disabled={currentIndex === 0}
                            className="absolute md:relative left-2 md:left-0 top-1/2 md:top-auto -translate-y-1/2 md:translate-y-0 z-20 p-2 md:p-3 rounded-full bg-white/70 md:bg-white dark:bg-black/70 md:dark:bg-[#1a1a1a] backdrop-blur-sm md:backdrop-blur-none border border-gray-300/50 md:border-gray-200 dark:border-gray-700/50 md:dark:border-gray-800 hover:bg-white/90 md:hover:bg-gray-50 dark:hover:bg-black/90 md:dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-20 md:disabled:opacity-30 disabled:cursor-not-allowed shadow-lg md:shadow-none"
                            title="Previous slide (←)"
                        >
                            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                        </button>

                        <div className="relative w-full aspect-video bg-white dark:bg-[#1a1a1a] md:rounded-lg overflow-hidden border-y md:border border-gray-200 dark:border-gray-800">

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    <SlideMedia
                                        key={`${currentIndex}-${currentSlide.assetUrl || 'empty'}`}
                                        slide={currentSlide}
                                        onRetry={() => handleRetry(currentIndex)}
                                        isRetrying={retrying === currentIndex}
                                    />
                                </motion.div>
                            </AnimatePresence>

                        </div>

                        {/* Right Arrow - Outside on desktop, overlayed on mobile */}
                        <button
                            onClick={nextSlide}
                            disabled={currentIndex === slides.length - 1}
                            className="absolute md:relative right-2 md:right-0 top-1/2 md:top-auto -translate-y-1/2 md:translate-y-0 z-20 p-2 md:p-3 rounded-full bg-white/70 md:bg-white dark:bg-black/70 md:dark:bg-[#1a1a1a] backdrop-blur-sm md:backdrop-blur-none border border-gray-300/50 md:border-gray-200 dark:border-gray-700/50 md:dark:border-gray-800 hover:bg-white/90 md:hover:bg-gray-50 dark:hover:bg-black/90 md:dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-20 md:disabled:opacity-30 disabled:cursor-not-allowed shadow-lg md:shadow-none"
                            title="Next slide (→)"
                        >
                            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                        </button>
                    </div>

                    {/* Text Content Below Image */}
                    <div className="w-full max-w-3xl mx-auto text-center space-y-6 px-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`text-${currentIndex}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                {/* Progress indicators */}
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    {slides.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`h-1.5 rounded-full transition-all duration-200 ${idx === currentIndex
                                                ? "w-6 bg-gray-900 dark:bg-gray-100"
                                                : "w-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
                                                }`}
                                            title={`Go to slide ${idx + 1}`}
                                        />
                                    ))}
                                </div>

                                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                    {currentSlide.title}
                                </h3>
                                <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
                                    {currentSlide.content}
                                </p>

                                {/* Slide counter */}
                                <p className="text-sm text-gray-400 dark:text-gray-600 mt-6">
                                    Slide {currentIndex + 1} of {slides.length}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
