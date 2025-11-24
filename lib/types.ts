export interface Slide {
    title: string;
    content: string;
    imagePrompt: string;
    videoPrompt?: string;
    type: "image" | "video";
    assetUrl: string;
    failed?: boolean;
    errorMessage?: string;
}

export interface StoredStory {
    id: string;
    topic: string;
    style?: string;
    narrative: string;
    slides: Slide[];
    createdAt: string;
}


