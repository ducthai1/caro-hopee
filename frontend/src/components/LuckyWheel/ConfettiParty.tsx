import { useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';

type ConfettiPartyProps = {
  show: boolean;
};

const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'];

export default function ConfettiParty({ show }: ConfettiPartyProps) {
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireParty = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Reduced particle counts for better performance
    // Top bursts
    confetti({ particleCount: 60, startVelocity: 30, spread: 100, origin: { x: 1, y: 0 }, ticks: 120, gravity: 0.4, angle: 210, colors: CONFETTI_COLORS });
    confetti({ particleCount: 80, startVelocity: 20, spread: 300, origin: { x: 0.5, y: 0 }, ticks: 120, gravity: 0.4, angle: 270, colors: CONFETTI_COLORS });
    confetti({ particleCount: 60, startVelocity: 30, spread: 100, origin: { x: 0, y: 0 }, ticks: 120, gravity: 0.4, angle: 330, colors: CONFETTI_COLORS });

    // Bottom bursts
    confetti({ particleCount: 60, startVelocity: 35, spread: 70, origin: { x: 0, y: 1 }, ticks: 120, gravity: 0.8, angle: 60, colors: CONFETTI_COLORS });
    confetti({ particleCount: 50, startVelocity: 38, spread: 70, origin: { x: 0.5, y: 1 }, ticks: 120, gravity: 0.8, angle: 90, colors: CONFETTI_COLORS });
    confetti({ particleCount: 60, startVelocity: 35, spread: 70, origin: { x: 1, y: 1 }, ticks: 120, gravity: 0.8, angle: 130, colors: CONFETTI_COLORS });

    timeoutRef.current = setTimeout(() => {
      isRunningRef.current = false;
    }, 2500);
  }, []);

  useEffect(() => {
    if (show) {
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
      // Reset confetti canvas
      confetti.reset();
    };
  }, []);

  return null;
}
