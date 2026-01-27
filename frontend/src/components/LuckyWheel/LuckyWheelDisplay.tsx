import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Typography, useTheme, useMediaQuery } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import StarIcon from "@mui/icons-material/Star";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BoltIcon from "@mui/icons-material/Bolt";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SettingsIcon from "@mui/icons-material/Settings";
import ConfettiParty from "./ConfettiParty";
import { useLuckyWheel } from "./LuckyWheelContext";
import { useLanguage } from "../../i18n";

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

export default function LuckyWheelDisplay() {
  const { items, colors } = useLuckyWheel();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const theme = useTheme();
  // Memoize media queries to prevent excessive re-renders during zoom
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const isSmallMobile = useMediaQuery('(max-width: 400px)', { noSsr: true });
  
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
  const nestedRafRefs = useRef<number[]>([]); // Track nested RAFs for cleanup
  const isZoomingRef = useRef(false); // Track if user is zooming
  const lastRotationUpdateRef = useRef(0); // Throttle rotation updates
  const rafLoopActiveRef = useRef(false); // Prevent multiple RAF loops

  const [winner, setWinner] = useState("");
  const [showWinner, setShowWinner] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  // Memoize icons array to prevent recreation on every render
  const icons = useMemo(() => [
    CardGiftcardIcon, StarIcon, FavoriteIcon, BoltIcon, 
    WorkspacePremiumIcon, EmojiEventsIcon, CardGiftcardIcon, StarIcon
  ], []);

  // Memoize segment angle calculation
  const segmentAngle = useMemo(() => items.length ? 360 / items.length : 360, [items.length]);

  // Memoize conic gradient to avoid recalculating on every render
  const generateConicGradient = useCallback((colors: string[], itemCount: number) => {
    if (itemCount === 0) return "";
    const anglePerItem = 360 / itemCount;
    const segments = Array.from({ length: itemCount }, (_, i) => {
      const start = i * anglePerItem;
      const end = (i + 1) * anglePerItem;
      const color = colors[i % colors.length];
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, []);
  
  // Memoize the gradient value
  const conicGradient = useMemo(() => generateConicGradient(colors, items.length), [colors, items.length, generateConicGradient]);

  const weightedRandom = (options: { label: string; weight: number }[]) => {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    if (totalWeight === 0) return { index: 0, item: options[0] };
    
    const rand = Math.random() * totalWeight;
    let sum = 0;
    for (let i = 0; i < options.length; i++) {
      sum += options[i].weight;
      if (rand < sum) {
        return { index: i, item: options[i] };
      }
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
    // Cleanup nested RAFs
    nestedRafRefs.current.forEach((id) => cancelAnimationFrame(id));
    nestedRafRefs.current = [];
    rafLoopActiveRef.current = false; // Reset loop flag
  };

  const spinWheel = () => {
    if (isSpinning || items.length === 0 || isZoomingRef.current) return; // Don't spin while zooming
    setIsSpinning(true);
    setShowWinner(false);
    setWinner("");
    setShowFireworks(false);
    setIsTheBestRewards(false);
    clearAllTimeouts();
    stopRAF();
    rafLoopActiveRef.current = false; // Reset loop flag

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
      // Kiểm tra nếu RAF đã bị cancel (component unmount, reset, hoặc đang zoom)
      if (rafRef.current === null || !isMountedRef.current || isZoomingRef.current) {
        stopRAF();
        return;
      }

      // Throttle rotation updates to max 60fps (every ~16ms)
      const timeSinceLastUpdate = now - lastRotationUpdateRef.current;
      if (timeSinceLastUpdate < 16) {
        // Skip this frame if too soon, but continue the loop
        if (rafRef.current !== null && !isZoomingRef.current && isMountedRef.current) {
          rafRef.current = requestAnimationFrame(loop);
        } else {
          stopRAF();
        }
        return;
      }

      const elapsed = now - startTimeRef.current;
      const tRaw = Math.min(1, elapsed / durationMsRef.current);
      const eased = easeOutQuint(tRaw);
      let cur = startRotRef.current + eased * totalDelta;

      // CLAMP: đảm bảo cur không vượt target (tránh overshoot)
      if (increasing) cur = Math.min(cur, target);
      else cur = Math.max(cur, target);

      rotationRef.current = cur;
      lastRotationUpdateRef.current = now;
      setRotation(cur);

      if (tRaw < 1) {
        // Kiểm tra lại trước khi request frame tiếp theo
        if (rafRef.current !== null && !isZoomingRef.current && isMountedRef.current) {
          rafRef.current = requestAnimationFrame(loop);
        } else {
          stopRAF();
        }
      } else {
        // Kết thúc: stop RAF, đảm bảo state final = chính xác target (không round)
        stopRAF();
        rafLoopActiveRef.current = false; // Reset loop flag
        rotationRef.current = target;
        setRotation(target);

        // Đợi browser paint final frame trước khi show modal để tránh nhảy
        // Sử dụng requestAnimationFrame với check mounted để tránh memory leak
        const raf1 = requestAnimationFrame(() => {
          if (!isMountedRef.current || rafRef.current === null) return;
          const raf2 = requestAnimationFrame(() => {
            if (!isMountedRef.current || rafRef.current === null) return;
            setWinner(winningItem.label);
            setShowWinner(true);

            // mount confetti sau 1 rAF nữa để tránh blocking paint modal
            if (winningItem.label === items[0]?.label || winningItem.label === items[1]?.label) {
              const raf3 = requestAnimationFrame(() => {
                if (!isMountedRef.current || rafRef.current === null) return;
                setShowFireworks(true);
                setIsTheBestRewards(true);
              });
              nestedRafRefs.current.push(raf3);
            }
            setIsSpinning(false);
            // Remove from nested refs after execution
            nestedRafRefs.current = nestedRafRefs.current.filter(id => id !== raf2);
          });
          nestedRafRefs.current.push(raf2);
          // Remove from nested refs after execution
          nestedRafRefs.current = nestedRafRefs.current.filter(id => id !== raf1);
        });
        nestedRafRefs.current.push(raf1);
      }
    };

    // Prevent multiple RAF loops
    if (rafLoopActiveRef.current || isZoomingRef.current) {
      return;
    }
    rafLoopActiveRef.current = true;
    lastRotationUpdateRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  };

  const resetWheel = () => {
    stopRAF();
    clearAllTimeouts();
    rafLoopActiveRef.current = false;
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

  // Cleanup RAF và timeouts khi component unmount hoặc khi zoom/resize
  useEffect(() => {
    isMountedRef.current = true;
    
    // Prevent trackpad zoom gestures
    const preventZoom = (e: WheelEvent | TouchEvent) => {
      // Prevent pinch zoom (trackpad gesture)
      if (e instanceof WheelEvent) {
        // Trackpad zoom usually has ctrlKey or metaKey
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      // Prevent touch pinch zoom
      if (e instanceof TouchEvent && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    // Prevent zoom via CSS
    const preventZoomCSS = (e: Event) => {
      if (e instanceof WheelEvent && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    // Add event listeners to prevent zoom
    document.addEventListener('wheel', preventZoom, { passive: false });
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventZoomCSS, { passive: false });
    document.addEventListener('gesturechange', preventZoomCSS, { passive: false });
    document.addEventListener('gestureend', preventZoomCSS, { passive: false });
    
    // Detect zoom changes
    let lastZoomLevel = window.devicePixelRatio || 1;
    let zoomCheckInterval: ReturnType<typeof setInterval> | null = null;
    
    const checkZoom = () => {
      const currentZoom = window.devicePixelRatio || 1;
      if (Math.abs(currentZoom - lastZoomLevel) > 0.01) {
        // Zoom detected
        isZoomingRef.current = true;
        lastZoomLevel = currentZoom;
        
        // Stop RAF immediately when zooming
        stopRAF();
        
        // Reset zoom flag after zoom stabilizes
        setTimeout(() => {
          isZoomingRef.current = false;
        }, 300);
      }
    };
    
    // Check zoom every 100ms
    zoomCheckInterval = setInterval(checkZoom, 100);
    
    // Handle zoom/resize events to prevent crashes
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let resizeStartTime = 0;
    
    const handleResizeStart = () => {
      resizeStartTime = performance.now();
      isZoomingRef.current = true;
      // Stop RAF immediately when resize starts
      stopRAF();
    };
    
    const handleResizeEnd = () => {
      const resizeDuration = performance.now() - resizeStartTime;
      // Reset zoom flag after resize stabilizes (debounce)
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        isZoomingRef.current = false;
      }, Math.max(300, resizeDuration));
    };
    
    // Throttled resize handler with start/end detection
    let lastResizeTime = 0;
    const throttledResize = () => {
      const now = performance.now();
      if (now - lastResizeTime > 50) {
        handleResizeStart();
      }
      lastResizeTime = now;
      handleResizeEnd();
    };
    
    window.addEventListener('resize', throttledResize, { passive: true });
    
    return () => {
      isMountedRef.current = false;
      isZoomingRef.current = false;
      // Cleanup khi component unmount
      stopRAF();
      clearAllTimeouts();
      window.removeEventListener('resize', throttledResize);
      document.removeEventListener('wheel', preventZoom);
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventZoomCSS);
      document.removeEventListener('gesturechange', preventZoomCSS);
      document.removeEventListener('gestureend', preventZoomCSS);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (zoomCheckInterval) clearInterval(zoomCheckInterval);
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

  // Helper functions for color conversion - memoized
  const hexToRgb = useCallback((hex: string): [number, number, number] => {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }, []);

  const rgba = useCallback((hex: string, alpha: number) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, [hexToRgb]);

  const deriveIconColors = useCallback(() => {
    const iconBgColor = 'rgba(31, 36, 45, 0.18)';
    const iconBorderColor = 'rgba(10, 12, 17, 0.05)';
    return { iconBgColor, iconBorderColor };
  }, []);
  
  // Memoize label size and radius multiplier calculations
  // Tính toán động dựa trên số lượng items (3-12) để layout đẹp ở mọi trường hợp
  // Điều chỉnh để tránh méo và đảm bảo không bị khuất
  const { labelSize, radiusMultiplier, containerWidth, gapSize } = useMemo(() => {
    const itemCount = items.length;
    
    // Tính toán radius multiplier: điều chỉnh để tránh méo, khuất và quá sát rìa
    // Với wheel size cố định, cần tính toán chính xác hơn
    // Với ít options -> đưa vào trong hơn để tránh sát rìa
    let radius = 38;
    if (itemCount <= 4) {
      radius = 36; // Ít items -> đưa vào trong để tránh sát rìa
    } else if (itemCount <= 5) {
      radius = 37; // Đưa vào trong
    } else if (itemCount <= 6) {
      radius = 37.5; // Hơi vào trong
    } else if (itemCount <= 7) {
      radius = 38; // Trung bình
    } else if (itemCount <= 8) {
      radius = 38.2; // Trung bình
    } else if (itemCount <= 9) {
      radius = 38; // Nhiều items
    } else if (itemCount <= 10) {
      radius = 37.5; // Nhiều items
    } else {
      radius = 37; // Rất nhiều items (11-12) -> gần tâm để tránh méo và overlap
    }
    
    // Tính toán label size: điều chỉnh để tránh méo
    let size = 1.0;
    if (itemCount <= 4) {
      size = 1.2; // Lớn cho ít items
    } else if (itemCount <= 6) {
      size = 1.1; // Lớn
    } else if (itemCount <= 7) {
      size = 1.05; // Trung bình lớn
    } else if (itemCount <= 8) {
      size = 1.0; // Trung bình
    } else if (itemCount <= 9) {
      size = 0.95; // Trung bình nhỏ
    } else if (itemCount <= 10) {
      size = 0.9; // Nhỏ
    } else {
      size = 0.85; // Rất nhỏ cho 11-12 items để tránh méo
    }
    
    // Container width: điều chỉnh để phù hợp với wheel size cố định
    let width = 70;
    if (itemCount <= 4) {
      width = 85;
    } else if (itemCount <= 6) {
      width = 80;
    } else if (itemCount <= 7) {
      width = 75;
    } else if (itemCount <= 8) {
      width = 72;
    } else if (itemCount <= 9) {
      width = 70;
    } else if (itemCount <= 10) {
      width = 68;
    } else {
      width = 65; // Nhỏ hơn cho 11-12 items
    }
    
    // Gap size: điều chỉnh để phù hợp
    let gap = 15;
    if (itemCount <= 4) {
      gap = 18;
    } else if (itemCount <= 6) {
      gap = 17;
    } else if (itemCount <= 7) {
      gap = 16;
    } else if (itemCount <= 8) {
      gap = 15;
    } else if (itemCount <= 9) {
      gap = 14;
    } else if (itemCount <= 10) {
      gap = 13;
    } else {
      gap = 12; // Gap nhỏ cho 11-12 items
    }
    
    return {
      labelSize: size,
      radiusMultiplier: radius,
      containerWidth: width,
      gapSize: gap,
    };
  }, [items.length]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #f8fbff 0%, #e8f5ff 50%, #d4edff 100%)',
        px: 2,
        py: { xs: 4, sm: 4, md: 2 }, // Giảm padding-y trên desktop
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'pan-x pan-y', // Allow panning but prevent pinch zoom
        userSelect: 'none', // Prevent text selection that might trigger zoom
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
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
          pt: { xs: '80px', sm: '60px', md: 0 }, // No padding on desktop
          pb: { xs: 4, sm: 4, md: 0 }, // Không có padding-bottom trên desktop
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { xs: 'flex-start', sm: 'flex-start', md: 'flex-start' }, // Flex-start để kiểm soát khoảng cách tốt hơn
        }}
      >
        {/* Title - Centered */}
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 2, sm: 3, md: 2 }, // Giảm margin-bottom trên desktop
            px: { xs: 2, sm: 0 },
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

        {/* Configure Button - Below title on mobile/tablet, top right on desktop */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'center', md: 'flex-end' },
            mb: { xs: 2, sm: 3, md: 1 }, // Giảm margin-bottom trên desktop
            px: { xs: 2, sm: 0 },
            position: { md: 'absolute' },
            top: { md: '20px' }, // Giảm top để tiết kiệm không gian
            right: { md: 0 },
            width: { md: '100%' },
            maxWidth: { md: '1200px' },
            zIndex: 10,
          }}
        >
          <Button
            onClick={() => navigate('/lucky-wheel/config')}
            variant="contained"
            startIcon={<SettingsIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
            sx={{
              px: { xs: 2.5, sm: 3 },
              py: { xs: 1.25, sm: 1.5 },
              borderRadius: '50px',
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              fontWeight: 600,
              letterSpacing: '0.3px',
              bgcolor: '#7ec8e3',
              color: 'white',
              boxShadow: '0 4px 15px rgba(126, 200, 227, 0.35)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: '#5fb3d1',
                boxShadow: '0 6px 20px rgba(126, 200, 227, 0.5)',
                transform: 'translateY(-2px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }}
          >
            {t('luckyWheel.config.button') || t('luckyWheel.config.title') || 'Configure Options'}
          </Button>
        </Box>

        {/* Wheel Container */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            mb: { xs: 12, sm: 10, md: 4 }, // Giảm nhiều hơn trên desktop để tránh scroll
            flex: { md: '0 0 auto' }, // Không grow trên desktop
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
                top: { xs: '6px', sm: '13px' }, // Nhích lên thêm 2px
                overflow: 'hidden', // Cắt ngang phần đuôi
                // Scale pointer based on wheel size (more items = larger wheel = larger pointer)
                width: { 
                  xs: items.length <= 6 ? '30px' : items.length <= 9 ? '35px' : '40px',
                  sm: items.length <= 6 ? '40px' : items.length <= 9 ? '45px' : '50px'
                },
                height: { 
                  xs: items.length <= 6 ? '18px' : items.length <= 9 ? '22px' : '26px',
                  sm: items.length <= 6 ? '26px' : items.length <= 9 ? '30px' : '34px'
                },
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

            {/* Wheel - Fixed size để đảm bảo đủ không gian cho mọi số lượng options */}
            <Box
              sx={{
                // Fixed size cho desktop/tablet, responsive cho mobile
                width: { 
                  xs: 'min(90vw, 500px)', // Mobile: đủ lớn để chứa ít options
                  sm: '600px', // Tablet: cố định
                  md: '680px' // Desktop: cố định, đủ lớn cho 12 options
                },
                height: { 
                  xs: 'min(90vw, 500px)',
                  sm: '600px',
                  md: '680px'
                },
                maxWidth: { 
                  xs: '500px',
                  sm: '600px',
                  md: '680px'
                },
                maxHeight: { 
                  xs: '500px',
                  sm: '600px',
                  md: '680px'
                },
                minWidth: { 
                  xs: '400px', // Đảm bảo tối thiểu cho ít options
                  sm: '600px',
                  md: '680px'
                },
                minHeight: { 
                  xs: '400px',
                  sm: '600px',
                  md: '680px'
                },
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
                    background: conicGradient,
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
                          left: `${50 + radiusMultiplier * Math.cos(((angle - 90) * Math.PI) / 180)}%`,
                          top: `${50 + radiusMultiplier * Math.sin(((angle - 90) * Math.PI) / 180)}%`,
                          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                          width: { 
                            xs: `${Math.round(50 * labelSize)}px`, 
                            sm: `${Math.round(containerWidth * labelSize)}px` 
                          },
                          textAlign: 'center',
                          gap: { 
                            xs: `${Math.round(8 * labelSize)}px`, 
                            sm: `${Math.round(gapSize * labelSize)}px` 
                          },
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            borderRadius: '60% 40% 15% 85% / 55% 85% 15% 45%',
                            width: { 
                              xs: `${Math.round(42 * labelSize)}px`, 
                              sm: `${Math.round(59 * labelSize)}px` 
                            },
                            height: { 
                              xs: `${Math.round(42 * labelSize)}px`, 
                              sm: `${Math.round(59 * labelSize)}px` 
                            },
                            // Đảm bảo aspect ratio 1:1 để tránh méo
                            aspectRatio: '1 / 1',
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
                            sx={{ 
                              fontSize: isMobile 
                                ? `${12 * labelSize}px` 
                                : `${16 * labelSize}px`, 
                              transform: 'rotate(-45deg)' 
                            }} 
                          />
                        </Box>
                        {/* Text - Tăng kích thước và cải thiện style để dễ đọc */}
                        {!isSmallMobile ? (
                          <Typography
                            sx={{
                              lineHeight: 1.3,
                              fontSize: { 
                                xs: `${Math.round(0.75 * labelSize * 10) / 10}rem`, 
                                sm: `${Math.round(0.95 * labelSize * 10) / 10}rem`,
                                md: `${Math.round(1.05 * labelSize * 10) / 10}rem`
                              },
                              fontWeight: 800,
                              wordBreak: 'break-word',
                              width: { 
                                xs: `${Math.round(70 * labelSize)}px`, 
                                sm: `${Math.round(containerWidth * 1.4 * labelSize)}px`,
                                md: `${Math.round(containerWidth * 1.5 * labelSize)}px`
                              },
                              maxWidth: { 
                                xs: `${Math.round(70 * labelSize)}px`, 
                                sm: `${Math.round(containerWidth * 1.4 * labelSize)}px`,
                                md: `${Math.round(containerWidth * 1.5 * labelSize)}px`
                              },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              color: 'white',
                              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)',
                              letterSpacing: '0.5px',
                              textStroke: '0.5px rgba(0, 0, 0, 0.3)',
                              WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.3)',
                            }}
                          >
                            {item.label}
                          </Typography>
                        ) : (
                          // Trên mobile rất nhỏ, chỉ hiển thị emoji/icon từ label nếu có
                          <Typography
                            sx={{
                              lineHeight: 1.2,
                              fontSize: `${0.65 * labelSize}rem`,
                              fontWeight: 800,
                              width: `${50 * labelSize}px`,
                              maxWidth: `${50 * labelSize}px`,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'white',
                              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                            }}
                          >
                            {(item.label.match(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27FF]/g) || [])[0] || item.label.charAt(0)}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}

                  {/* Center Button - Scale based on wheel size */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: { 
                        xs: items.length <= 6 ? '68px' : items.length <= 9 ? '75px' : '82px',
                        sm: items.length <= 6 ? '96px' : items.length <= 9 ? '108px' : '120px'
                      },
                      height: { 
                        xs: items.length <= 6 ? '68px' : items.length <= 9 ? '75px' : '82px',
                        sm: items.length <= 6 ? '96px' : items.length <= 9 ? '108px' : '120px'
                      },
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
            mt: { xs: 4, sm: 4, md: 2 }, // Giảm nhiều hơn trên desktop để tránh scroll
            mb: { xs: 4, sm: 4, md: 0 }, // Không có margin-bottom trên desktop
            flex: { md: '0 0 auto' }, // Không grow trên desktop
          }}>
            <Button
              onClick={spinWheel}
              disabled={isSpinning || items.length === 0}
              variant="contained"
              startIcon={<PlayArrowIcon sx={{ fontSize: isMobile ? 20 : 24 }} />}
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
              startIcon={<RefreshIcon sx={{ fontSize: isMobile ? 18 : 20 }} />}
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
