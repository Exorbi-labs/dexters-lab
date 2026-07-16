"use client";

/**
 * Dexter's Lab icon — HugeIcons (free set): 1.5 stroke, 18px default,
 * inherits currentColor. Icon data is serializable, so server components
 * may import and pass icons to this client leaf.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export type { IconSvgElement };

export function Icon({
  icon,
  size = 18,
  strokeWidth = 1.5,
  className,
}: {
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
