import { StoredStory, Slide } from "./types";

const DB_NAME = "InfographicaDB";
const STORE_NAME = "stories";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
            reject(new Error("IndexedDB is not available server-side"));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            reject("IndexedDB error: " + (event.target as any).error);
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

export async function saveStory(story: StoredStory): Promise<string> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(story);

        request.onsuccess = () => {
            resolve(story.id);
        };

        request.onerror = (event) => {
            reject("Error saving story: " + (event.target as any).error);
        };
    });
}

export async function getStory(id: string): Promise<StoredStory | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result || null);
        };

        request.onerror = (event) => {
            reject("Error getting story: " + (event.target as any).error);
        };
    });
}

export async function loadStories(): Promise<Array<Pick<StoredStory, "id" | "topic" | "style" | "createdAt" | "slides">>> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const stories = request.result as StoredStory[];
            const simplified = stories
                .map(story => ({
                    id: story.id,
                    topic: story.topic,
                    style: story.style,
                    createdAt: story.createdAt,
                    slides: story.slides
                }))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(simplified);
        };

        request.onerror = (event) => {
            reject("Error loading stories: " + (event.target as any).error);
        };
    });
}

export async function updateSlideAsset(storyId: string, slideIndex: number, assetUrl: string, failed: boolean = false, errorMessage?: string): Promise<boolean> {
    const story = await getStory(storyId);
    if (!story || !story.slides[slideIndex]) {
        return false;
    }

    story.slides[slideIndex].assetUrl = assetUrl;
    story.slides[slideIndex].failed = failed;
    if (errorMessage) {
        story.slides[slideIndex].errorMessage = errorMessage;
    } else if (!failed) {
        delete story.slides[slideIndex].errorMessage;
    }

    await saveStory(story);
    return true;
}

