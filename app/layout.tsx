import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://promptbreak-bug-sweepers.k-fuji.chatgpt.site"),
  title: "PromptBreak: Bug Sweepers",
  description: "生成AIの待ち時間を、オリジナルのパッチリングたちと楽しむ2.5Dデバッグアクション。",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PromptBreak: Bug Sweepers",
    title: "PromptBreak: Bug Sweepers",
    description: "Turn AI waiting time into a quick, satisfying debug break.",
    images: [{ url: "/social-preview.png", width: 1200, height: 630, alt: "PromptBreak: Bug Sweepers — the nine Patchlings unleash their signature attacks" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptBreak: Bug Sweepers",
    description: "Turn AI waiting time into a quick, satisfying debug break.",
    images: ["/social-preview.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
