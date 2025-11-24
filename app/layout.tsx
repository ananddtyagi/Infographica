import { KeySettings } from "@/components/KeySettings";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Infographica",
    description: "Learn anything with AI-generated visual stories",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <PostHogProvider>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                            <KeySettings />
                            <ThemeToggle />
                        </div>
                        {children}
                    </ThemeProvider>
                    <Analytics />
                </PostHogProvider>
            </body>
        </html>
    );
}