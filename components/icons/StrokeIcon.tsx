import type { ReactNode } from "react";

import type { IconProps } from "@/components/icons/icon-props";

export const StrokeIcon = ({
  className = "w-4 h-4",
  children,
}: IconProps & { children: ReactNode }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);
