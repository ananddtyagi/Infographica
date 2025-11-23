import { NextResponse } from "next/server";
import { loadStories } from "@/lib/storage";

export async function GET() {
    try {
        const stories = loadStories();
        return NextResponse.json(stories);
    } catch (error: any) {
        console.error("Failed to load stories:", error);
        return NextResponse.json(
            { error: "Failed to load stories", details: error.message },
            { status: 500 }
        );
    }
}
