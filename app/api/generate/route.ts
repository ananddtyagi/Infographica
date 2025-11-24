import { NextRequest, NextResponse } from "next/server";
import { generateStory, generateImage, generateVideo } from "@/lib/gemini";
import { saveStory } from "@/lib/storage";

export async function POST(request: NextRequest) {
    try {
        const { topic, id, style } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        console.log("Generating story for topic:", topic, "with ID:", id, "and style:", style);

        // Step 1: Generate the story structure
        const storyPlan = await generateStory(topic);

        console.log(`Generating assets for ${storyPlan.slides.length} slides...`);

        // Step 2: Generate images/videos for each slide
        const slidesWithAssets = await Promise.all(
            storyPlan.slides.map(async (slide) => {
                let assetUrl = "";
                let failed = false;

                try {
                    if (slide.type === "video" && slide.videoPrompt) {
                        assetUrl = await generateVideo(slide.videoPrompt, style);
                    } else {
                        assetUrl = await generateImage(slide.imagePrompt, style);
                    }
                } catch (error) {
                    console.error(`Failed to generate asset for slide: ${slide.title}`, error);
                    assetUrl = "/placeholder.png";
                    failed = true;
                }

                return {
                    ...slide,
                    assetUrl,
                    failed,
                };
            })
        );

        const finalStory = {
            topic: storyPlan.topic,
            narrative: storyPlan.narrative,
            slides: slidesWithAssets,
        };

        // Save story to local storage (use provided ID if available)
        const storyId = saveStory(finalStory, id);

        return NextResponse.json({ ...finalStory, id: storyId });
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
