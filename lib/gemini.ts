import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";

function getAiClient(apiKey?: string) {
  const key = apiKey || DEFAULT_API_KEY;
  if (!key) {
    console.warn("No API Key provided for Gemini Client");
  }
  return new GoogleGenAI({ apiKey: key });
}

// Style guides for different image styles
export const IMAGE_STYLE_GUIDES = {
  drawing: `General Aesthetic: A hand-drawn educational illustration in the style of a traditional textbook or field guide showing comparison scenes. The overall look should feel analog, not digital, with visible textures of traditional media.

Art Style & Medium:
- Medium: Watercolor wash coloring combined with distinct black ink line art.
- Line Work: Black outlines that are hand-sketched, slightly wobbly, and organic, not mechanically perfect. Varying line weights (thicker borders, thinner interior details).
- Color & Texture: Muted, earthy, and natural color palette (greens, ochres, browns, desaturated blues). Visible watercolor textures, brush strokes, and paper grain.
- Shading: Achieved through watercolor layering and light ink hatching.

Text & Labeling Style:
- Main Titles: Located at the very top of the panel(s). Hand-lettered, bold, all-caps, sans-serif font, underlined with a hand-drawn line.
- Internal Labels: Smaller, handwritten, casual sans-serif text within the scene.
- Connectors: Hand-drawn black ink curved arrows connecting the labels to specific objects or figures in the illustration.

Composition & Content:
- Layout: [Choose one: A single detailed environmental scene OR A multi-panel comparison separated by thick black dividing lines].
- Perspective: A wide, slightly elevated environmental view allowing for the depiction of landscapes, settlements, and small human figures interacting with their surroundings.

Please follow this style guide to generate the infographic.`,
  photorealistic: `General Aesthetic: High-fidelity photorealistic image.
Art Style: Realistic lighting, detailed textures, true-to-life colors.
Context: Clear, educational presentation similar to high-quality photography or CGI.`,
  flat_art: `General Aesthetic: Modern flat design.
Art Style: Vector art, solid colors, clean lines, minimal shading.
Context: Corporate or tech-focused infographic style.`,
  "3d_render": `General Aesthetic: 3D rendered illustration.
Art Style: Isometric or perspective view, clay or plastic materials, soft global illumination.
Context: Modern, engaging digital art style.`,
  free_style: ``
} as const;

export type ImageStyleType = keyof typeof IMAGE_STYLE_GUIDES;

// Interfaces
export interface SlidePlan {
  title: string;
  content: string;
  imagePrompt: string;
  videoPrompt?: string;
  type: "image" | "video";
}

export interface StoryResponse {
  topic: string;
  narrative: string;
  slides: SlidePlan[];
}

// Zod Schemas
const slideSchema = z.object({
  title: z.string().describe("The title of the slide."),
  content: z.string().describe("Educational content for this slide (2-3 sentences)."),
  imagePrompt: z.string().describe("Detailed prompt to generate a high-quality, educational image for this slide."),
  videoPrompt: z.string().optional().describe("Optional: Detailed prompt to generate a 5-second moving infographic video if the concept requires motion. If not, leave empty."),
  type: z.enum(["image", "video"]).describe("Type of the slide. Choose 'video' only if motion is crucial."),
});

const storySchema = z.object({
  topic: z.string().describe("The topic of the story."),
  narrative: z.string().describe("A brief, engaging overview of the topic."),
  slides: z.array(slideSchema).describe("A list of 5-7 slides covering the topic."),
});

const funFactsSchema = z.object({
  facts: z.array(z.string()).describe("A list of 20 fun and interesting facts about the topic."),
});

// 1. Generate Story and Plan
export async function generateStory(topic: string, apiKey?: string, allowVideo: boolean = false): Promise<StoryResponse> {
  console.log(`Generating story for topic: ${topic} using gemini-3-pro-preview`);
  
  const ai = getAiClient(apiKey);
  
  let prompt = `You are an expert educator creating an engaging visual story about: "${topic}". Create a visual story plan.`;
  
  if (!allowVideo) {
    prompt += `\n\nIMPORTANT CONSTRAINT: You are restricted to generating ONLY static images. Do NOT create any slides with type 'video'. All slides must be of type 'image'. Focus on creating rich, detailed image prompts.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(storySchema),
      },
    });

    // The response text should be a valid JSON string matching the schema
    const jsonString = response.text;
    if (!jsonString) {
      throw new Error("Empty response from Gemini");
    }

    const storyData = JSON.parse(jsonString);

    // Validate with Zod (optional but good for type safety)
    const parsedStory = storySchema.parse(storyData);

    return parsedStory as StoryResponse;

  } catch (error) {
    console.error("Failed to generate story plan", error);
    throw new Error("Failed to generate story plan");
  }
}

export async function generateFunFacts(topic: string, apiKey?: string): Promise<string[]> {
  console.log(`Generating fun facts for topic: ${topic} using gemini-2.5-flash`);

  const ai = getAiClient(apiKey);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 20 fun and interesting facts about "${topic}" to keep the user entertained while waiting.`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(funFactsSchema),
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(jsonString);
    const parsedData = funFactsSchema.parse(data);
    return parsedData.facts;

  } catch (error) {
    console.error("Failed to generate fun facts", error);
    // Return some generic facts if generation fails so the UI doesn't break
    return [
      "Did you know? Learning new things increases brain plasticity.",
      "Patience is a virtue, and good things come to those who wait!",
      "The world is full of fascinating wonders.",
      "Stay tuned, something amazing is being created for you.",
    ];
  }
}

// 2. Generate Image (Gemini 3 Pro Image - Nano Banana Pro)
export async function generateImage(prompt: string, style?: string, apiKey?: string): Promise<string> {
  const ai = getAiClient(apiKey);

  try {
    // Append style guide if provided
    let fullPrompt = prompt;
    if (style && style in IMAGE_STYLE_GUIDES) {
      const styleGuide = IMAGE_STYLE_GUIDES[style as ImageStyleType];
      if (styleGuide) {
        fullPrompt = `${prompt}\n\n${styleGuide}`;
      }
    }
    
    console.log(`Generating image for: ${prompt} using gemini-3-pro-image-preview with style: ${style || 'none'}`);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: fullPrompt,
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          // imageSize: "4K" // Removed to reduce size/latency as requested
        }
      }
    });

    // Iterate through parts to find inline data
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates in response");
    }

    for (const candidate of candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
             // Return Base64 Data URL directly
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No inline image data found in response");

  } catch (error) {
    console.error("Image generation failed", error);

    // Fallback to placeholder
    try {
      const response = await fetch(`https://placehold.co/600x400/png?text=${encodeURIComponent(prompt.substring(0, 20))}`);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (fallbackError) {
      console.error("Fallback image generation also failed", fallbackError);
      // Return a minimal transparent pixel or standard placeholder as data URL
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
  }
}

// 3. Generate Video (Veo 3.1)
export async function generateVideo(prompt: string, style?: string, apiKey?: string, model: string = "veo-3.1-fast-generate-preview"): Promise<string> {
  const ai = getAiClient(apiKey);
  
  // Append style guide if provided
  let fullPrompt = prompt;
  if (style && style in IMAGE_STYLE_GUIDES) {
    const styleGuide = IMAGE_STYLE_GUIDES[style as ImageStyleType];
    if (styleGuide) {
      fullPrompt = `${prompt}\n\n${styleGuide}`;
    }
  }

  const videoModel = model;
  console.log(`Generating video for: ${prompt} using ${videoModel} with style: ${style || 'none'}`);
  try {
    // Use the shared ai instance
    let operation = await ai.models.generateVideos({
      model: videoModel,
      prompt: fullPrompt,
    });

    console.log("Video generation started, operation:", operation);

    // Poll the operation status until the video is ready.
    const maxRetries = 30; // 30 * 5s = 150s max wait
    let retries = 0;

    while (!operation.done && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second wait

      // Refresh operation status
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
      retries++;
    }

    if (!operation.done) {
      throw new Error("Video generation timed out");
    }

    console.log("Video generation complete, downloading...");

    // Check for video in the response
    const videoFile = operation.response?.generatedVideos?.[0]?.video;

    if (!videoFile) {
      // If we can't find the video object, try to see if it's in a different path or just try downloading the first generated video if available
      console.error("Operation response:", JSON.stringify(operation.response, null, 2));
      throw new Error("No video resource found in response");
    }

    // Let's stick to the example structure primarily
    const videoResource = videoFile;

    const fileName = `${uuidv4()}.mp4`;
    // Use /tmp for Vercel compatibility
    const dirPath = "/tmp"; 
    const filePath = path.join(dirPath, fileName);

    // Ensure directory exists (should exist but just in case)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Download the generated video
    await ai.files.download({
      file: videoResource,
      downloadPath: filePath,
    });

    console.log(`Generated video downloaded to ${filePath}`);
    
    // Read file to buffer and convert to Base64
    const videoBuffer = fs.readFileSync(filePath);
    const base64Video = videoBuffer.toString('base64');
    
    // Clean up temp file
    fs.unlinkSync(filePath);
    
    return `data:video/mp4;base64,${base64Video}`;

  } catch (error: any) {
    console.error("Video generation failed", error);
    
    // Check for rate limit error (429 or RESOURCE_EXHAUSTED)
    if (
        error?.status === "RESOURCE_EXHAUSTED" || 
        error?.code === 429 || 
        error?.error?.code === 429 ||
        error?.error?.status === "RESOURCE_EXHAUSTED" ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota")
    ) {
        throw new Error("VIDEO_RATE_LIMIT_EXCEEDED");
    }

    throw error; // Propagate error so it's marked as failed in the UI
  }
}
