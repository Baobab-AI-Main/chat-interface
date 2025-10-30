"use client";

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio@1.1.2";
import type { ComponentPropsWithoutRef } from "react";

function AspectRatio({
  ...props
}: ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
