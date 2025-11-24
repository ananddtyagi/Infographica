import { NextRequest, NextResponse } from "next/server";
import { saveStory } from "@/lib/storage";

export async function POST(request: NextRequest) {
    try {
        const { topic, id } = await request.json();

        if (!topic || !id) {
            return NextResponse.json({ error: "Topic and ID are required" }, { status: 400 });
        }

        console.log("Initializing story placeholder for topic:", topic, "with ID:", id);

        // Create a placeholder story that can be loaded while generation happens
        const placeholderStory = {
            topic,
            narrative: "Generating your visual story...",
            slides: [],
        };

        // Save the placeholder
        saveStory(placeholderStory, id);

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error("Failed to initialize story:", error);
        return NextResponse.json(
            { error: "Failed to initialize story", details: error.message },
            { status: 500 }
        );
    }
}

