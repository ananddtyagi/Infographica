"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Slideshow } from "@/components/Slideshow";
import { LoadingScreen } from "@/components/LoadingScreen";

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

    useEffect(() => {
        initializeStory();
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
            setGenerating(true);
            
            // Load the placeholder story first
            await loadStory();
            
            // Then start generation
            await generateStory(topic, style);
        } else {
            // Existing story - just load it
            await loadStory();
        }
    }

    async function generateStory(topic: string, style: string) {
        try {
            // 1. Start generating fun facts immediately (fast!)
            const factsPromise = fetch("/api/fun-facts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            }).then(res => res.json());

            // 2. Start generating story in parallel
            const storyPromise = fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, id: params.id, style }),
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

            // Wait for story
            const storyData = await storyPromise;
            setStory(storyData);
            setGenerating(false);

        } catch (error) {
            console.error("Error generating story:", error);
            setError(true);
            setGenerating(false);
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

    if (loading || generating) {
        return (
            <LoadingScreen
                facts={funFacts.length > 0 ? funFacts : [
                    "Retrieving your story from the archives...",
                    "Dusting off the digital pages...",
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

