"use client";

import { useMemo, useState } from "react";

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
};

export default function TiltCard({ children, className = "", maxTilt = 10 }: TiltCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, px: 50, py: 50 });

  const style = useMemo(
    () => ({
      transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    }),
    [tilt]
  );

  return (
    <div
      className={`relative transition-transform duration-150 ease-out will-change-transform ${className}`}
      style={style}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * 100;
        const py = ((e.clientY - rect.top) / rect.height) * 100;
        const ry = ((px - 50) / 50) * maxTilt;
        const rx = -((py - 50) / 50) * maxTilt;
        setTilt({ x: rx, y: ry, px, py });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0, px: 50, py: 50 })}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-screen transition-opacity duration-200 hover:opacity-80"
        style={{
          background: `
            radial-gradient(circle at ${tilt.px}% ${tilt.py}%, rgba(255,255,255,0.28), rgba(255,255,255,0) 35%),
            linear-gradient(125deg, rgba(255,0,170,0.12), rgba(255,220,120,0.18), rgba(86,184,255,0.14))
          `,
        }}
      />
    </div>
  );
}
