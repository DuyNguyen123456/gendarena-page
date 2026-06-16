import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import { Analytics } from "@vercel/analytics/next"
import { Orbitron, Inter } from "next/font/google"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "GenD Arena 2026 - Đấu Trường Khởi Nghiệp Công Nghệ",
  description: "Cuộc thi khởi nghiệp sáng tạo robot, AI và công nghệ hàng đầu năm 2026",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={`${orbitron.variable} ${inter.variable}`} style={{ margin: 0 }}>
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  )
}