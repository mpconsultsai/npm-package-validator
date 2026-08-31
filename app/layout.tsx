import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPM Package Validator",
  description: "Validate npm packages for security and quality before installation",
  applicationName: "NPM Package Validator",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
