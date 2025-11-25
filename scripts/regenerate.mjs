
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Manual .env loading since dotenv might not be installed
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key.trim()] = value;
        }
    });
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Please set GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_GEN_DIR = path.join(process.cwd(), "public", "generated");

// Ensure generated dir exists
if (!fs.existsSync(PUBLIC_GEN_DIR)) {
    fs.mkdirSync(PUBLIC_GEN_DIR, { recursive: true });
}

const IMAGE_STYLE_GUIDES = {
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
};

async function generateImage(prompt, style, model = "gemini-3-pro-image-preview") {
    try {
        let fullPrompt = prompt;
        if (style && IMAGE_STYLE_GUIDES[style]) {
            fullPrompt = `${prompt}\n\n${IMAGE_STYLE_GUIDES[style]}`;
        }

        console.log(`Generating image for: ${prompt.substring(0, 50)}...`);

        if (model.startsWith("imagen-")) {
            const response = await ai.models.generateImages({
                model: model,
                prompt: fullPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: "16:9",
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const imgBytes = response.generatedImages[0]?.image?.imageBytes;
                if (imgBytes) {
                    return Buffer.from(imgBytes, 'base64');
                }
            }
            throw new Error("No image generated");
        }

        // Gemini 3 Pro Image
        const response = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                }
            }
        });

        if (!response || !response.candidates || response.candidates.length === 0) {
            throw new Error("No candidates in response");
        }

        for (const candidate of response.candidates) {
            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        return Buffer.from(part.inlineData.data, 'base64');
                    }
                }
            }
        }

        throw new Error("No inline image data found");

    } catch (error) {
        console.error("Generation failed:", error.message);
        throw error;
    }
}

async function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let story;
    try {
        story = JSON.parse(content);
    } catch (e) {
        console.error(`Failed to parse ${filePath}`);
        return;
    }

    let modified = false;
    const style = story.style || "drawing";

    console.log(`Processing story: ${story.topic} (${story.id})`);

    for (let i = 0; i < story.slides.length; i++) {
        const slide = story.slides[i];
        
        // Check criteria for regeneration
        // 1. Type is video (we want to convert to image)
        // 2. Failed status
        // 3. Missing assetUrl
        // 4. Placeholder assetUrl
        const needsRegen = 
            slide.type === "video" || 
            slide.failed === true || 
            !slide.assetUrl || 
            slide.assetUrl === "" || 
            slide.assetUrl === "/placeholder.png";

        if (needsRegen) {
            console.log(`  > Regenerating slide ${i + 1}: ${slide.title}`);
            
            // Determine prompt
            let prompt = slide.imagePrompt;
            if (!prompt || prompt.trim() === "") {
                prompt = slide.videoPrompt;
            }
            if (!prompt || prompt.trim() === "") {
                prompt = `An educational illustration of ${slide.title}: ${slide.content}`;
            }

            // Force type to image
            slide.type = "image";
            // Ensure we have an image prompt saved
            slide.imagePrompt = prompt;

            try {
                const imageBuffer = await generateImage(prompt, style);
                
                // Save file
                const filename = `${uuidv4()}.png`;
                const savePath = path.join(PUBLIC_GEN_DIR, filename);
                fs.writeFileSync(savePath, imageBuffer);

                // Update slide
                slide.assetUrl = `/generated/${filename}`;
                slide.failed = false;
                delete slide.errorMessage;
                
                console.log(`    Success! Saved to ${filename}`);
                modified = true;

                // Add small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`    Failed to regenerate: ${error.message}`);
                slide.failed = true;
                slide.errorMessage = "Failed to regenerate during batch processing";
                // We still mark modified to update type/failed status if changed
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(story, null, 2));
        console.log(`  Updated ${path.basename(filePath)}`);
    } else {
        console.log(`  No changes needed for ${path.basename(filePath)}`);
    }
}

async function main() {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
        await processFile(path.join(DATA_DIR, file));
    }
    
    console.log("Done!");
}

main().catch(console.error);

