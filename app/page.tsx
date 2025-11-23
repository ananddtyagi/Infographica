"use client";

import { useState } from "react";
import { InputArea } from "@/components/InputArea";
import { Slideshow } from "@/components/Slideshow";
import HistoryList from "@/components/HistoryList";

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

export default function Home() {
    const [isLoading, setIsLoading] = useState(false);
    const [story, setStory] = useState<Story | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const handleGenerate = async (topic: string) => {
        setIsLoading(true);
        setShowHistory(false);
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ topic }),
            });

            if (!response.ok) {
                throw new Error("Generation failed");
            }

            const data = await response.json();
            setStory(data);
        } catch (error) {
            console.error("Error generating story:", error);
            alert("Failed to generate story. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectStory = async (id: string) => {
        try {
            const response = await fetch(`/api/story?id=${id}`);
            if (!response.ok) {
                throw new Error("Failed to load story");
            }
            const data = await response.json();
            setStory(data);
            setShowHistory(false);
        } catch (error) {
            console.error("Error loading story:", error);
            alert("Failed to load story. Please try again.");
        }
    };

    const handleReset = () => {
        setStory(null);
        setShowHistory(true);
    };

    if (story) {
        return <Slideshow story={story} onReset={handleReset} />;
    }

    if (showHistory) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-8">
                <button
                    onClick={() => setShowHistory(false)}
                    className="mb-8 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                    ← Create New Story
                </button>
                <HistoryList onSelectStory={handleSelectStory} />
            </div>
        );
    }

    return (
        <div className="relative">
            <InputArea onSubmit={handleGenerate} isLoading={isLoading} />
            <button
                onClick={() => setShowHistory(true)}
                className="absolute top-8 right-8 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors"
            >
                View History
            </button>
        </div>
    );
}
