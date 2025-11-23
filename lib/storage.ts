import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = path.join(process.cwd(), "data");

export interface StoredStory {
    id: string;
    topic: string;
    narrative: string;
    slides: Array<{
        title: string;
        content: string;
        imagePrompt: string;
        videoPrompt?: string;
        type: "image" | "video";
        assetUrl: string;
        failed?: boolean; // Track if image/video generation failed
    }>;
    createdAt: string;
}

// Ensure data directory exists
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// Save a story to local storage
export function saveStory(story: Omit<StoredStory, "id" | "createdAt">): string {
    ensureDataDir();

    const id = uuidv4();
    const storedStory: StoredStory = {
        ...story,
        id,
        createdAt: new Date().toISOString(),
    };

    const filePath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(storedStory, null, 2));

    return id;
}

// Load all stories (returns metadata only for list view)
export function loadStories(): Array<Pick<StoredStory, "id" | "topic" | "createdAt" | "slides">> {
    ensureDataDir();

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));

    return files
        .map(file => {
            try {
                const content = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
                const story = JSON.parse(content) as StoredStory;
                return {
                    id: story.id,
                    topic: story.topic,
                    createdAt: story.createdAt,
                    slides: story.slides,
                };
            } catch (error) {
                console.error(`Failed to load story ${file}:`, error);
                return null;
            }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get a specific story by ID
export function getStory(id: string): StoredStory | null {
    ensureDataDir();

    const filePath = path.join(DATA_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content) as StoredStory;
    } catch (error) {
        console.error(`Failed to load story ${id}:`, error);
        return null;
    }
}

// Update a specific slide's asset URL (for retry functionality)
export function updateSlideAsset(storyId: string, slideIndex: number, assetUrl: string, failed: boolean = false): boolean {
    const story = getStory(storyId);

    if (!story || !story.slides[slideIndex]) {
        return false;
    }

    story.slides[slideIndex].assetUrl = assetUrl;
    story.slides[slideIndex].failed = failed;

    const filePath = path.join(DATA_DIR, `${storyId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(story, null, 2));

    return true;
}
