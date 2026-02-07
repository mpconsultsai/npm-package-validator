import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPM Package Validator",
  description: "Validate npm packages for security and quality before installation",
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
