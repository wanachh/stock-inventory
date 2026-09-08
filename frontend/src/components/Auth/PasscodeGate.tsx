"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, ShieldCheck, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";

interface PasscodeGateProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  // Configured team passcode (defaults to 2026 if not set in environment variable)
  const EXPECTED_PASSCODE = process.env.NEXT_PUBLIC_APP_PASSCODE || "2026";
  const STORAGE_KEY = "stockpulse_team_session";

  useEffect(() => {
    // Check saved session in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.token === EXPECTED_PASSCODE && parsed.expiresAt > Date.now()) {
          setIsAuthenticated(true);
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }
    setIsAuthenticated(false);
  }, [EXPECTED_PASSCODE]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passcode.trim() === EXPECTED_PASSCODE) {
      if (remember) {
        const sessionData = {
          token: EXPECTED_PASSCODE,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        } catch {
          // Ignore storage errors
        }
      }
      setIsAuthenticated(true);
    } else {
      setError("รหัสผ่านทีมไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      setPasscode("");
    }
  };

  const handleKeypadPress = (num: string) => {
    if (passcode.length < 12) {
      setPasscode((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPasscode((prev) => prev.slice(0, -1));
  };

  // Loading state while checking localStorage
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-xs text-zinc-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  // Already authenticated: render app
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Locked: Render Team Security Gate
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-blue-50/50 via-zinc-50 to-zinc-100 p-4 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/95 sm:p-8">
          {/* Header Icon */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
              <Lock className="h-8 w-8" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                  ✓
                </span>
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              StockPulse
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ระบบจัดการสต็อกและต้นทุนสินค้า FIFO
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300">
              <ShieldCheck className="h-3 w-3" />
              <span>พื้นที่เฉพาะทีมงาน (Team Protected)</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                รหัสผ่านทีม (Team Passcode)
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(null);
                  }}
                  placeholder="กรอกรหัสทีม..."
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 pr-10 text-center text-lg font-bold tracking-widest text-zinc-900 shadow-2xs transition-all duration-150 hover:border-zinc-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Remember Checkbox */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>จดจำอุปกรณ์นี้ 30 วัน</span>
              </label>
              <span className="text-[11px] text-zinc-400">ปลอดภัย</span>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <Unlock className="h-4 w-4" />
              <span>เข้าใช้งานระบบ</span>
            </button>
          </form>

          {/* Quick Keypad for Mobile PIN Entry */}
          <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="mb-2 text-center text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              กดรหัสตัวเลขด่วน
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === "C") setPasscode("");
                    else if (key === "←") handleBackspace();
                    else handleKeypadPress(key);
                  }}
                  className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 text-sm font-bold text-zinc-800 transition active:scale-95 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
          StockPulse © 2026 • Private Inventory Platform
        </p>
      </div>
    </div>
  );
};
