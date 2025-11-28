"use client";

import { StoredStory } from "@/lib/types";
import { Download, FileCode, FileText, ChevronDown, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";

interface ExportMenuProps {
    story: StoredStory;
}

export function ExportMenu({ story }: ExportMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getAbsoluteUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("http") || url.startsWith("data:")) return url;
        return `${window.location.origin}${url}`;
    };

    const fetchImage = async (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    };

    const fetchImageAsBase64 = async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error converting image to base64:", error);
            return "";
        }
    };

    const downloadMarkdown = () => {
        let content = `# ${story.topic}\n\n`;
        content += `*generated using [infographica.app](https://infographica.app)*\n\n`;
        content += `${story.narrative}\n\n`;
        content += `---\n\n`;

        story.slides.forEach((slide, index) => {
            content += `## Slide ${index + 1}: ${slide.title}\n\n`;
            if (slide.assetUrl) {
                content += `![${slide.title}](${getAbsoluteUrl(slide.assetUrl)})\n\n`;
            }
            content += `${slide.content}\n\n`;
            content += `---\n\n`;
        });

        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${story.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };

    const downloadPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxLineWidth = pageWidth - 2 * margin;

        // Helper to add text and handle page breaks
        let cursorY = margin;

        const checkPageBreak = (heightNeeded: number) => {
            if (cursorY + heightNeeded > pageHeight - margin) {
                doc.addPage();
                cursorY = margin;
                return true;
            }
            return false;
        };

        // Title
        doc.setFontSize(24);
        doc.text(story.topic, margin, cursorY);
        cursorY += 10;

        // Subtitle
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("generated using ", margin, cursorY);
        const prefixWidth = doc.getTextWidth("generated using ");

        doc.setTextColor(59, 130, 246); // Blue-500ish
        const linkText = "infographica.app";
        doc.text(linkText, margin + prefixWidth, cursorY);
        const linkWidth = doc.getTextWidth(linkText);
        
        // Add clickable link over the text
        doc.link(margin + prefixWidth, cursorY - 3, linkWidth, 4, { url: "https://infographica.app" });
        
        doc.setTextColor(0);
        cursorY += 15;
        
        // Narrative
        doc.setFontSize(12);
        const splitNarrative = doc.splitTextToSize(story.narrative, maxLineWidth);
        doc.text(splitNarrative, margin, cursorY);
        cursorY += (splitNarrative.length * 5) + 20;

        for (let i = 0; i < story.slides.length; i++) {
            const slide = story.slides[i];
            
            // Start each slide on a new page usually, unless it's the first and we have space
            if (i > 0) {
                doc.addPage();
                cursorY = margin;
            } else {
                checkPageBreak(100); // Rough estimate
            }

            // Slide Title
            doc.setFontSize(18);
            doc.text(`Slide ${i + 1}: ${slide.title}`, margin, cursorY);
            cursorY += 15;

            // Image
            if (slide.assetUrl && slide.type === 'image') {
                try {
                    // Fetch and add image
                    const imgData = await fetchImageAsBase64(slide.assetUrl);
                    if (imgData) {
                        const imgWidth = maxLineWidth;
                        const imgHeight = (imgWidth * 9) / 16; // 16:9 aspect ratio
                        
                        // Check if image fits
                        if (cursorY + imgHeight > pageHeight - margin) {
                            doc.addPage();
                            cursorY = margin;
                        }

                        doc.addImage(imgData, "JPEG", margin, cursorY, imgWidth, imgHeight);
                        cursorY += imgHeight + 10;
                    }
                } catch (e) {
                    console.error("Error adding image to PDF", e);
                }
            } else if (slide.type === 'video') {
                doc.setTextColor(150);
                doc.text("[Video content not included in PDF]", margin, cursorY);
                doc.setTextColor(0);
                cursorY += 10;
            }

            // Content
            doc.setFontSize(12);
            const splitContent = doc.splitTextToSize(slide.content, maxLineWidth);
            
            // Check if content fits
            if (cursorY + (splitContent.length * 5) > pageHeight - margin) {
                 // If it doesn't fit, maybe add page? Or just let it flow (jspdf doesn't flow automatically without help)
                 // For simplicity, if image took up most space, new page for text
                 if (cursorY > pageHeight / 2) {
                     doc.addPage();
                     cursorY = margin;
                 }
            }

            doc.text(splitContent, margin, cursorY);
            cursorY += (splitContent.length * 5) + 10;
        }

        doc.save(`${story.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        setIsOpen(false);
    };

    const downloadLongImage = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Settings
        const width = 800; // Fixed width
        const margin = 40;
        const contentWidth = width - (margin * 2);
        
        // Temporary context for measuring text
        ctx.font = 'bold 48px sans-serif'; // Title font
        
        // Calculate height first
        let totalHeight = margin;
        
        // Title
        const titleLines = wrapText(ctx, story.topic, contentWidth);
        totalHeight += titleLines.length * 60 + 20;

        // Subtitle
        totalHeight += 30;

        // Narrative
        ctx.font = '24px sans-serif';
        const narrativeLines = wrapText(ctx, story.narrative, contentWidth);
        totalHeight += narrativeLines.length * 34 + 40;

        // Slides
        for (const slide of story.slides) {
            totalHeight += 40; // Spacing

            // Slide Title
            ctx.font = 'bold 32px sans-serif';
            const slideTitleLines = wrapText(ctx, `Slide: ${slide.title}`, contentWidth);
            totalHeight += slideTitleLines.length * 42 + 20;

            // Image
            if (slide.assetUrl && slide.type === 'image') {
                 const imgHeight = (contentWidth * 9) / 16;
                 totalHeight += imgHeight + 20;
            }

            // Content
            ctx.font = '24px sans-serif';
            const contentLines = wrapText(ctx, slide.content, contentWidth);
            totalHeight += contentLines.length * 34 + 20;
        }
        
        totalHeight += margin;

        // Resize canvas
        canvas.width = width;
        canvas.height = totalHeight;

        // Reset context after resize
        // Fill Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, totalHeight);
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';

        // Draw Content
        let cursorY = margin;

        // Title
        ctx.font = 'bold 48px sans-serif';
        for (const line of titleLines) {
            ctx.fillText(line, margin, cursorY);
            cursorY += 60;
        }
        cursorY += 10;

        // Subtitle
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText("generated using infographica.app", margin, cursorY);
        ctx.fillStyle = '#000000';
        cursorY += 30;

        // Narrative
        ctx.font = '24px sans-serif';
        for (const line of narrativeLines) {
            ctx.fillText(line, margin, cursorY);
            cursorY += 34;
        }
        cursorY += 40;

        // Slides
        for (let i = 0; i < story.slides.length; i++) {
            const slide = story.slides[i];
            
            // Separator line
            ctx.beginPath();
            ctx.moveTo(margin, cursorY);
            ctx.lineTo(width - margin, cursorY);
            ctx.strokeStyle = '#eeeeee';
            ctx.stroke();
            cursorY += 40;

            // Slide Title
            ctx.font = 'bold 32px sans-serif';
            const slideTitleLines = wrapText(ctx, `${i + 1}. ${slide.title}`, contentWidth);
            for (const line of slideTitleLines) {
                ctx.fillText(line, margin, cursorY);
                cursorY += 42;
            }
            cursorY += 20;

            // Image
            if (slide.assetUrl && slide.type === 'image') {
                try {
                    const img = await fetchImage(slide.assetUrl);
                    const imgHeight = (contentWidth * 9) / 16;
                    ctx.drawImage(img, margin, cursorY, contentWidth, imgHeight);
                    cursorY += imgHeight + 20;
                } catch (e) {
                    console.error("Failed to draw image to canvas", e);
                }
            }

            // Content
            ctx.font = '24px sans-serif';
            const contentLines = wrapText(ctx, slide.content, contentWidth);
            for (const line of contentLines) {
                ctx.fillText(line, margin, cursorY);
                cursorY += 34;
            }
            cursorY += 20;
        }

        // Download
        const url = canvas.toDataURL("image/jpeg", 0.9);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${story.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_long.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsOpen(false);
    };

    // Helper to wrap text
    function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors text-gray-900 dark:text-white"
                title="Export Story"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-[#1a1a1a] ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-gray-800">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <button
                            onClick={downloadMarkdown}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            role="menuitem"
                        >
                            <FileCode className="mr-3 h-4 w-4" />
                            Markdown
                        </button>
                        <button
                            onClick={downloadPDF}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            role="menuitem"
                        >
                            <FileText className="mr-3 h-4 w-4" />
                            PDF Document
                        </button>
                        <button
                            onClick={downloadLongImage}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            role="menuitem"
                        >
                            <ImageIcon className="mr-3 h-4 w-4" />
                            Super Long Image
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
