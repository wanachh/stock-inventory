import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockPulse - ระบบจัดการสต็อกและต้นทุนสินค้า (FIFO Real-Cost)",
  description: "ระบบบริหารคลังสินค้าและคำนวณต้นทุนจริงรายรอบ (First-In, First-Out) ตามมาตรฐานบัญชี",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full bg-zinc-50/50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
