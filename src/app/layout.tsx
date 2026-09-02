import type { Metadata } from "next";
import "./globals.css";
import "./analyze/results.css";
import "./profile/profile.css";

export const metadata: Metadata = {
  title: "JobPilot AI — Your AI Job Search Agent",
  description: "Turn your CV into a smarter job search with AI-powered matching and application support.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
