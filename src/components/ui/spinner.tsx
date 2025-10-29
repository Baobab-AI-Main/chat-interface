import type { SVGProps } from "react";
import { Loader2 } from "lucide-react";
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

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn("animate-spin text-muted-foreground", sizeClassMap[size], className)}
      {...props}
    />
  );
}
