import React, { useRef, useState, useEffect, useCallback } from "react";
import { Box, Button, Card, CardContent, Typography, useTheme, useMediaQuery } from "@mui/material";
import { Play, RotateCcw, Gift, Star, Heart, Zap, Crown, Diamond } from "lucide-react";
import ConfettiParty from "./ConfettiParty";
import { useLuckyWheel } from "./LuckyWheelContext";
import { useLanguage } from "../../i18n";

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

export default function LuckyWheelDisplay() {
  const { items, colors } = useLuckyWheel();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallMobile = useMediaQuery('(max-width: 400px)');
  
  const [isTheBestRewards, setIsTheBestRewards] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const startRotRef = useRef(0);
  const targetRotRef = useRef(0);
  const durationMsRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  const [winner, setWinner] = useState("");
  const [showWinner, setShowWinner] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  const icons = [Gift, Star, Heart, Zap, Crown, Diamond, Gift, Star];

  const segmentAngle = items.length ? 360 / items.length : 360;

  const generateConicGradient = (colors: string[], itemCount: number) => {
    if (itemCount === 0) return "";
    const anglePerItem = 360 / itemCount;
    const segments = Array.from({ length: itemCount }, (_, i) => {
      const start = i * anglePerItem;
      const end = (i + 1) * anglePerItem;
      const color = colors[i % colors.length];
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${segments.join(", ")})`;
  };

  const weightedRandom = (options: { label: string; weight: number }[]) => {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    if (totalWeight === 0) return { index: 0, item: options[0] };
    const rand = Math.random() * totalWeight;
    let sum = 0;
    for (let i = 0; i < options.length; i++) {
      sum += options[i].weight;
      if (rand < sum) return { index: i, item: options[i] };
    }
    return { index: 0, item: options[0] };
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const stopRAF = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const spinWheel = () => {
    if (isSpinning || items.length === 0) return;
    setIsSpinning(true);
    setShowWinner(false);
    setWinner("");
    setShowFireworks(false);
    setIsTheBestRewards(false);
    clearAllTimeouts();
    stopRAF();

    // chọn người thắng
    const { index: winnerIndex, item: winningItem } = weightedRandom(items);
    const segmentAngleLocal = 360 / items.length;
    const segmentCenter = winnerIndex * segmentAngleLocal + segmentAngleLocal / 2;

    const margin = 6;
    const reachable = Math.max(0, segmentAngleLocal - 2 * margin);
    const randomWithin = reachable > 0 ? (Math.random() * reachable - reachable / 2) : 0;
    const targetAngle = segmentCenter + randomWithin;

    const currentRotationNormalized = ((rotationRef.current % 360) + 360) % 360;
    const desiredMod = ((360 - targetAngle) % 360 + 360) % 360;
    const spins = Math.floor(Math.random() * (16 - 7 + 1)) + 12;
    const remainder = ((desiredMod - currentRotationNormalized + 360) % 360);
    const totalDelta = spins * 360 + remainder;

    const durationMs = Math.round(Math.max(4.0, 3.2 + spins * 0.55) * 1000);
    startTimeRef.current = performance.now();
    startRotRef.current = rotationRef.current;
    targetRotRef.current = startRotRef.current + totalDelta;
    durationMsRef.current = durationMs;

    const target = targetRotRef.current;
    const increasing = target >= startRotRef.current;

    const loop = (now: number) => {
      // Kiểm tra nếu RAF đã bị cancel (component unmount hoặc reset)
      if (rafRef.current === null) return;

      const elapsed = now - startTimeRef.current;
      const tRaw = Math.min(1, elapsed / durationMsRef.current);
      const eased = easeOutQuint(tRaw);
      let cur = startRotRef.current + eased * totalDelta;

      // CLAMP: đảm bảo cur không vượt target (tránh overshoot)
      if (increasing) cur = Math.min(cur, target);
      else cur = Math.max(cur, target);

      rotationRef.current = cur;
      setRotation(cur);

      if (tRaw < 1) {
        // Kiểm tra lại trước khi request frame tiếp theo
        if (rafRef.current !== null) {
          rafRef.current = requestAnimationFrame(loop);
        }
      } else {
        // Kết thúc: stop RAF, đảm bảo state final = chính xác target (không round)
        stopRAF();
        rotationRef.current = target;
        setRotation(target);

        // Đợi browser paint final frame trước khi show modal để tránh nhảy
        // Sử dụng requestAnimationFrame với check mounted để tránh memory leak
        requestAnimationFrame(() => {
          if (!isMountedRef.current) return;
          requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            setWinner(winningItem.label);
            setShowWinner(true);

            // mount confetti sau 1 rAF nữa để tránh blocking paint modal
            if (winningItem.label === items[0]?.label || winningItem.label === items[1]?.label) {
              requestAnimationFrame(() => {
                if (!isMountedRef.current) return;
                setShowFireworks(true);
                setIsTheBestRewards(true);
              });
            }
            setIsSpinning(false);
          });
        });
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const resetWheel = () => {
    stopRAF();
    clearAllTimeouts();
    rotationRef.current = 0;
    setRotation(0);
    setWinner("");
    setShowWinner(false);
    setIsSpinning(false);
    setShowFireworks(false);
    setIsTheBestRewards(false);
  };

  const closeWinnerModal = useCallback(() => {
    setShowWinner(false);
    setShowFireworks(false);
    setWinner("");
  }, []);

  // Cleanup RAF và timeouts khi component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cleanup khi component unmount
      stopRAF();
      clearAllTimeouts();
    };
  }, []);

  useEffect(() => {
    if (!showWinner) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWinnerModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showWinner, closeWinnerModal]);

  // Helper functions for color conversion
  const hexToRgb = (hex: string): [number, number, number] => {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const rgba = (hex: string, alpha: number) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const deriveIconColors = () => {
    const iconBgColor = 'rgba(31, 36, 45, 0.18)';
    const iconBorderColor = 'rgba(10, 12, 17, 0.05)';
    return { iconBgColor, iconBorderColor };
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #f8fbff 0%, #e8f5ff 50%, #d4edff 100%)',
        px: 2,
        py: 4,
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%237ec8e3' fillOpacity='0.12'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        },
      }}
    >
      <Box
        sx={{
          maxWidth: '1200px',
          mx: 'auto',
          position: 'relative',
          zIndex: 10,
          width: '100%',
          height: '100%',
          minHeight: '100%',
          pt: { xs: '80px', sm: '60px' },
        }}
      >
        {/* Title */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 4,
            minHeight: { xs: 'auto', md: '64px' },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              display: 'inline-block',
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 800,
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 4px 6px rgba(126, 200, 227, 0.6)',
            }}
          >
            {t('games.luckyWheel')}
          </Typography>
        </Box>

        {/* Wheel Container */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Box sx={{ position: 'relative' }}>
            {/* Pointer - Cắt ngang phần đuôi, chỉ hiển thị tam giác và dịch xuống */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                zIndex: 40,
                transform: 'translateX(-50%) rotate(180deg)',
                top: { xs: '8px', sm: '15px' }, // Dịch xuống thêm một chút
                overflow: 'hidden', // Cắt ngang phần đuôi
                width: { xs: '30px', sm: '40px' },
                height: { xs: '18px', sm: '26px' }, // Chỉ đủ để hiển thị phần tam giác, cắt phần đuôi
              }}
            >
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 40 28" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block' }}
              >
                <defs>
                  <filter id="f" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                  </filter>
                  {/* Clip path để cắt ngang phần đuôi, chỉ giữ lại tam giác */}
                  <clipPath id="pointer-clip">
                    <rect x="0" y="0" width="40" height="19" />
                  </clipPath>
                </defs>
                <path
                  d="M20 0 L36 20 H24 V28 H16 V20 H4 L20 0 Z"
                  fill="#E53E3E"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  filter="url(#f)"
                  clipPath="url(#pointer-clip)"
                />
              </svg>
            </Box>

            {/* Wheel */}
            <Box
              sx={{
                width: { xs: 'min(85vw, 400px)', sm: '520px' },
                height: { xs: 'min(85vw, 400px)', sm: '520px' },
                maxWidth: { xs: '400px', sm: '520px' },
                maxHeight: { xs: '400px', sm: '520px' },
                borderRadius: '50%',
                bgcolor: 'white',
                p: { xs: 1.5, sm: 2 },
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                mx: 'auto',
                aspectRatio: '1 / 1',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  bgcolor: '#fff9c4',
                  p: { xs: 0.75, sm: 1 },
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <Box
                  ref={wheelRef}
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: generateConicGradient(colors, items.length),
                    transform: `rotate(${rotation}deg) translateZ(0)`,
                    willChange: 'transform',
                    transition: isSpinning ? 'none' : 'transform 0.3s ease',
                  }}
                >
                  {items.map((item, index) => {
                    const angle = index * segmentAngle + segmentAngle / 2;
                    const IconComponent = icons[index % icons.length];
                    const colorString = colors[index % colors.length];
                    const baseColor = colorString.split(' ')[0].replace('linear-gradient(135deg,', '').replace(',', '').trim();
                    const rgbColor = baseColor.includes('#') ? baseColor : '#667eea';
                    const { iconBgColor, iconBorderColor } = deriveIconColors();

                    return (
                      <Box
                        key={`label-${index}`}
                        sx={{
                          position: 'absolute',
                          color: 'white',
                          fontWeight: 700,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          left: `${50 + 35 * Math.cos(((angle - 90) * Math.PI) / 180)}%`,
                          top: `${50 + 35 * Math.sin(((angle - 90) * Math.PI) / 180)}%`,
                          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                          width: { xs: '50px', sm: '70px' },
                          textAlign: 'center',
                          gap: { xs: '8px', sm: '15px' },
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            borderRadius: '60% 40% 15% 85% / 55% 85% 15% 45%',
                            width: '83%',
                            height: { xs: '42px', sm: '59px' },
                            transform: 'rotate(45deg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${iconBgColor}, ${iconBorderColor})`,
                            border: `2px solid ${iconBorderColor}`,
                            boxShadow: `0 4px 12px ${rgba(rgbColor, 0.28)}, inset 0 1px 3px rgba(255, 255, 255, 0.56)`,
                            overflow: 'hidden',
                            // Skeleton loading animation when not spinning
                            ...(!isSpinning && {
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                transform: 'translateX(-100%)',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
                                animation: 'skeleton-shimmer 2.8s infinite',
                                pointerEvents: 'none',
                                borderRadius: 'inherit',
                              },
                            }),
                          }}
                        >
                          <IconComponent 
                            size={isMobile ? 12 : 16} 
                            style={{ transform: 'rotate(-45deg)' }} 
                          />
                        </Box>
                        {/* Text - Ẩn hoặc thu nhỏ trên mobile nhỏ để tránh tràn */}
                        {!isSmallMobile ? (
                          <Typography
                            sx={{
                              lineHeight: 1.2,
                              fontSize: { xs: '0.6rem', sm: '0.75rem' },
                              wordBreak: 'break-word',
                              width: { xs: '60px', sm: '96px' },
                              maxWidth: { xs: '60px', sm: '96px' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.label}
                          </Typography>
                        ) : (
                          // Trên mobile rất nhỏ, chỉ hiển thị emoji/icon từ label nếu có
                          <Typography
                            sx={{
                              lineHeight: 1.2,
                              fontSize: '0.5rem',
                              width: '40px',
                              maxWidth: '40px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {(item.label.match(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27FF]/g) || [])[0] || item.label.charAt(0)}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}

                  {/* Center Button */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: { xs: '68px', sm: '96px' },
                      height: { xs: '68px', sm: '96px' },
                      bgcolor: '#2196F3',
                      borderRadius: '50%',
                      border: { xs: '3px solid white', sm: '4px solid white' },
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {!isSpinning && (
                      <Button
                        onClick={spinWheel}
                        disabled={isSpinning || items.length === 0}
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: 'transparent',
                          '&:hover': { bgcolor: 'transparent' },
                          minWidth: 0,
                          p: 0,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1.5, sm: 2 }, 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            width: '100%',
            px: { xs: 1, sm: 0 },
          }}>
            <Button
              onClick={spinWheel}
              disabled={isSpinning || items.length === 0}
              variant="contained"
              startIcon={<Play size={isMobile ? 20 : 24} />}
              sx={{
                px: { xs: 3, sm: 4 },
                py: { xs: 1.5, sm: 2 },
                borderRadius: '50px',
                fontSize: { xs: '0.9rem', sm: '1.125rem' },
                fontWeight: 700,
                boxShadow: '0 10px 30px rgba(126, 200, 227, 0.4)',
                flex: { xs: '1 1 auto', sm: 'none' },
                minWidth: { xs: '140px', sm: 'auto' },
                '&:hover': {
                  transform: 'scale(1.05)',
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              {isSpinning ? t('luckyWheel.spinning') : t('luckyWheel.spinNow')}
            </Button>

            <Button
              onClick={resetWheel}
              variant="outlined"
              startIcon={<RotateCcw size={isMobile ? 18 : 20} />}
              sx={{
                px: { xs: 2.5, sm: 3 },
                py: { xs: 1.5, sm: 2 },
                borderRadius: '50px',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                borderWidth: 2,
                borderColor: '#7ec8e3',
                color: '#7ec8e3',
                bgcolor: 'white',
                boxShadow: '0 4px 12px rgba(126, 200, 227, 0.2)',
                flex: { xs: '1 1 auto', sm: 'none' },
                minWidth: { xs: '100px', sm: 'auto' },
                '&:hover': {
                  bgcolor: '#7ec8e3',
                  color: 'white',
                  borderColor: 'white',
                  transform: 'scale(1.05)',
                },
              }}
            >
              {t('luckyWheel.reset')}
            </Button>
          </Box>

        </Box>
      </Box>

      {/* Winner Modal - Full screen overlay */}
      {showWinner && (
        <Box
          onClick={closeWinnerModal}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer',
          }}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              maxWidth: '500px',
              mx: 2,
              background: 'linear-gradient(135deg, #fff9c4 0%, #ffe082 100%)',
              border: '4px solid #ff9800',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              cursor: 'default',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 700,
                  color: '#d32f2f',
                  mb: 2,
                }}
              >
                  {isTheBestRewards ? t('luckyWheel.congratulations') : t('luckyWheel.result')}
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  color: '#f57c00',
                  fontWeight: 700,
                  mb: 1,
                }}
              >
                {winner}
              </Typography>

              <Typography
                sx={{
                  color: '#d32f2f',
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  fontWeight: 600,
                }}
              >
                  {t('luckyWheel.winnerMessage').replace('{winner}', winner)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Confetti */}
      <ConfettiParty show={showFireworks} />
    </Box>
  );
}
