import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
  if (radius !== undefined) style.borderRadius = typeof radius === "number" ? `${radius}px` : radius;
  return (
    <span
      className={`skeleton${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
      data-testid="skeleton"
    />
  );
}

interface SkeletonRowsProps {
  count?: number;
  rowHeight?: number;
  gap?: number;
}

export function SkeletonRows({ count = 3, rowHeight = 56, gap = 8 }: SkeletonRowsProps) {
  return (
    <div
      className="skeleton-rows"
      style={{ gap: `${gap}px` }}
      role="status"
      aria-label="Carregando"
      data-testid="skeleton-rows"
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={rowHeight} radius={6} />
      ))}
    </div>
  );
}

export default Skeleton;
