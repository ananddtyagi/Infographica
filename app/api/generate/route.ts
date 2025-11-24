import { NextRequest, NextResponse } from "next/server";
import { generateStory, generateImage, generateVideo } from "@/lib/gemini";
import { saveStory, updateSlideAsset } from "@/lib/storage";

export async function POST(request: NextRequest) {
    try {
        const { topic, id, style } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        console.log("Generating story for topic:", topic, "with ID:", id, "and style:", style);

        // Step 1: Generate the story structure
        const storyPlan = await generateStory(topic);

        console.log(`Generated story plan with ${storyPlan.slides.length} slides`);

        // Step 2: Save initial story with empty asset URLs
        const initialSlides = storyPlan.slides.map(slide => ({
            ...slide,
            assetUrl: "",
            failed: false,
        }));

        const initialStory = {
            topic: storyPlan.topic,
            style,
            narrative: storyPlan.narrative,
            slides: initialSlides,
        };

        const storyId = saveStory(initialStory, id);
        console.log(`Saved initial story with ID: ${storyId}`);

        // Step 3: Generate images first (sequentially to save progress)
        console.log("Generating images...");
        for (let i = 0; i < storyPlan.slides.length; i++) {
            const slide = storyPlan.slides[i];
            
            // Only generate images first, skip videos
            if (slide.type === "image") {
                try {
                    console.log(`Generating image ${i + 1}/${storyPlan.slides.length}: ${slide.title}`);
                    const assetUrl = await generateImage(slide.imagePrompt, style);
                    updateSlideAsset(storyId, i, assetUrl, false);
                    console.log(`✓ Image ${i + 1} complete`);
                } catch (error) {
                    console.error(`Failed to generate image for slide ${i}: ${slide.title}`, error);
                    updateSlideAsset(storyId, i, "/placeholder.png", true);
                }
            }
        }

        console.log("All images generated, returning story");

        // Step 4: Generate videos in background (don't wait for response)
        setImmediate(async () => {
            console.log("Starting background video generation...");
            for (let i = 0; i < storyPlan.slides.length; i++) {
                const slide = storyPlan.slides[i];
                
                if (slide.type === "video" && slide.videoPrompt) {
                    try {
                        console.log(`Generating video ${i + 1}: ${slide.title}`);
                        const assetUrl = await generateVideo(slide.videoPrompt, style);
                        updateSlideAsset(storyId, i, assetUrl, false);
                        console.log(`✓ Video ${i + 1} complete`);
                    } catch (error) {
                        console.error(`Failed to generate video for slide ${i}: ${slide.title}`, error);
                        updateSlideAsset(storyId, i, "/placeholder.png", true);
                    }
                }
            }
            console.log("All videos generated");
        });

        // Return story with images ready (videos will be generated in background)
        return NextResponse.json({ id: storyId });
    } catch (error: any) {
        console.error("Generation failed:", error);
        // Log to file for debugging
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'error.log');
        const errorMessage = `${new Date().toISOString()} - Error: ${error.message}\nStack: ${error.stack}\n\n`;
        fs.appendFileSync(logPath, errorMessage);

        return NextResponse.json(
            { error: "Failed to generate content. Please try again.", details: error.message },
            { status: 500 }
        );
    }
}
