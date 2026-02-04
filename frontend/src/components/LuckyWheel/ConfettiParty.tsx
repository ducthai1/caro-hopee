import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';

type ConfettiPartyProps = {
  show: boolean;
};

const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'];

export default function ConfettiParty({ show }: ConfettiPartyProps) {
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);
  const [mounted, setMounted] = useState(false);

  // Create canvas on mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize confetti instance with our canvas
  useEffect(() => {
    if (canvasRef.current && !confettiInstanceRef.current) {
      confettiInstanceRef.current = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
    }
  }, [mounted]);

  const fireParty = useCallback(() => {
    if (isRunningRef.current || !confettiInstanceRef.current) return;
    isRunningRef.current = true;

    const fire = confettiInstanceRef.current;

    // Top bursts
    fire({ particleCount: 60, startVelocity: 30, spread: 100, origin: { x: 1, y: 0 }, ticks: 120, gravity: 0.4, angle: 210, colors: CONFETTI_COLORS });
    fire({ particleCount: 80, startVelocity: 20, spread: 300, origin: { x: 0.5, y: 0 }, ticks: 120, gravity: 0.4, angle: 270, colors: CONFETTI_COLORS });
    fire({ particleCount: 60, startVelocity: 30, spread: 100, origin: { x: 0, y: 0 }, ticks: 120, gravity: 0.4, angle: 330, colors: CONFETTI_COLORS });

    // Bottom bursts
    fire({ particleCount: 60, startVelocity: 35, spread: 70, origin: { x: 0, y: 1 }, ticks: 120, gravity: 0.8, angle: 60, colors: CONFETTI_COLORS });
    fire({ particleCount: 50, startVelocity: 38, spread: 70, origin: { x: 0.5, y: 1 }, ticks: 120, gravity: 0.8, angle: 90, colors: CONFETTI_COLORS });
    fire({ particleCount: 60, startVelocity: 35, spread: 70, origin: { x: 1, y: 1 }, ticks: 120, gravity: 0.8, angle: 130, colors: CONFETTI_COLORS });

    timeoutRef.current = setTimeout(() => {
      isRunningRef.current = false;
    }, 2500);
  }, []);

  useEffect(() => {
    if (show && confettiInstanceRef.current) {
      fireParty();
    }
  }, [show, fireParty]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isRunningRef.current = false;
      if (confettiInstanceRef.current) {
        confettiInstanceRef.current.reset();
        confettiInstanceRef.current = null;
      }
    };
  }, []);

  // Use Portal to render canvas at body level (escape parent overflow:hidden)
  if (!mounted) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />,
    document.body
  );
}
