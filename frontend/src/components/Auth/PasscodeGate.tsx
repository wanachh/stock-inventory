"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Eye, EyeOff, Clock, ShieldCheck } from "lucide-react";

interface PasscodeGateProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // 30 days lifetime
      const sessionData = {
        token: EXPECTED_PASSCODE,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      } catch {
        // Ignore storage errors
      }
      setIsAuthenticated(true);
    } else {
      setError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      setPasscode("");
    }
  };

  // Loading state while checking localStorage
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
          <p className="text-xs text-zinc-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  // Already authenticated: render app
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Locked: MetaMask-Style Unlock Screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] p-4 text-zinc-900 select-none dark:bg-zinc-950 dark:text-zinc-100">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Top Network Pill (MetaMask style) */}
        <div className="mb-6 flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-3.5 py-1 text-xs font-medium text-zinc-600 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>StockPulse Core System</span>
        </div>

        {/* 3D Low-Poly Fox Mascot SVG (MetaMask style) */}
        <div className="relative mb-4 flex items-center justify-center transition-transform duration-300 hover:scale-105">
          <svg
            viewBox="0 0 240 220"
            className="h-36 w-36 drop-shadow-xl sm:h-44 sm:w-44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left Ear Outer */}
            <polygon points="60,20 25,75 85,75" fill="#e2761b" />
            <polygon points="60,20 25,75 40,55" fill="#763d16" />
            {/* Left Ear Inner */}
            <polygon points="60,20 85,75 120,45" fill="#cd6116" />

            {/* Right Ear Outer */}
            <polygon points="180,20 215,75 155,75" fill="#fa9e42" />
            <polygon points="180,20 215,75 200,55" fill="#763d16" />
            {/* Right Ear Inner */}
            <polygon points="180,20 155,75 120,45" fill="#e2761b" />

            {/* Forehead & Brow */}
            <polygon points="120,45 85,75 120,80 155,75" fill="#f6851b" />
            <polygon points="120,80 85,110 120,115 155,110" fill="#e4761b" />
            <polygon points="85,75 40,115 85,110" fill="#cd6116" />
            <polygon points="155,75 200,115 155,110" fill="#f6851b" />

            {/* Cheeks */}
            <polygon points="40,115 85,110 75,130 45,155" fill="#e2761b" />
            <polygon points="200,115 155,110 165,130 195,155" fill="#fa9e42" />
            <polygon points="45,155 75,130 65,180" fill="#cd6116" />
            <polygon points="195,155 165,130 175,180" fill="#f6851b" />

            {/* Eyes */}
            <polygon points="75,130 105,130 90,142" fill="#18181b" />
            <polygon points="165,130 135,130 150,142" fill="#18181b" />

            {/* Snout Bridge & Cheeks Upper */}
            <polygon points="120,115 105,130 120,145 135,130" fill="#f6851b" />
            <polygon points="105,130 90,142 105,165 120,145" fill="#e2761b" />
            <polygon points="135,130 150,142 135,165 120,145" fill="#fa9e42" />

            {/* Snout Lower & Chin */}
            <polygon points="120,145 105,165 112,185 128,185 135,165" fill="#e4761b" />
            <polygon points="105,165 65,180 95,190 112,185" fill="#b8520e" />
            <polygon points="135,165 175,180 145,190 128,185" fill="#cd6116" />

            {/* Black Nose */}
            <polygon points="112,185 128,185 124,195 116,195" fill="#18181b" />
            <polygon points="116,195 124,195 120,198" fill="#09090b" />
          </svg>
        </div>

        {/* Title: All-caps with tracking (MetaMask style) */}
        <h1 className="mb-6 text-2xl font-black tracking-[0.22em] text-zinc-800 uppercase dark:text-zinc-100 sm:text-3xl">
          STOCKPULSE
        </h1>

        {/* Form: Exactly 1 input box & UNLOCK button */}
        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(null);
              }}
              placeholder="••••••••••••"
              autoFocus
              className="w-full rounded-xl border border-zinc-300 bg-white py-3.5 px-4 pr-11 text-center text-lg font-bold tracking-widest text-zinc-900 shadow-2xs transition hover:border-zinc-400 focus:border-[#f6851b] focus:outline-hidden focus:ring-4 focus:ring-[#f6851b]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-[#f6851b] dark:focus:ring-[#f6851b]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* UNLOCK Button (MetaMask style) */}
          <button
            type="submit"
            disabled={!passcode.trim()}
            className="w-full rounded-xl bg-[#f6851b] py-3.5 text-sm font-extrabold tracking-widest text-white uppercase shadow-md shadow-orange-500/25 transition duration-150 hover:bg-[#e2761b] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            UNLOCK
          </button>
        </form>

        {/* 30 Days Lifetime Description (as requested) */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-[#f6851b]" />
          <span>
            จดจำอุปกรณ์นี้เป็นเวลา <strong className="text-zinc-700 dark:text-zinc-200">30 วัน</strong> (30-day session lifetime)
          </span>
        </div>

        {/* Footer info */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Team Private Access • ปลอดภัยด้วยการเข้ารหัสข้อมูล</span>
        </div>
      </div>
    </div>
  );
};

