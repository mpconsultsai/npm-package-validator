import { StrokeIcon } from "@/components/icons/StrokeIcon";
import type { IconProps } from "@/components/icons/icon-props";

export const CheckIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <StrokeIcon className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </StrokeIcon>
);
