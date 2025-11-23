
import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/gemini";
import { updateSlideAsset } from "@/lib/storage";

export async function POST(request: NextRequest) {
    try {
        const { storyId, slideIndex, prompt, type } = await request.json();

        if (!storyId || slideIndex === undefined || !prompt) {
            return NextResponse.json(
                { error: "storyId, slideIndex, and prompt are required" },
                { status: 400 }
            );
        }

        console.log(`Retrying generation for story ${storyId}, slide ${slideIndex} `);

        let assetUrl = "";
        let failed = false;

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
                assetUrl = await generateVideo(prompt);
            } else {
                assetUrl = await generateImage(prompt);
            }

        } catch (error) {
            console.error("Retry failed:", error);
            assetUrl = "/placeholder.png";
            failed = true;
        }

        // Update the stored story
        const updated = updateSlideAsset(storyId, slideIndex, assetUrl, failed);

        if (!updated) {
            return NextResponse.json(
                { error: "Story or slide not found" },
                { status: 404 }
            );
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
