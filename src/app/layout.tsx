import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ShellProvider } from "@/components/ShellProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0c3d79",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:12000"),
  title: {
    default: "Startup Singam ERP",
    template: "%s - Startup Singam ERP",
  },
  description:
    "Operations ERP for Startup Singam: the startup journey, the investor journey, production, funding and finance, and community, with selection, production, investment and finance tracked separately.",
  applicationName: "Startup Singam ERP",
  icons: { icon: "/singam-logo.png", apple: "/singam-logo.png" },
  openGraph: {
    title: "Startup Singam ERP",
    description: "Simplify Fund Raise, Amplify Success Stories.",
    images: ["/singam-logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ShellProvider>{children}</ShellProvider>
      </body>
    </html>
  );
}
