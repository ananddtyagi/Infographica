"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Key, Lightbulb, Sparkles } from "lucide-react";
import { useState } from "react";
import { usePostHog } from 'posthog-js/react';

export const IMAGE_STYLES = {
    drawing: {
        name: "Hand Drawn",
        guide: `General Aesthetic: A hand-drawn educational illustration in the style of a traditional textbook or field guide showing comparison scenes. The overall look should feel analog, not digital, with visible textures of traditional media.

Art Style & Medium:
- Medium: Watercolor wash coloring combined with distinct black ink line art.
- Line Work: Black outlines that are hand-sketched, slightly wobbly, and organic, not mechanically perfect. Varying line weights (thicker borders, thinner interior details).
- Color & Texture: Muted, earthy, and natural color palette (greens, ochres, browns, desaturated blues). Visible watercolor textures, brush strokes, and paper grain.
- Shading: Achieved through watercolor layering and light ink hatching.

Text & Labeling Style:
- Main Titles: Located at the very top of the panel(s). Hand-lettered, bold, all-caps, sans-serif font, underlined with a hand-drawn line.
- Internal Labels: Smaller, handwritten, casual sans-serif text within the scene. Don't label obvious things, label things that make sense to highligh in the explanation of the diagram.
- Connectors: Hand-drawn black ink curved arrows connecting the labels to specific objects or figures in the illustration.

Composition & Content:
- Layout: [Choose one: A single detailed environmental scene OR A multi-panel comparison separated by thick black dividing lines].
- Perspective: A wide, slightly elevated environmental view allowing for the depiction of landscapes, settlements, and small human figures interacting with their surroundings.

Please follow this style guide to generate the infographic.`
    },
    photorealistic: {
        name: "Photorealistic",
        guide: "High-fidelity photorealistic image. Realistic lighting, detailed textures, true-to-life colors."
    },
    flat_art: {
        name: "Flat Art",
        guide: "Modern flat design. Vector art, solid colors, clean lines, minimal shading."
    },
    "3d_render": {
        name: "3D Render",
        guide: "3D rendered illustration. Isometric or perspective view, clay or plastic materials, soft global illumination."
    },
    free_style: {
        name: "Free Style ✨",
        guide: ""
    }
} as const;

export type ImageStyle = keyof typeof IMAGE_STYLES;

interface InputAreaProps {
    onSubmit: (topic: string, style: ImageStyle) => void;
    isLoading: boolean;
}

export function InputArea({ onSubmit, isLoading }: InputAreaProps) {
    const posthog = usePostHog();
    const [topic, setTopic] = useState("");
    const [selectedStyle, setSelectedStyle] = useState<ImageStyle>("drawing");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    // Check for API key on mount and when local storage changes
    useState(() => {
        if (typeof window !== 'undefined') {
            setHasApiKey(!!localStorage.getItem("gemini_api_key"));

            // Optional: Listen for storage changes to update state if key is added elsewhere
            const handleStorageChange = () => {
                setHasApiKey(!!localStorage.getItem("gemini_api_key"));
            };
            window.addEventListener('storage', handleStorageChange);
            // Also listen for our custom event to re-check key after modal closes (if we added that logic)
            // Ideally KeySettings would trigger an event when key is saved.
            // For now, just checking on render/mount is a start, but better to use an interval or event.

            // A simple poll or event listener for custom 'key-updated' event would be robust.
            // Let's add a custom event dispatch in KeySettings when saved.
        }
    });

    // Better approach: Poll for key every second or listen to custom event
    useState(() => {
        // Initial check
        if (typeof window !== 'undefined') {
            setHasApiKey(!!localStorage.getItem("gemini_api_key"));
        }

        const interval = setInterval(() => {
            if (typeof window !== 'undefined') {
                setHasApiKey(!!localStorage.getItem("gemini_api_key"));
            }
        }, 1000);

        return () => clearInterval(interval);
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            posthog.capture('generate_story', {
                topic: topic,
                style: selectedStyle
            });
            onSubmit(topic, selectedStyle);
        }
    };

    const openSettings = () => {
        window.dispatchEvent(new Event('open-key-settings'));
    };

    return (
        <div className="w-full">
            <h2 className="text-xl md:text-2xl font-medium text-gray-700 dark:text-gray-300 mb-6 text-center">
                What do you want to learn about today?
            </h2>

            <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg p-1.5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-200">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., The Roman Empire, Quantum Physics..."
                        className="flex-1 bg-transparent border-none px-4 py-2.5 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
                        disabled={isLoading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !topic.trim()}
                        className="bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 px-5 md:px-6 py-2.5 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                        <Sparkles className="w-4 h-4" />
                        Let's learn
                    </button>
                </div>

                {/* Style Selector Dropdown */}
                <div className="mt-3 flex items-center justify-start">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Style: {IMAGE_STYLES[selectedStyle].name}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-10 min-w-[140px]">
                                {Object.entries(IMAGE_STYLES).map(([key, style]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            setSelectedStyle(key as ImageStyle);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${selectedStyle === key
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                                            }`}
                                    >
                                        {style.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </form>

            {/* Hint for API Key */}
            <AnimatePresence>
                {!hasApiKey && topic.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.5 }}
                        className="mt-4 flex justify-center"
                    >
                        <button
                            onClick={openSettings}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors group text-left max-w-md"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                                <Lightbulb className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Want to use your own API key? Click the key icon <Key className="w-3 h-3 inline mx-0.5" /> to use your personal Gemini quota for all generation.
                                </p>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
