import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const API_KEY = process.env.GEMINI_API_KEY || "";

// New SDK instance for Story and Video
const ai = new GoogleGenAI({ apiKey: API_KEY });

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

// 1. Generate Story and Plan
export async function generateStory(topic: string): Promise<StoryResponse> {
  console.log(`Generating story for topic: ${topic} using gemini-3-pro-preview`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are an expert educator creating an engaging visual story about: "${topic}". Create a visual story plan.`,
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

// 2. Generate Image (Gemini 3 Pro Image - Nano Banana Pro)
export async function generateImage(prompt: string): Promise<string> {
  try {
    console.log(`Generating image for: ${prompt} using gemini-3-pro-image-preview`);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
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
            const fileName = `${uuidv4()}.png`;
            const dirPath = path.join(process.cwd(), "public", "generated");
            const filePath = path.join(dirPath, fileName);

            // Ensure directory exists
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }

            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            fs.writeFileSync(filePath, imageBuffer);

            return `/generated/${fileName}`;
          }
        }
      }
    }

    throw new Error("No inline image data found in response");

  } catch (error) {
    console.error("Image generation failed", error);

    // Fallback to placeholder
    try {
      const fileName = `${uuidv4()}.png`;
      const dirPath = path.join(process.cwd(), "public", "generated");
      const filePath = path.join(dirPath, fileName);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const response = await fetch(`https://placehold.co/600x400/png?text=${encodeURIComponent(prompt.substring(0, 20))}`);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      return `/generated/${fileName}`;
    } catch (fallbackError) {
      console.error("Fallback image generation also failed", fallbackError);
      return "/placeholder.png";
    }
  }
}

// 3. Generate Video (Veo 3.1)
export async function generateVideo(prompt: string): Promise<string> {
  console.log(`Generating video for: ${prompt} using veo-3.1-generate-preview`);
  try {
    // Use the shared ai instance
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
    });

    console.log("Video generation started, operation:", operation);

    // Poll the operation status until the video is ready.
    const maxRetries = 30; // 30 * 5s = 150s max wait
    let retries = 0;

    while (!operation.done && retries < maxRetries) {
      console.log("Waiting for video generation to complete...", retries);
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
    const dirPath = path.join(process.cwd(), "public", "generated");
    const filePath = path.join(dirPath, fileName);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Download the generated video
    await ai.files.download({
      file: videoResource,
      downloadPath: filePath,
    });

    console.log(`Generated video saved to ${filePath}`);
    return `/generated/${fileName}`;

  } catch (error) {
    console.error("Video generation failed", error);
    throw error; // Propagate error so it's marked as failed in the UI
  }
}
