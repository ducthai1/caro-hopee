import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

type ConfettiPartyProps = {
  show: boolean;
};

export default function ConfettiParty({ show }: ConfettiPartyProps) {
  const [running, setRunning] = useState(false);

  function fireParty() {
    if (running) return;
    setRunning(true);

    const positionsTop = [
      { x: 1, angle: 210, particleCount: 90, startVelocity: 30, spread: 100, ticks: 160, gravity: 0.3 },
      { x: 0.5, angle: 270, particleCount: 140, startVelocity: 20, spread: 380, ticks: 160, gravity: 0.3 },
      { x: 0, angle: 330, particleCount: 90, startVelocity: 30, spread: 100, ticks: 160, gravity: 0.3 },
    ];

    positionsTop.forEach(({ x, angle, particleCount, startVelocity, spread, ticks, gravity }) => {
      confetti({
        particleCount,
        startVelocity,
        spread,
        origin: { x, y: 0 },
        ticks,
        gravity,
        drift: 0,
        angle,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
      confetti({
        particleCount: 4,
        startVelocity: 9,
        spread: 160,
        origin: { x: 0.5, y: 0 },
        ticks: 160,
        gravity: 0.2,
        drift: 0,
        angle: 270,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
      confetti({
        particleCount: 15,
        startVelocity: 15,
        spread: 100,
        origin: { x: 1, y: 0 },
        ticks: 160,
        gravity,
        drift: 0,
        angle: 210,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
      confetti({
        particleCount: 15,
        startVelocity: 15,
        spread: 100,
        origin: { x: 0, y: 0 },
        ticks: 160,
        gravity,
        drift: 0,
        angle: 330,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
    });

    const positionsBottom = [
      { x: 0, angle: 60, particleCount: 100, startVelocity: 40, ticks: 160 },
      { x: 0.5, angle: 90, particleCount: 90, startVelocity: 42, ticks: 160 },
      { x: 1, angle: 130, particleCount: 100, startVelocity: 40, ticks: 160 },
    ];

    positionsBottom.forEach(({ x, angle, particleCount, startVelocity, ticks }) => {
      confetti({
        particleCount,
        startVelocity,
        spread: 70,
        origin: { x, y: 1 },
        ticks,
        gravity: 0.7,
        drift: 0.5,
        angle,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
      confetti({
        particleCount: 15,
        startVelocity: 25,
        spread: 50,
        origin: { x: 0, y: 1 },
        ticks: 160,
        gravity: 0.7,
        drift: 0.3,
        angle: 60,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
      confetti({
        particleCount: 4,
        startVelocity: 15,
        spread: 100,
        origin: { x: 0.5, y: 1 },
        ticks: 160,
        gravity: 0.7,
        drift: 0.3,
        angle: 90,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
      confetti({
        particleCount: 15,
        startVelocity: 25,
        spread: 50,
        origin: { x: 1, y: 1 },
        ticks: 160,
        gravity: 0.7,
        drift: 0.3,
        angle: 120,
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F1C', '#35A7FF', '#FF6FD8'],
      });
    });

    setTimeout(() => setRunning(false), 3200);
  }

  useEffect(() => {
    if (show) {
      fireParty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  return null;
}
