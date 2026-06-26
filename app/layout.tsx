import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import { Analytics } from "@vercel/analytics/next"
import { Be_Vietnam_Pro, Inter, JetBrains_Mono } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
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
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ margin: 0 }}>
        <NextTopLoader
          color="#00F0FF"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #00F0FF, 0 0 5px #00F0FF"
          zIndex={1600}
        />
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  )
}