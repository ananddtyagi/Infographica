import { generateVideo } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // Video generation takes time, set high timeout if possible (Vercel Pro limit)

export async function POST(request: NextRequest) {
    try {
        const { prompt, style, apiKey, model } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        console.log("Generating video for prompt:", prompt);
        
        const assetUrl = await generateVideo(prompt, style, apiKey, model);

        return NextResponse.json({ assetUrl });
    } catch (error: any) {
        console.error("Video generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate video", details: error.message },
            { status: 500 }
        );
    }
}

