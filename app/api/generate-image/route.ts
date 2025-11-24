import { generateImage } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Set max duration to 60s for Pro, though Image gen is fast

export async function POST(request: NextRequest) {
    try {
        const { prompt, style, apiKey, model } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        console.log("Generating image for prompt:", prompt);
        
        const assetUrl = await generateImage(prompt, style, apiKey, model);

        return NextResponse.json({ assetUrl });
    } catch (error: any) {
        console.error("Image generation failed:", error);
        
        // Try to preserve the status code from the error if available (e.g. 503 Service Unavailable)
        let status = 500;
        if (error.status && typeof error.status === 'number') {
            status = error.status;
        } else if (error.code && typeof error.code === 'number') {
            status = error.code;
        } else if (error.message?.includes("503") || error.message?.includes("overloaded")) {
            status = 503;
        }

        return NextResponse.json(
            { error: "Failed to generate image", details: error.message, code: error.code || status },
            { status }
        );
    }
}


