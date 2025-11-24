"use client";

import { Check, Key, X } from "lucide-react";
import { useEffect, useState } from "react";

export function KeySettings() {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [videoModel, setVideoModel] = useState("veo-3.1-fast-generate-001");
    const [imageModel, setImageModel] = useState("gemini-3-pro-image-preview");
    const [mounted, setMounted] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isImageModelDropdownOpen, setIsImageModelDropdownOpen] = useState(false);

    const VIDEO_MODELS = [
        "veo-3.0-generate-001",
        "veo-3.0-fast-generate-001",
        "veo-3.1-generate-preview",
        "veo-3.1-fast-generate-preview"
    ];

    const IMAGE_MODELS = [
        "gemini-3-pro-image-preview",
        "imagen-4.0-generate-001",
        "imagen-4.0-fast-generate-001",
        "imagen-3.0-generate-002",
        "imagen-3.0-generate-001",
        "imagen-3.0-fast-generate-001"
    ];

    useEffect(() => {
        setMounted(true);
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) {
            setApiKey(storedKey);
        }
        const storedModel = localStorage.getItem("gemini_video_model");
        if (storedModel && VIDEO_MODELS.includes(storedModel)) {
            setVideoModel(storedModel);
        }
        const storedImageModel = localStorage.getItem("gemini_image_model");
        if (storedImageModel && IMAGE_MODELS.includes(storedImageModel)) {
            setImageModel(storedImageModel);
        }

        // Listen for custom event to open settings
        const handleOpenSettings = () => setIsOpen(true);
        window.addEventListener('open-key-settings', handleOpenSettings);

        return () => {
            window.removeEventListener('open-key-settings', handleOpenSettings);
        };
    }, []);

    const handleSaveKey = (value: string) => {
        setApiKey(value);
        if (value.trim()) {
            localStorage.setItem("gemini_api_key", value.trim());
        } else {
            localStorage.removeItem("gemini_api_key");
        }
    };

    const handleSaveModel = (value: string) => {
        setVideoModel(value);
        localStorage.setItem("gemini_video_model", value);
        setIsModelDropdownOpen(false);
    };

    const handleSaveImageModel = (value: string) => {
        setImageModel(value);
        localStorage.setItem("gemini_image_model", value);
        setIsImageModelDropdownOpen(false);
    };

    if (!mounted) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-800"
                aria-label="API Key Settings"
            >
                <Key className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800">
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Key className="w-5 h-5" />
                                    Use your own Gemini Key
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="apiKey" className="sr-only">API Key</label>
                                <input
                                    id="apiKey"
                                    type="password"
                                    placeholder="AIzaSy..."
                                    value={apiKey}
                                    onChange={(e) => handleSaveKey(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Note: This key is only saved locally in your browser.
                                </p>
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Image Model</label>
                                <button
                                    type="button"
                                    onClick={() => setIsImageModelDropdownOpen(!isImageModelDropdownOpen)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
                                >
                                    <span className="text-gray-900 dark:text-white">{imageModel}</span>
                                    <span className="text-gray-400">▼</span>
                                </button>

                                {isImageModelDropdownOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {IMAGE_MODELS.map((model) => (
                                            <button
                                                key={model}
                                                onClick={() => handleSaveImageModel(model)}
                                                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${imageModel === model ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {model}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Model</label>
                                <button
                                    type="button"
                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
                                >
                                    <span className="text-gray-900 dark:text-white">{videoModel}</span>
                                    <span className="text-gray-400">▼</span>
                                </button>

                                {isModelDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {VIDEO_MODELS.map((model) => (
                                            <button
                                                key={model}
                                                onClick={() => handleSaveModel(model)}
                                                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${videoModel === model ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {model}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${apiKey ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-500"}`}>
                                    <Check className="w-4 h-4" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        Using your personal API Key
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Your key will be used for all generation (stories, images, and videos).
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

