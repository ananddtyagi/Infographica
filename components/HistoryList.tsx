"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, Image as ImageIcon, Palette } from "lucide-react";
import { IMAGE_STYLES, ImageStyle } from "./InputArea";

interface HistoryItem {
    id: string;
    topic: string;
    style?: ImageStyle;
    createdAt: string;
    slides: Array<{
        assetUrl: string;
    }>;
}

interface HistoryListProps {
    onSelectStory?: (id: string) => void;
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
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-400 dark:text-gray-600 animate-pulse">Loading history...</div>
            </div>
        );
    }

    if (stories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-4" />
                <p className="text-gray-400 dark:text-gray-600">No stories yet</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                Past Conversations
            </h3>

            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {stories.map((story, index) => (
                    <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onSelectStory?.(story.id)}
                        className={`group flex items-center justify-between bg-white dark:bg-[#1a1a1a] rounded-lg p-3 transition-colors duration-150 border border-gray-200 dark:border-gray-800 ${onSelectStory ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700' : ''}`}
                    >
                        {/* Info */}
                        <div className="flex-1 pr-3 min-w-0">
                            <h3 className="text-gray-900 dark:text-gray-100 font-medium text-sm mb-1 line-clamp-1">
                                {story.topic}
                            </h3>
                            <div className="flex items-center text-gray-500 dark:text-gray-500 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(story.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                                <span className="mx-2">•</span>
                                {story.slides.length} slides
                            </div>
                            {story.style && IMAGE_STYLES[story.style] && (
                                <div className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                    <Palette className="w-2.5 h-2.5 mr-1" />
                                    {IMAGE_STYLES[story.style].name}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-20 h-14 bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-800">
                            {story.slides[0]?.assetUrl ? (
                                <img
                                    src={story.slides[0].assetUrl}
                                    alt={story.topic}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
