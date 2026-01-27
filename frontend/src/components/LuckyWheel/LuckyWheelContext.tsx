import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { luckyWheelApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

type WheelItem = { label: string; weight: number };

const STORAGE_KEY = "lucky-wheel-items";

const defaultItems: WheelItem[] = [
  { label: "Nhất 🏆", weight: 1 },
  { label: "Nhì 🥈", weight: 0 },
  { label: "Ba 🥉", weight: 0 },
  { label: "Jackpot 💎", weight: 0 },
  { label: "Bonus 💰", weight: 0 },
  { label: "Chúc may mắn 🍀", weight: 0 },
  { label: "Thử lại 🔄", weight: 0 },
  { label: "Khuyến khích 🎖️", weight: 0 },
];

type LuckyWheelContextType = {
  items: WheelItem[];
  setItems: React.Dispatch<React.SetStateAction<WheelItem[]>>;
  addItem: (label: string) => void;
  removeItem: (index: number) => void;
  updateItemWeight: (index: number, weight: number) => void;
  saveConfigToServer: (itemsToSave?: WheelItem[]) => Promise<void>;
  loadConfigFromServer: () => Promise<void>;
  isLoading: boolean;
  colors: string[];
  updateActivity: (immediate?: boolean) => void;
};

const LuckyWheelContext = createContext<LuckyWheelContextType | undefined>(undefined);

export const LuckyWheelProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Khởi tạo state - load từ localStorage nếu có, nếu không dùng default
  const [items, setItems] = useState<WheelItem[]>(() => {
    // Chỉ chạy trên client
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedItems = JSON.parse(stored);
          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
            return parsedItems;
          }
        }
      } catch (error) {
        // Silently fail, use default
      }
    }
    return defaultItems;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const itemsChangedByUserRef = useRef(false);
  const lastConfigHashRef = useRef<string>('');

  // Load config from server
  const loadConfigFromServer = React.useCallback(async (skipIfUnchanged = false): Promise<void> => {
    try {
      setIsLoading(true);
      // Mark as server load, not user change
      itemsChangedByUserRef.current = false;
      
      const response = await luckyWheelApi.getMyConfig();
      if (response.items && response.items.length > 0) {
        // Create hash to check if config changed
        const configHash = JSON.stringify(response.items);
        
        // Skip update if config hasn't changed (for polling)
        if (skipIfUnchanged && configHash === lastConfigHashRef.current) {
          setIsLoading(false);
          return;
        }
        
        lastConfigHashRef.current = configHash;
        setItems(response.items);
        // Also update localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response.items));
      }
    } catch (error) {
      // Silently fail, fallback to localStorage or default
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update activity timestamp (immediate for initial, debounced for subsequent)
  const updateActivity = React.useCallback((immediate = false) => {
    // Only track activity for guest users
    if (isAuthenticated) return;

    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }

    if (immediate) {
      // Update immediately (when page loads)
      luckyWheelApi.updateActivity().catch(() => {
        // Silently fail
      });
    } else {
      // Debounce activity updates (every 5 minutes for subsequent updates)
      activityTimeoutRef.current = setTimeout(() => {
        luckyWheelApi.updateActivity().catch(() => {
          // Silently fail
        });
      }, 5 * 60 * 1000); // 5 minutes
    }
  }, [isAuthenticated]);

  // Đánh dấu đã initialized sau khi mount và load từ server
  useEffect(() => {
    const initialize = async () => {
      setIsInitialized(true);
      await loadConfigFromServer();
      // Update activity immediately when page loads (for guest users)
      if (!isAuthenticated) {
        updateActivity(true);
      }
    };
    initialize();
  }, [loadConfigFromServer, isAuthenticated, updateActivity]);

  // Polling: Check for config updates from admin (only when tab is visible)
  // Đảm bảo user tự động nhận config mới khi admin update weights
  useEffect(() => {
    if (!isInitialized) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      // Only poll if tab is visible
      if (document.visibilityState === 'visible' && !isSavingRef.current) {
        loadConfigFromServer(true).catch(() => {
          // Silently fail
        });
      }
    };

    // Poll every 15 seconds (reduced for better performance, only when visible)
    pollInterval = setInterval(startPolling, 15000);

    // Also poll when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSavingRef.current) {
        loadConfigFromServer(true).catch(() => {
          // Silently fail
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized, loadConfigFromServer]);

  // Lưu vào localStorage mỗi khi items thay đổi (cache) - debounced
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        // Silently fail
      }
    }, 500); // Debounce localStorage writes

    return () => {
      clearTimeout(timeoutId);
    };
  }, [items, isInitialized]);

  // Save config to server - accepts itemsToSave parameter to avoid stale closure issues
  const saveConfigToServer = React.useCallback(async (itemsToSave?: WheelItem[]): Promise<void> => {
    if (isSavingRef.current) return;
    
    try {
      isSavingRef.current = true;
      // Use provided itemsToSave or fall back to current state items
      const currentItems = itemsToSave || items;
      await luckyWheelApi.saveConfig(currentItems);
      // Update hash after save
      lastConfigHashRef.current = JSON.stringify(currentItems);
      // If itemsToSave was provided, also update state to keep them in sync
      if (itemsToSave) {
        setItems(itemsToSave);
      }
    } catch (error) {
      throw error;
    } finally {
      isSavingRef.current = false;
    }
  }, [items, setItems]); // Include items and setItems in deps

  // Auto-save to server after items change (debounced)
  // Chỉ save nếu user thay đổi items, không save khi load từ server
  useEffect(() => {
    if (!isInitialized) return;
    
    // Nếu items thay đổi từ server load (polling hoặc initial load), không auto-save
    if (!itemsChangedByUserRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to server (wait 2 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      // Use current items from state
      const currentItems = items;
      if (isSavingRef.current) return;
      
      isSavingRef.current = true;
      luckyWheelApi.saveConfig(currentItems)
        .then(() => {
          lastConfigHashRef.current = JSON.stringify(currentItems);
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => {
          isSavingRef.current = false;
        });
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, isInitialized]); // Direct API call to avoid function recreation

  const colors = [
    "#4CAF50", "#2196F3", "#9C27B0", "#F44336",
    "#FF9800", "#FFC107", "#00BCD4", "#795548",
    "#F44336", "#3F51B5", "#009688", "#E91E63"
  ];

  const addItem = React.useCallback((label: string) => {
    itemsChangedByUserRef.current = true; // Mark as user change
    setItems((prevItems) => {
      if (label.trim() && prevItems.length < 12) {
        return [...prevItems, { label: label.trim(), weight: 1 }];
      }
      return prevItems;
    });
  }, []);

  const removeItem = React.useCallback((index: number) => {
    itemsChangedByUserRef.current = true; // Mark as user change
    setItems((prevItems) => {
      if (prevItems.length > 2) {
        return prevItems.filter((_, i) => i !== index);
      }
      return prevItems;
    });
  }, []);

  const updateItemWeight = React.useCallback((index: number, weight: number) => {
    itemsChangedByUserRef.current = true; // Mark as user change
    // Đảm bảo weight trong khoảng hợp lệ
    const validWeight = Math.max(0, Math.min(100, weight));
    
    setItems((prevItems) => 
      prevItems.map((item, i) => 
        i === index ? { ...item, weight: validWeight } : item
      )
    );
  }, []);

  // Session tracking: Delete guest config when tab closes
  useEffect(() => {
    // Only track for guest users
    if (isAuthenticated) return;

    const deleteGuestConfigOnClose = () => {
      // Delete guest config when tab closes
      const { getGuestId } = require('../../utils/guestId');
      const guestId = getGuestId();
      
      if (guestId) {
        // Use fetch with keepalive for reliable delivery even when tab is closing
        fetch(`${window.location.origin}/api/lucky-wheel/config`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ guestId }),
          keepalive: true, // Ensures request completes even if tab closes
        }).catch(() => {
          // Silently fail
        });
      }
    };

    const handleBeforeUnload = () => {
      deleteGuestConfigOnClose();
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      // pagehide is more reliable than beforeunload in some browsers
      if (e.persisted) {
        // Page is being cached (back/forward navigation), don't delete
        return;
      }
      deleteGuestConfigOnClose();
    };

    // Track visibility changes (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab is visible again, update activity immediately
        updateActivity(true);
      }
    };

    // Track user interactions - throttled to prevent excessive calls
    let lastActivityTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle to max once per 30 seconds
      if (now - lastActivityTime > 30000) {
        lastActivityTime = now;
        updateActivity(false); // Debounced
      }
    };

    // Initial activity update (immediate when page loads)
    updateActivity(true);

    // Add event listeners with passive flag for better performance
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity, { passive: true });
    document.addEventListener('keydown', handleUserActivity, { passive: true });
    document.addEventListener('touchstart', handleUserActivity, { passive: true });

    return () => {
      // Cleanup
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [isAuthenticated, updateActivity]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    items, 
    setItems, 
    addItem, 
    removeItem, 
    updateItemWeight, 
    saveConfigToServer,
    loadConfigFromServer,
    isLoading,
    colors,
    updateActivity
  }), [items, setItems, addItem, removeItem, updateItemWeight, saveConfigToServer, loadConfigFromServer, isLoading, colors, updateActivity]);

  return (
    <LuckyWheelContext.Provider value={contextValue}>
      {children}
    </LuckyWheelContext.Provider>
  );
};

export const useLuckyWheel = () => {
  const ctx = useContext(LuckyWheelContext);
  if (!ctx) throw new Error("useLuckyWheel must be used within LuckyWheelProvider");
  return ctx;
};
