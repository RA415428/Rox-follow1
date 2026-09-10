import React, { useEffect, useRef } from 'react';

interface RainBackgroundProps {
  enabled?: boolean;
  intensity?: 'gentle' | 'medium' | 'monsoon';
  themeColor?: 'pink' | 'cyan' | 'purple';
}

interface Drop {
  x: number;
  y: number;
  l: number; // length
  xs: number; // x speed
  ys: number; // y speed
  opacity: number;
  width: number;
  color: string;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

export const RainBackground: React.FC<RainBackgroundProps> = ({
  enabled = true,
  intensity = 'monsoon',
  themeColor = 'pink'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const maxDrops = intensity === 'gentle' ? 50 : intensity === 'medium' ? 90 : 140;
    const drops: Drop[] = [];
    const splashes: Splash[] = [];

    const getRainColor = () => {
      const colors = [
        'rgba(244, 114, 182, ', // Pink-400
        'rgba(236, 72, 153, ',  // Pink-500
        'rgba(251, 113, 133, ', // Rose-400
        'rgba(192, 132, 252, ', // Purple-400
        'rgba(224, 231, 255, '  // Soft water white-cyan
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    };

    // Initialize raindrops
    for (let i = 0; i < maxDrops; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        l: Math.random() * 20 + 12,
        xs: -1.5 + Math.random() * 0.5, // Natural angled wind
        ys: Math.random() * 12 + 10,     // Fall speed
        opacity: Math.random() * 0.45 + 0.25,
        width: Math.random() * 1.5 + 0.8,
        color: getRainColor()
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw and update drops
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.xs * (d.l / 8), d.y + d.l);
        ctx.strokeStyle = `${d.color}${d.opacity})`;
        ctx.lineWidth = d.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        d.x += d.xs;
        d.y += d.ys;

        // Reset if off screen and create subtle ground splash
        if (d.y > height) {
          if (Math.random() > 0.6) {
            splashes.push({
              x: d.x,
              y: height - Math.random() * 15,
              radius: 1,
              maxRadius: Math.random() * 8 + 4,
              opacity: 0.5,
              color: d.color
            });
          }

          d.x = Math.random() * (width + 100);
          d.y = -20;
          d.ys = Math.random() * 12 + 10;
        }

        if (d.x < -20) {
          d.x = width + 20;
        }
      }

      // Draw and update splashes/ripples
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.radius * 2, s.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${s.color}${s.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        s.radius += 0.4;
        s.opacity -= 0.025;

        if (s.opacity <= 0 || s.radius >= s.maxRadius) {
          splashes.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, intensity, themeColor]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep Rose Pink Ambient Lighting Mesh */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-rose-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Atmospheric Cloud Mist Overlays */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-pink-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Rain Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-75 pointer-events-none"
      />
    </div>
  );
};
