"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, RotateCw } from "lucide-react";

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

    const nextSlide = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

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

            // Update the slide with new asset
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
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    // Reset loading state when slide changes
    useEffect(() => {
        setImageLoading(true);
        setImageError(false);

        // Set a timeout to show retry if image takes too long to load
        const timer = setTimeout(() => {
            // Only set error if the image is still loading after the timeout
            // and it's an image type (videos might stream)
            if (imageLoading && currentSlide.type === "image") {
                setImageError(true);
            }
        }, 10000); // 10 seconds timeout

        return () => clearTimeout(timer);
    }, [currentIndex, currentSlide.assetUrl, currentSlide.type]); // Added currentSlide.type to dependencies

    const handleImageLoad = () => {
        setImageLoading(false);
    };

    const handleImageError = () => {
        setImageLoading(false);
        setImageError(true);
    };

    const isPlaceholder = !currentSlide.assetUrl || currentSlide.assetUrl === "" || currentSlide.assetUrl === "/placeholder.png" || currentSlide.failed || imageError;

    return (
        <div className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <h2 className="text-2xl font-bold tracking-tight">{story.topic}</h2>
                <button
                    onClick={onReset}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Start Over"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="w-full h-full flex flex-col md:flex-row"
                    >
                        {/* Visual Side */}
                        <div className="w-full md:w-2/3 h-1/2 md:h-full relative bg-gray-900 flex items-center justify-center">
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
                                    {imageLoading && !imageError && currentSlide.assetUrl && currentSlide.assetUrl !== "" && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Retry Button for Failed Assets or Timeout */}
                            {isPlaceholder && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                    <div className="text-center">
                                        <p className="text-white/80 mb-4">
                                            {currentSlide.type === "video" ? "Video" : "Image"} failed to load
                                        </p>
                                        <button
                                            onClick={() => handleRetry(currentIndex)}
                                            disabled={retrying === currentIndex}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors mx-auto"
                                        >
                                            <RotateCw className={`w-5 h-5 ${retrying === currentIndex ? "animate-spin" : ""}`} />
                                            {retrying === currentIndex ? "Retrying..." : "Retry Generation"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded text-xs uppercase tracking-wider font-semibold z-10">
                                {currentSlide.type}
                            </div>
                        </div>

                        {/* Text Side */}
                        <div className="w-full md:w-1/3 h-1/2 md:h-full p-8 md:p-12 flex flex-col justify-center bg-gray-950 border-l border-gray-800">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="text-sm text-purple-400 font-medium mb-4">
                                    Slide {currentIndex + 1} of {story.slides.length}
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                                    {currentSlide.title}
                                </h3>
                                <p className="text-lg text-gray-300 leading-relaxed">
                                    {currentSlide.content}
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-center z-10 pointer-events-none">
                <button
                    onClick={prevSlide}
                    disabled={currentIndex === 0}
                    className={`pointer-events-auto p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all ${currentIndex === 0 ? "opacity-0 cursor-default" : "opacity-100"
                        }`}
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <div className="flex gap-2 pointer-events-auto">
                    {story.slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? "w-8 bg-purple-500" : "bg-gray-600 hover:bg-gray-500"
                                }`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextSlide}
                    disabled={currentIndex === story.slides.length - 1}
                    className={`pointer-events-auto p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all ${currentIndex === story.slides.length - 1
                        ? "opacity-0 cursor-default"
                        : "opacity-100"
                        }`}
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
}
