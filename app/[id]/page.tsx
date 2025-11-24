"use client";

import { LoadingScreen } from "@/components/LoadingScreen";
import { Slideshow } from "@/components/Slideshow";
import { getStory, saveStory } from "@/lib/client-db";
import { StoredStory } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StoryPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [story, setStory] = useState<StoredStory | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(false);
    const [funFacts, setFunFacts] = useState<string[]>([]);

    // We can track progress by checking how many slides have assets
    const completedSlides = story?.slides.filter(s => s.assetUrl || s.failed).length || 0;
    const totalSlides = story?.slides.length || 0;
    // Simple progress estimation
    const progress = totalSlides > 0 ? Math.round((completedSlides / totalSlides) * 100) : 0;

    useEffect(() => {
        initializeStory();
    }, [params.id]);

    async function initializeStory() {
        // Check if this is a new story generation (topic in sessionStorage)
        const topicKey = `story-${params.id}-topic`;
        const styleKey = `story-${params.id}-style`;

        // Access sessionStorage only on client
        const topic = typeof window !== 'undefined' ? sessionStorage.getItem(topicKey) : null;
        const style = typeof window !== 'undefined' ? sessionStorage.getItem(styleKey) || "drawing" : "drawing";

        if (topic) {
            // New story - generate it
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(topicKey);
                sessionStorage.removeItem(styleKey);
            }
            setLoading(false);
            setGenerating(true);

            // Create initial placeholder story structure
            const initialStory: StoredStory = {
                id: params.id,
                topic,
                style,
                narrative: "Generating your visual story...",
                slides: [], // Will be populated by plan
                createdAt: new Date().toISOString(),
            };

            await saveStory(initialStory);
            setStory(initialStory);

            // Then start full generation
            await generateStory(topic, style);
        } else {
            // Existing story - just load it
            await loadStory();
        }
    }

    async function generateStory(topic: string, style: string) {
        try {
            const apiKey = localStorage.getItem("gemini_api_key");
            const imageModel = localStorage.getItem("gemini_image_model") || "gemini-3-pro-image-preview";

            // 1. Start generating fun facts
            fetch("/api/fun-facts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, apiKey }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.facts) setFunFacts(data.facts);
                })
                .catch(err => console.error("Failed to load facts", err));

            // 2. Generate Story Plan
            const planResponse = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, apiKey }),
            });

            if (!planResponse.ok) throw new Error("Failed to generate story plan");

            const { story: storyPlan } = await planResponse.json();

            // Update story with plan (empty assets)
            const slides = storyPlan.slides.map((slide: any) => ({
                ...slide,
                assetUrl: "", // Empty initially
                failed: false,
            }));

            const updatedStory: StoredStory = {
                id: params.id,
                topic: storyPlan.topic,
                style,
                narrative: storyPlan.narrative,
                slides,
                createdAt: new Date().toISOString(),
            };

            await saveStory(updatedStory);
            setStory(updatedStory);

            // 3. Generate Assets in Parallel
            const generationPromises = slides.map(async (slide: any, i: number) => {
                if (slide.assetUrl) return;

                try {
                    await retryWithBackoff(async () => {
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
                            if (data.assetUrl) assetUrl = data.assetUrl;
                        } 
                        /* 
                        // Video generation disabled for now
                        else if (slide.type === "video") {
                            if (apiKey) {
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
                                if (data.assetUrl) assetUrl = data.assetUrl;
                            } else {
                                console.warn("Skipping video generation: No API key");
                                return; // Skip without error
                            }
                        }
                        */

                        if (assetUrl) {
                            updatedStory.slides[i].assetUrl = assetUrl;
                        } else {
                            throw new Error("No asset URL returned");
                        }
                    });
                } catch (err: any) {
                    console.error(`Failed to generate asset for slide ${i}`, err);
                    updatedStory.slides[i].failed = true;
                    updatedStory.slides[i].errorMessage = err.message;
                }
            });

            await Promise.all(generationPromises);

            await saveStory(updatedStory);
            setStory({ ...updatedStory });
            setGenerating(false);

        } catch (error) {
            console.error("Error generating story:", error);
            setError(true);
            setGenerating(false);
        }
    }

    async function retryWithBackoff<T>(
        fn: () => Promise<T>,
        retries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;
            const delay = baseDelay * Math.pow(2, 3 - retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, baseDelay);
        }
    }

    async function loadStory() {
        try {
            // Try loading from IndexedDB first
            let loadedStory = await getStory(params.id);

            // If not found, try loading from examples API
            if (!loadedStory) {
                const res = await fetch(`/api/examples?id=${params.id}`);
                if (res.ok) {
                    loadedStory = await res.json();
                }
            }

            if (loadedStory) {
                setStory(loadedStory);
            } else {
                setError(true);
            }
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

    // Show loading screen only if we haven't initialized the story structure yet
    if (!story) {
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

    if (error) {
        return (
            <main className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Story Not Found</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        The story you're looking for doesn't exist or has been removed from your local history.
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
            <Slideshow story={story} onReset={handleReset} loadingFacts={funFacts} />
        </main>
    );
}

