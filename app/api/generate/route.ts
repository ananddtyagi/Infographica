import { generateImage, generateStory, generateVideo } from "@/lib/gemini";
import { saveStory, updateSlideAsset } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { topic, id, style, apiKey, videoModel } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        console.log("Generating story for topic:", topic, "with ID:", id, "and style:", style);
        const allowVideo = !!apiKey;
        console.log(`User provided API Key: ${allowVideo}. Video generation allowed: ${allowVideo}. Model: ${videoModel}`);

        // Step 1: Generate the story structure
        // If no API key provided, enforce image-only generation to save rate limits
        const storyPlan = await generateStory(topic, apiKey, allowVideo);

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
                    const assetUrl = await generateImage(slide.imagePrompt, style, apiKey);
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
        // Only if allowVideo is true (which implies apiKey is present)
        if (allowVideo) {
            setImmediate(async () => {
                console.log("Starting background video generation...");
                for (let i = 0; i < storyPlan.slides.length; i++) {
                    const slide = storyPlan.slides[i];
                    
                    if (slide.type === "video" && slide.videoPrompt) {
                        try {
                            console.log(`Generating video ${i + 1}: ${slide.title}`);
                            const assetUrl = await generateVideo(slide.videoPrompt, style, apiKey, videoModel);
                            updateSlideAsset(storyId, i, assetUrl, false);
                            console.log(`✓ Video ${i + 1} complete`);
                        } catch (error: any) {
                            console.error(`Failed to generate video for slide ${i}: ${slide.title}`, error);
                            
                            let errorMessage;
                            if (error.message === "VIDEO_RATE_LIMIT_EXCEEDED") {
                                errorMessage = "Oh no! You have reached your video rate limit for the day";
                            }

                            updateSlideAsset(storyId, i, "/placeholder.png", true, errorMessage);
                        }
                    }
                }
                console.log("All videos generated");
            });
        } else {
             console.log("Video generation skipped (no API key provided)");
        }

        // Return story with images ready (videos will be generated in background if allowed)
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
