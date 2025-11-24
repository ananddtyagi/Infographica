"use client";

import { LoadingScreen } from "@/components/LoadingScreen";
import { Slideshow } from "@/components/Slideshow";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStory, saveStory } from "@/lib/client-db";
import { StoredStory } from "@/lib/types";

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
            const videoModel = localStorage.getItem("gemini_video_model") || "veo-3.1-fast-generate-001";

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
                body: JSON.stringify({ topic, apiKey, videoModel }),
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

            // 3. Generate Assets Sequentially
            for (let i = 0; i < slides.length; i++) {
                const slide = slides[i];
                // Skip if already has asset (shouldn't happen here but good practice)
                if (slide.assetUrl) continue;

                try {
                    let assetUrl = "";
                    if (slide.type === "image") {
                         const res = await fetch("/api/generate-image", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prompt: slide.imagePrompt, style, apiKey }),
                        });
                        const data = await res.json();
                        if (data.assetUrl) assetUrl = data.assetUrl;
                    } else if (slide.type === "video") {
                        // Only generate video if we have API key, otherwise skip or fallback? 
                        // The plan should ideally respect allowVideo, but let's check key again.
                        if (apiKey) {
                             const res = await fetch("/api/generate-video", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prompt: slide.videoPrompt, style, apiKey, model: videoModel }),
                            });
                            const data = await res.json();
                            if (data.assetUrl) assetUrl = data.assetUrl;
                        } else {
                             // Fallback for no key if video was somehow planned
                             console.warn("Skipping video generation: No API key");
                        }
                    }

                    // Update story in DB and State
                    if (assetUrl) {
                        updatedStory.slides[i].assetUrl = assetUrl;
                        await saveStory(updatedStory);
                        setStory({ ...updatedStory }); // Force re-render
                    } else {
                        // Mark failed
                         updatedStory.slides[i].failed = true;
                         await saveStory(updatedStory);
                         setStory({ ...updatedStory });
                    }

                } catch (err) {
                    console.error(`Failed to generate asset for slide ${i}`, err);
                    updatedStory.slides[i].failed = true;
                    await saveStory(updatedStory);
                    setStory({ ...updatedStory });
                }
            }

            setGenerating(false);

        } catch (error) {
            console.error("Error generating story:", error);
            setError(true);
            setGenerating(false);
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

    // Show loading screen while generating or if story has no slides yet
    const hasContent = story && story.slides && story.slides.length > 0;
    const allAssetsGenerated = story?.slides.every(s => s.assetUrl || s.failed);

    // If we are generating, we show loading screen until we have at least the plan? 
    // Or maybe we want to show the slideshow filling up?
    // The original behavior showed "Generating..." until images were done.
    // Let's keep showing loading screen until all images are done for a better experience, 
    // OR show it until we have the plan, then show a "Generating assets..." overlay?
    // Original: `if (loading || (generating && !hasContent))` -> This implies if we have content we show it.
    // But `generating` was true until EVERYTHING was done.
    // Let's stick to: Show loading screen until we have the full story with images.
    
    // Actually, showing progress is nice. LoadingScreen supports fun facts.
    // If we have progress, we can pass it to LoadingScreen if it supported it.
    // For now, let's block until finished to match previous behavior roughly.
    
    if (loading || (generating && !allAssetsGenerated)) {
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
            <Slideshow story={story} onReset={handleReset} />
        </main>
    );
}
