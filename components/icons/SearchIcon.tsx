import { StrokeIcon } from "@/components/icons/StrokeIcon";
import type { IconProps } from "@/components/icons/icon-props";

export const SearchIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <StrokeIcon className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </StrokeIcon>
);
