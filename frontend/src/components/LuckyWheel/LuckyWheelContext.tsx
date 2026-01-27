import React, { createContext, useContext, useState, useEffect } from "react";

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
  colors: string[];
};

const LuckyWheelContext = createContext<LuckyWheelContextType | undefined>(undefined);

export const LuckyWheelProvider = ({ children }: { children: React.ReactNode }) => {
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
        console.error("Error loading items from localStorage:", error);
      }
    }
    return defaultItems;
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Đánh dấu đã initialized sau khi mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Lưu vào localStorage mỗi khi items thay đổi
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Error saving items to localStorage:", error);
      }
    }
  }, [items, isInitialized]);

  const colors = [
    "#4CAF50", "#2196F3", "#9C27B0", "#F44336",
    "#FF9800", "#FFC107", "#00BCD4", "#795548",
    "#F44336", "#3F51B5", "#009688", "#E91E63"
  ];

  const addItem = (label: string) => {
    setItems((prevItems) => {
      if (label.trim() && prevItems.length < 12) {
        return [...prevItems, { label: label.trim(), weight: 1 }];
      }
      return prevItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((prevItems) => {
      if (prevItems.length > 2) {
        return prevItems.filter((_, i) => i !== index);
      }
      return prevItems;
    });
  };

  const updateItemWeight = (index: number, weight: number) => {
    // Đảm bảo weight trong khoảng hợp lệ
    const validWeight = Math.max(0, Math.min(100, weight));
    
    setItems((prevItems) => 
      prevItems.map((item, i) => 
        i === index ? { ...item, weight: validWeight } : item
      )
    );
  };

  return (
    <LuckyWheelContext.Provider value={{ items, setItems, addItem, removeItem, updateItemWeight, colors }}>
      {children}
    </LuckyWheelContext.Provider>
  );
};

export const useLuckyWheel = () => {
  const ctx = useContext(LuckyWheelContext);
  if (!ctx) throw new Error("useLuckyWheel must be used within LuckyWheelProvider");
  return ctx;
};
