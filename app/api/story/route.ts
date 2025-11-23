import { NextRequest, NextResponse } from "next/server";
import { getStory } from "@/lib/storage";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
        }

        const story = getStory(id);

        if (!story) {
            return NextResponse.json({ error: "Story not found" }, { status: 404 });
        }

        return NextResponse.json(story);
    } catch (error: any) {
        console.error("Failed to load story:", error);
        return NextResponse.json(
            { error: "Failed to load story", details: error.message },
            { status: 500 }
        );
    }
}
