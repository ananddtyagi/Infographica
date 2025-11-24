import { generateStory } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { topic, apiKey } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        console.log("Generating story plan for topic:", topic);
        // Force allowVideo to false for now as requested
        const allowVideo = false;
        
        // Step 1: Generate the story structure
        const storyPlan = await generateStory(topic, apiKey, allowVideo);

        console.log(`Generated story plan with ${storyPlan.slides.length} slides`);

        // Return the plan to the client. The client will handle saving to localStorage/IndexedDB
        // and calling generate-image/video endpoints.
        return NextResponse.json({ 
            story: storyPlan,
            // We can return a generated ID here if we want the server to generate it, 
            // but the client can also do it. Let's let the client generate IDs or we generate one here.
            // Actually, the client sent an ID in the previous version, let's see.
        });
    } catch (error: any) {
        console.error("Generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate content. Please try again.", details: error.message },
            { status: 500 }
        );
    }
}
