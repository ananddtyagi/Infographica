import { generateImage } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Set max duration to 60s for Pro, though Image gen is fast

export async function POST(request: NextRequest) {
    try {
        const { prompt, style, apiKey } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        console.log("Generating image for prompt:", prompt);
        
        const assetUrl = await generateImage(prompt, style, apiKey);

        return NextResponse.json({ assetUrl });
    } catch (error: any) {
        console.error("Image generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate image", details: error.message },
            { status: 500 }
        );
    }
}

