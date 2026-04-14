"use client";

import { useState, useEffect, useCallback } from "react";

const LOGOUT_COOLDOWN_MINUTES = 10;
const LOGOUT_COOLDOWN_MS = LOGOUT_COOLDOWN_MINUTES * 60 * 1000;

interface UseLogoutCooldownReturn {
  canLogout: boolean;
  remainingTime: number; // 剩余毫秒数
  formattedTime: string; // 格式化的时间字符串 "MM:SS"
  refresh: () => void;
}

export function useLogoutCooldown(): UseLogoutCooldownReturn {
  const [remainingTime, setRemainingTime] = useState(0);

  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const lastLogin = localStorage.getItem("lastLogin");
    if (!lastLogin) {
      setRemainingTime(0);
      return;
    }

    const loginTime = new Date(lastLogin).getTime();
    const now = Date.now();
    const elapsed = now - loginTime;
    const remaining = Math.max(0, LOGOUT_COOLDOWN_MS - elapsed);
    
    setRemainingTime(remaining);
  }, []);

  useEffect(() => {
    refresh();
    
    // 每秒更新倒计时
    const interval = setInterval(refresh, 1000);
    
    return () => clearInterval(interval);
  }, [refresh]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    canLogout: remainingTime === 0,
    remainingTime,
    formattedTime: formatTime(remainingTime),
    refresh,
  };
}
