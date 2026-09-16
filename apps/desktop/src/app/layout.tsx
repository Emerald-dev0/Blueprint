import type { Metadata } from "next";

// Self-hosted variable fonts (bundled into `out/` at build time).
//
// We deliberately do NOT use `next/font/google`: it fetches font CSS/binaries
// from fonts.googleapis.com during `next build`. That made the build fail on
// any machine without egress (airgapped CI, offline `tauri build`) and it made
// a "local-first" product depend on a third-party network service at build
// time. @fontsource ships the same faces as npm packages, so the build is now
// hermetic and reproducible.
//
// Only the `wght` axis is imported (no italic); the faces declare
// `unicode-range`, so the WebView downloads just the latin subset from local
// disk.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";

import "./globals.css";
import { ApplicationShell } from "../components/shell/application-shell";

export const metadata: Metadata = {
  title: "Blueprint",
  description: "AI Engineering Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ApplicationShell>{children}</ApplicationShell>
      </body>
    </html>
  );
}
