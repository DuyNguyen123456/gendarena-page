import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "GenD Arena 2026",
  description: "Cuộc thi khởi nghiệp sáng tạo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  )
}