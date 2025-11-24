"use client";

import { useRouter } from "next/navigation";
import { InputArea, ImageStyle } from "@/components/InputArea";
import HistoryList from "@/components/HistoryList";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
    const router = useRouter();

    const handleGenerate = async (topic: string, style: ImageStyle) => {
        // Generate UUID
        const id = uuidv4();
        
        try {
            // Store the topic and style in sessionStorage so the [id] page can start generation
            sessionStorage.setItem(`story-${id}-topic`, topic);
            sessionStorage.setItem(`story-${id}-style`, style);
            
            // Navigate to the new page
            router.push(`/${id}`);
        } catch (error) {
            console.error("Failed to initialize story:", error);
            alert("Failed to start story generation. Please try again.");
        }
    };

    const handleSelectStory = async (id: string) => {
        // Navigate to existing story
        router.push(`/${id}`);
    };

    return (
        <main className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white overflow-x-hidden transition-colors duration-200">
            <div className="flex flex-col items-center justify-start min-h-screen px-4 md:px-8">
                {/* Header with Infographica branding */}
                <div className="w-full max-w-4xl pt-16 pb-8 text-center">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Infographica
                    </h1>
                    <p className="text-base text-gray-500 dark:text-gray-500 mt-3">
                        Turn any topic into a visual story
                    </p>
                </div>

                {/* Centered Input Area */}
                <div className="w-full max-w-4xl mb-12">
                    <InputArea onSubmit={handleGenerate} isLoading={false} />
                </div>

                {/* Scrollable History Section */}
                <div className="w-full max-w-4xl pb-8">
                    <HistoryList onSelectStory={handleSelectStory} />
                </div>
            </div>
        </main>
    );
}
