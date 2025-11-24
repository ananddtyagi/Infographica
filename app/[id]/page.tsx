"use client";

import { LoadingScreen } from "@/components/LoadingScreen";
import { Slideshow } from "@/components/Slideshow";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Story {
    id?: string;
    topic: string;
    narrative: string;
    slides: Array<{
        title: string;
        content: string;
        imagePrompt: string;
        videoPrompt?: string;
        type: "image" | "video";
        assetUrl: string;
        failed?: boolean;
    }>;
}

export default function StoryPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [story, setStory] = useState<Story | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(false);
    const [funFacts, setFunFacts] = useState<string[]>([]);
    const [generationProgress, setGenerationProgress] = useState(0);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initializeStory();

        return () => {
            // Cleanup polling on unmount
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [params.id]);

    async function initializeStory() {
        // Check if this is a new story generation (topic in sessionStorage)
        const topicKey = `story-${params.id}-topic`;
        const styleKey = `story-${params.id}-style`;
        const topic = sessionStorage.getItem(topicKey);
        const style = sessionStorage.getItem(styleKey) || "drawing";

        if (topic) {
            // New story - generate it
            sessionStorage.removeItem(topicKey); // Clear it so refresh doesn't regenerate
            sessionStorage.removeItem(styleKey);
            setLoading(false); // Not loading an existing story, we're generating a new one
            setGenerating(true);

            // Then start generation
            await generateStory(topic, style);
        } else {
            // Existing story - just load it
            await loadStory();
        }
    }

    async function generateStory(topic: string, style: string) {
        try {
            // Get API key from local storage
            const apiKey = localStorage.getItem("gemini_api_key");
            const videoModel = localStorage.getItem("gemini_video_model") || "veo-3.1-fast-generate-001";

            // 1. Start generating fun facts immediately (fast!)
            const factsPromise = fetch("/api/fun-facts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, apiKey }),
            }).then(res => res.json());

            // Handle facts as soon as they arrive
            factsPromise.then(data => {
                if (data.facts) setFunFacts(data.facts);
            }).catch(err => {
                console.error("Failed to load facts", err);
                setFunFacts([
                    "Preparing your visual story...",
                    "Gathering information...",
                    "Creating something amazing..."
                ]);
            });

            // 2. Start generating story (this will generate images incrementally)
            const storyPromise = fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, id: params.id, style, apiKey, videoModel }),
            }).then(res => res.json());

            // 3. Start polling for progress while generation happens
            startProgressPolling();

            // Wait for generation to complete (images done, videos in background)
            await storyPromise;

            // 4. Stop polling and load final story
            stopProgressPolling();
            await loadStory();
            setGenerating(false);

        } catch (error) {
            console.error("Error generating story:", error);
            setError(true);
            setGenerating(false);
            stopProgressPolling();
        }
    }

    function startProgressPolling() {
        // Poll every second to check progress
        pollingIntervalRef.current = setInterval(async () => {
            await checkGenerationProgress();
        }, 1000);
    }

    function stopProgressPolling() {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }

    async function checkGenerationProgress() {
        try {
            const response = await fetch(`/api/story?id=${params.id}`);
            if (!response.ok) return;

            const data = await response.json();

            if (data && data.slides && data.slides.length > 0) {
                // Calculate progress based on image slides that have been generated
                const imageSlides = data.slides.filter((s: any) => s.type === "image");
                const generatedImages = imageSlides.filter((s: any) => s.assetUrl && s.assetUrl !== "");

                const progress = imageSlides.length > 0
                    ? Math.round((generatedImages.length / imageSlides.length) * 100)
                    : 0;

                setGenerationProgress(progress);

                // If all images are ready, we can show the story
                if (progress === 100) {
                    setStory(data);
                    setGenerating(false); // Stop showing loading screen
                    stopProgressPolling(); // Stop polling since we have all images
                }
            }
        } catch (error) {
            console.error("Error checking progress:", error);
        }
    }

    async function loadStory() {
        try {
            const response = await fetch(`/api/story?id=${params.id}`);
            if (!response.ok) {
                throw new Error("Failed to load story");
            }
            const data = await response.json();
            setStory(data);
            setLoading(false);
        } catch (error) {
            console.error("Error loading story:", error);
            setError(true);
            setLoading(false);
        }
    }

    const handleReset = () => {
        router.push("/");
    };

    // Show loading screen while generating or if story has no slides yet
    const hasContent = story && story.slides && story.slides.length > 0;

    if (loading || (generating && !hasContent)) {
        return (
            <LoadingScreen
                facts={funFacts.length > 0 ? funFacts : [
                    "Researching the topic...",
                    "Creating the story...",
                    "Almost there..."
                ]}
            />
        );
    }

    if (error || !story) {
        return (
            <main className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Story Not Found</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        The story you're looking for doesn't exist or has been removed.
                    </p>
                    <button
                        onClick={() => router.push("/")}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white overflow-x-hidden transition-colors duration-200">
            <Slideshow story={story} onReset={handleReset} />
        </main>
    );
}

