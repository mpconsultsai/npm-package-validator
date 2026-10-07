import { Inter_Tight } from "next/font/google";

/** Display font for the site wordmark (root layout). */
export const wordmarkFont = Inter_Tight({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-wordmark",
  display: "swap",
});
