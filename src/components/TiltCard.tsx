"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
};

export default function TiltCard({
  children,
  className = "",
  maxTilt = 10,
  scale = 1.03,
}: TiltCardProps) {
  const [transform, setTransform] = useState("");
  const [hovering, setHovering] = useState(false);

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * maxTilt * 2;
    const ry = (px - 0.5) * maxTilt * 2;
    setTransform(`rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`);
  }

  return (
    <div
      className={`tilt-card ${className}`}
      style={{
        transform,
        transformStyle: "preserve-3d",
        transition: hovering
          ? "transform 0.06s ease-out"
          : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setTransform("");
      }}
    >
      {children}
    </div>
  );
}
