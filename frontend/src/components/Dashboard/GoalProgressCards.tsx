"use client";

import React from "react";
import { MoreHorizontal } from "lucide-react";

export const GoalProgressCards: React.FC = () => {
  const goals = [
    {
      id: 1,
      title: "เป้าหมายสต็อกปลอดภัย (Safety Stock)",
      subtitle: "ความพร้อมส่งมอบคำสั่งซื้อ",
      percent: 80,
      ringColor: "#2563eb",
      bgColor: "bg-blue-50/70 dark:bg-blue-950/30",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      id: 2,
      title: "การระบายสต็อกล็อตเก่า ( Turnover)",
      subtitle: "อัตราการตัดสต็อกตามลำดับ ",
      percent: 70,
      ringColor: "#f43f5e",
      bgColor: "bg-rose-50/70 dark:bg-rose-950/30",
      textColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            เป้าหมายคลัง (Goals)
          </h3>
          <p className="text-xs text-slate-400">ตัวชี้วัดประสิทธิภาพสต็อกสินค้า</p>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Goal Cards */}
      <div className="my-3 space-y-3">
        {goals.map((goal) => {
          const radius = 18;
          const circ = 2 * Math.PI * radius;
          const offset = circ - (goal.percent / 100) * circ;

          return (
            <div
              key={goal.id}
              className={`flex items-center justify-between rounded-2xl p-4 transition-all hover:scale-[1.01] ${goal.bgColor}`}
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {goal.title}
                </h4>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                  {goal.subtitle}
                </p>
              </div>

              {/* Progress Ring */}
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <svg className="h-12 w-12 -rotate-90 transform" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    stroke={goal.ringColor}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute text-[10px] font-black ${goal.textColor}`}>
                  {goal.percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-slate-400">
        เกณฑ์มาตรฐานคำนวณตามบัญชี  และเวลาหมุนเวียนรอบสินค้า
      </p>
    </div>
  );
};
