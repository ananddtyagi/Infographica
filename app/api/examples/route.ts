import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");

// Helper to read a specific story file
function getExampleStory(id: string) {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        console.error(`Failed to load example story ${id}:`, error);
        return null;
    }
}

// Helper to list all example stories
function getExampleStories() {
    if (!fs.existsSync(DATA_DIR)) {
        return [];
    }
    
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
    
    return files
        .map(file => {
            try {
                const content = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
                const story = JSON.parse(content);
                return {
                    id: story.id,
                    topic: story.topic,
                    style: story.style,
                    createdAt: story.createdAt,
                    slides: story.slides, // We need slides for the thumbnail
                };
            } catch (error) {
                console.error(`Failed to load example story ${file}:`, error);
                return null;
            }
        })
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    try {
        if (id) {
            const story = getExampleStory(id);
            if (story) {
                return NextResponse.json(story);
            } else {
                return NextResponse.json({ error: "Example story not found" }, { status: 404 });
            }
        } else {
            const stories = getExampleStories();
            return NextResponse.json(stories);
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: "Failed to load examples", details: error.message },
            { status: 500 }
        );
    }
}


