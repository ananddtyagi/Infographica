import { NextResponse } from "next/server";
import { generateFunFacts } from "@/lib/gemini";

export async function POST(request: Request) {
    try {
        const { topic, apiKey } = await request.json();

        if (!topic) {
            return NextResponse.json(
                { error: "Topic is required" },
                { status: 400 }
            );
        }

        const facts = await generateFunFacts(topic, apiKey);
        return NextResponse.json({ facts });
    } catch (error) {
        console.error("Error generating fun facts:", error);
        return NextResponse.json(
            { error: "Failed to generate fun facts" },
            { status: 500 }
        );
    }
}
