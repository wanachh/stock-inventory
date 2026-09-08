"use client";

import React, { useEffect, useState } from "react";
import { Users, Eye, Activity } from "lucide-react";
import { api, formatNumber } from "../../lib/api";
import { VisitorStats } from "../../types";

export const VisitorBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [stats, setStats] = useState<VisitorStats | null>(null);

  useEffect(() => {
    // Record visit on mount
    api.recordVisit().then(setStats).catch(() => {});

    // Polling active stats every 30s
    const interval = setInterval(() => {
      api.getVisitorStats().then(setStats).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1 text-[11px] font-medium text-zinc-600 backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          </span>
          <span>{stats.activeNow} ออนไลน์</span>
        </span>
        <span className="text-zinc-300 dark:text-zinc-700">•</span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-zinc-400" />
          <span>{formatNumber(stats.totalVisits)} ครั้ง</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/80 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-purple-50/40 p-3 shadow-xs dark:border-zinc-800/80 dark:from-zinc-900/60 dark:via-zinc-900/40 dark:to-zinc-900/20">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-zinc-500 uppercase dark:text-zinc-400">
            สถิติผู้เข้าชมเว็บไซต์ (Visitor Live Counter)
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>กำลังออนไลน์: {stats.activeNow} คน</span>
            </span>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span>วันนี้: {formatNumber(stats.todayVisits)} คน</span>
            </span>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <Eye className="h-3.5 w-3.5 text-blue-500" />
              <span>ยอดดูสะสม: {formatNumber(stats.totalVisits)} ครั้ง</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
