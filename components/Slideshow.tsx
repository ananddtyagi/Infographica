"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw, Home } from "lucide-react";

interface Slide {
    title: string;
    content: string;
    imagePrompt: string;
    videoPrompt?: string;
    type: "image" | "video";
    assetUrl: string;
    failed?: boolean;
}

interface Story {
    id?: string;
    topic: string;
    narrative: string;
    slides: Slide[];
}

interface SlideshowProps {
    story: Story;
    onReset: () => void;
}

export function Slideshow({ story, onReset }: SlideshowProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slides, setSlides] = useState(story.slides);
    const [retrying, setRetrying] = useState<number | null>(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const loadTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            const response = await fetch("/api/retry-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    storyId: story.id,
                    slideIndex,
                    prompt: slides[slideIndex].type === "video" ? slides[slideIndex].videoPrompt || slides[slideIndex].imagePrompt : slides[slideIndex].imagePrompt,
                    type: slides[slideIndex].type,
                }),
            });

            if (!response.ok) {
                throw new Error("Retry failed");
            }

            const data = await response.json();

            const updatedSlides = [...slides];
            updatedSlides[slideIndex] = {
                ...updatedSlides[slideIndex],
                assetUrl: data.assetUrl,
                failed: data.failed,
            };
            setSlides(updatedSlides);
        } catch (error) {
            console.error("Error retrying image:", error);
            alert("Failed to retry image generation. Please try again.");
        } finally {
            setRetrying(null);
        }
    };

    const currentSlide = slides[currentIndex];

    // Reset loading state when slide changes
    useEffect(() => {
        setImageLoading(true);
        setImageError(false);

        // Clear any existing timer
        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
        }

        // Set error after 10 seconds if image hasn't loaded
        if (currentSlide.type === "image") {
            loadTimerRef.current = setTimeout(() => {
                setImageError(true);
                setImageLoading(false);
            }, 10000);
        }

        return () => {
            if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
                loadTimerRef.current = null;
            }
        };
    }, [currentIndex, currentSlide.assetUrl, currentSlide.type]);

    const handleImageLoad = () => {
        setImageLoading(false);
        // Clear the timeout since image loaded successfully
        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
        }
    };

    const handleImageError = () => {
        setImageLoading(false);
        setImageError(true);
        // Clear the timeout since we're handling the error
        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
        }
    };

    const isPlaceholder = !currentSlide.assetUrl || currentSlide.assetUrl === "" || currentSlide.assetUrl === "/placeholder.png" || currentSlide.failed || imageError;

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
            <div className="flex-1 flex items-center justify-center px-4 pb-8">
                <div className="w-full max-w-6xl">
                    {/* Navigation and Image Container */}
                    <div className="relative flex items-center justify-center gap-4 md:gap-8 mb-8">
                        {/* Left Arrow */}
                        <button
                            onClick={prevSlide}
                            disabled={currentIndex === 0}
                            className="p-3 md:p-4 rounded-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous slide (←)"
                        >
                            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                        </button>

                        {/* Image/Video Container */}
                        <div className="relative w-full max-w-3xl aspect-video bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    {currentSlide.type === "video" ? (
                                        <video
                                            src={currentSlide.assetUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>
                                            {currentSlide.assetUrl && currentSlide.assetUrl !== "" && (
                                                <img
                                                    src={currentSlide.assetUrl}
                                                    alt={currentSlide.title}
                                                    className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                                                    onLoad={handleImageLoad}
                                                    onError={handleImageError}
                                                />
                                            )}
                                            {imageLoading && !imageError && currentSlide.assetUrl && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                                                    <div className="w-10 h-10 border-2 border-gray-200 dark:border-gray-800 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Retry Overlay */}
                                    {isPlaceholder && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1a1a1a] z-10">
                                            <div className="text-center">
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    {currentSlide.type === "video" ? "Video" : "Image"} failed to load
                                                </p>
                                                <button
                                                    onClick={() => handleRetry(currentIndex)}
                                                    disabled={retrying === currentIndex}
                                                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-500 dark:bg-gray-100 dark:hover:bg-gray-200 dark:disabled:bg-gray-600 text-white dark:text-gray-900 rounded-md font-medium flex items-center gap-2 transition-colors mx-auto"
                                                >
                                                    <RotateCw className={`w-5 h-5 ${retrying === currentIndex ? "animate-spin" : ""}`} />
                                                    {retrying === currentIndex ? "Retrying..." : "Retry Generation"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Right Arrow */}
                        <button
                            onClick={nextSlide}
                            disabled={currentIndex === slides.length - 1}
                            className="p-3 md:p-4 rounded-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                            className={`h-1.5 rounded-full transition-all duration-200 ${
                                                idx === currentIndex 
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
