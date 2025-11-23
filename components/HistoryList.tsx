"use client";

import { motion } from "framer-motion";
import { Clock, Image as ImageIcon } from "lucide-react";

interface HistoryItem {
    id: string;
    topic: string;
    createdAt: string;
    slides: Array<{
        assetUrl: string;
    }>;
}

interface HistoryListProps {
    onSelectStory: (id: string) => void;
}

export default function HistoryList({ onSelectStory }: HistoryListProps) {
    const [stories, setStories] = React.useState<HistoryItem[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        try {
            const res = await fetch("/api/history");
            if (res.ok) {
                const data = await res.json();
                setStories(data);
            }
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-white/60">Loading history...</div>
            </div>
        );
    }

    if (stories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <ImageIcon className="w-16 h-16 text-white/20 mb-4" />
                <p className="text-white/60 text-lg">No stories yet</p>
                <p className="text-white/40 text-sm mt-2">Generate your first infographic to get started!</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-white mb-8">Your Stories</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story, index) => (
                    <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onSelectStory(story.id)}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden cursor-pointer hover:bg-white/20 transition-all duration-300 border border-white/20"
                    >
                        {/* Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative overflow-hidden">
                            {story.slides[0]?.assetUrl && (
                                <img
                                    src={story.slides[0].assetUrl}
                                    alt={story.topic}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white">
                                {story.slides.length} slides
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                                {story.topic}
                            </h3>
                            <div className="flex items-center text-white/60 text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(story.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

import React from "react";
