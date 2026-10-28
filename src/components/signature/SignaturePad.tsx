'use client';

import { PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

// The PNG is always 3:1 and this size, so the PDF can place it without measuring
// and every stored signature stays small (a few KB).
const EXPORT_WIDTH = 480;
const EXPORT_HEIGHT = 160;
const ASPECT_RATIO = EXPORT_WIDTH / EXPORT_HEIGHT;
const INK = '#16231c';
const LINE_WIDTH_RATIO = 0.007;

// Points are stored relative to the canvas (0..1), so a resize or rotation just
// redraws, and the export is independent of the on-screen size.
interface Point {
  x: number;
  y: number;
}

const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Point[][]
): void => {
  const lineWidth = Math.max(2, width * LINE_WIDTH_RATIO);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;

    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0].x * width, stroke[0].y * height, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // Quadratic curves through the midpoints of consecutive points smooth out jitter.
    ctx.beginPath();
    ctx.moveTo(stroke[0].x * width, stroke[0].y * height);
    for (let i = 1; i < stroke.length - 1; i++) {
      const midX = ((stroke[i].x + stroke[i + 1].x) / 2) * width;
      const midY = ((stroke[i].y + stroke[i + 1].y) / 2) * height;
      ctx.quadraticCurveTo(stroke[i].x * width, stroke[i].y * height, midX, midY);
    }
    const last = stroke[stroke.length - 1];
    ctx.lineTo(last.x * width, last.y * height);
    ctx.stroke();
  }
};

const exportPng = (strokes: Point[][]): string | null => {
  if (strokes.length === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  render(ctx, EXPORT_WIDTH, EXPORT_HEIGHT, strokes);
  return canvas.toDataURL('image/png');
};

interface SignaturePadProps {
  /** Called when a stroke ends (PNG data URL) or the pad is cleared (null). */
  onChange: (dataUrl: string | null) => void;
  ariaLabel: string;
}

export const SignaturePad = ({ onChange, ariaLabel }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    render(ctx, canvas.width, canvas.height, strokesRef.current);
  }, []);

  // Keep the backing store matched to the displayed size (and device pixel
  // ratio) so lines are sharp on phones; resizing clears the canvas, so redraw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth;
      if (cssWidth === 0) return;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round((cssWidth / ASPECT_RATIO) * dpr);
      redraw();
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const pointFromEvent = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([pointFromEvent(e)]);
    setHasInk(true);
    redraw();
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    stroke.push(pointFromEvent(e));
    redraw();
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(exportPng(strokesRef.current));
  };

  const handleClear = () => {
    strokesRef.current = [];
    drawingRef.current = false;
    setHasInk(false);
    redraw();
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          className="block w-full cursor-crosshair select-none"
          style={{ aspectRatio: `${EXPORT_WIDTH} / ${EXPORT_HEIGHT}`, touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Writing line and cross, purely visual */}
        <div className="pointer-events-none absolute inset-x-4 bottom-[28%] border-b border-dashed border-border" />
        <span className="pointer-events-none absolute bottom-[30%] left-4 text-lg leading-none text-text-muted">
          ×
        </span>
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-muted">
            Hier mit dem Finger unterschreiben
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={handleClear} disabled={!hasInk}>
          Löschen
        </Button>
      </div>
    </div>
  );
};
