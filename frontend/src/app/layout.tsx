import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/Theme/ThemeContext";

export const metadata: Metadata = {
  title: "StockPulse - ระบบจัดการสต็อกและต้นทุนสินค้า ( Real-Cost)",
  description: "ระบบบริหารคลังสินค้าและคำนวณต้นทุนจริงรายรอบ (First-In, First-Out) ตามมาตรฐานบัญชี",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-[#f4f6fa] font-sans text-slate-900 antialiased dark:bg-[#0b0f19] dark:text-slate-50 transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

