"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface InputAreaProps {
    onSubmit: (topic: string) => void;
    isLoading: boolean;
}

export function InputArea({ onSubmit, isLoading }: InputAreaProps) {
    const [topic, setTopic] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            onSubmit(topic);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl text-center space-y-8"
            >
                <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Infographica
                </h1>
                <p className="text-xl text-gray-400">
                    Learn anything with AI-generated visual stories.
                </p>

                <form onSubmit={handleSubmit} className="relative w-full">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What do you want to learn about? (e.g., Steam Engine)"
                        className="w-full px-6 py-4 text-lg bg-gray-900 border border-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-600 text-white"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !topic.trim()}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Generate <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
