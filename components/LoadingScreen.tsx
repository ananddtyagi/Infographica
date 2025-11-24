"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";

interface LoadingScreenProps {
    facts: string[];
}

export function LoadingScreen({ facts }: LoadingScreenProps) {
    const [currentFactIndex, setCurrentFactIndex] = useState(0);

    useEffect(() => {
        if (facts.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFactIndex((prev) => (prev + 1) % facts.length);
        }, 6000); // Change fact every 6 seconds

        return () => clearInterval(interval);
    }, [facts]);

    const currentFact = facts.length > 0 ? facts[currentFactIndex] : "Preparing your learning adventure...";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-8">
            <div className="max-w-2xl w-full text-center space-y-12">
                {/* Spinning circle loader */}
                <div className="flex justify-center">
                    <Loader2 className="w-12 h-12 text-gray-400 dark:text-gray-600 animate-spin" />
                </div>

                {/* Facts display with fade animation */}
                <div className="min-h-[180px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentFactIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">
                                <Sparkles className="w-4 h-4" />
                                <span>Did you know?</span>
                            </div>
                            <motion.p
                                className="text-xl md:text-2xl font-normal leading-relaxed text-gray-700 dark:text-gray-300 px-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                            >
                                {currentFact}
                            </motion.p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
