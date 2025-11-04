import type { SVGProps } from "react";
import { cn } from "./utils";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps extends SVGProps<SVGSVGElement> {
  size?: SpinnerSize;
}

const sizeClassMap: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const sizeDimensionMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const pulseOffsets = [0, 0.2, 0.4];

export function Spinner({
  className,
  size = "md",
  strokeWidth = 2,
  "aria-hidden": ariaHidden,
  ...props
}: SpinnerProps) {
  const dimension = sizeDimensionMap[size];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-muted-foreground", sizeClassMap[size], className)}
      aria-hidden={ariaHidden ?? true}
      {...props}
    >
      {pulseOffsets.map((offset, index) => (
        <circle key={index} cx="12" cy="12" r="0">
          <animate
            attributeName="r"
            begin={`${offset}s`}
            dur="1.2s"
            values="0;11"
            calcMode="spline"
            keySplines=".52,.6,.25,.99"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            begin={`${offset}s`}
            dur="1.2s"
            values="1;0"
            calcMode="spline"
            keySplines=".52,.6,.25,.99"
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
