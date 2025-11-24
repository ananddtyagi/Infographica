
import { generateImage } from "@/lib/gemini";
import { updateSlideAsset } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { storyId, slideIndex, prompt, type, apiKey, videoModel } = await request.json();

        if (!storyId || slideIndex === undefined || !prompt) {
            return NextResponse.json(
                { error: "storyId, slideIndex, and prompt are required" },
                { status: 400 }
            );
        }

        console.log(`Retrying generation for story ${storyId}, slide ${slideIndex} `);

        let assetUrl = "";
        let failed = false;
        let errorMessage: string | undefined;

        try {
            // Determine type based on prompt or pass type from client
            // For now, we'll try to detect if it's a video prompt or image prompt
            // But better to pass the type.
            // Let's assume the client passes 'type' or we infer it.
            // Since the current implementation only passed prompt, let's update the client to pass type too.
            // But first, let's just check if we can generate.

            // Actually, we need to know if we should call generateImage or generateVideo.
            // The client sends { storyId, slideIndex, prompt }.
            // We should update the client to send 'type' as well.

            // For this step, I'll update the client to send 'type' in the next tool call.
            // Here I will read 'type' from request.

            if (type === "video") {
                // Import generateVideo dynamically or ensure it's imported
                const { generateVideo } = await import("@/lib/gemini");
                assetUrl = await generateVideo(prompt, undefined, apiKey, videoModel);
            } else {
                assetUrl = await generateImage(prompt, undefined, apiKey);
            }

        } catch (error: any) {
            console.error("Retry failed:", error);
            assetUrl = "/placeholder.png";
            failed = true;
            if (error.message === "VIDEO_RATE_LIMIT_EXCEEDED") {
                errorMessage = "Oh no! You have reached your video rate limit for the day";
            }
        }

        // Update the stored story
        const updated = updateSlideAsset(storyId, slideIndex, assetUrl, failed, errorMessage);

        if (!updated) {
            return NextResponse.json(
                { error: "Story or slide not found" },
                { status: 404 }
            );
        }

        if (errorMessage) {
             return NextResponse.json({ error: errorMessage }, { status: 429 });
        }

        return NextResponse.json({ assetUrl, failed });
    } catch (error: any) {
        console.error("Retry failed:", error);
        return NextResponse.json(
            { error: "Failed to retry image generation", details: error.message },
            { status: 500 }
        );
    }
}
