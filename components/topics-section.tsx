'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import CursorCardGlow from '@/components/motion/cursor-card-glow'
import {
  GraduationCap,
  HeartPulse,
  TrendingUp,
  Truck,
  Leaf,
} from 'lucide-react'

export interface TopicItem {
  id: string
  number: string
  title: string
  tag: string
  description: string
  icon: React.ReactNode
}

export const TOPICS_DATA: TopicItem[] = [
  {
    id: 'giao-duc',
    number: '01',
    title: 'Giáo dục',
    tag: 'EdTech',
    description:
      'Chuyển đổi số trong giáo dục và đào tạo, nền tảng học tập thông minh cá nhân hóa bằng AI và phát triển kỹ năng số.',
    icon: <GraduationCap className="size-5 sm:size-5.5 text-brand-cyan" />,
  },
  {
    id: 'y-te-suc-khoe',
    number: '02',
    title: 'Y tế và Sức khỏe',
    tag: 'HealthTech',
    description:
      'Ứng dụng công nghệ nâng cao chất lượng y tế, chăm sóc sức khỏe chủ động, kết nối Telehealth và số hóa dữ liệu y khoa.',
    icon: <HeartPulse className="size-5 sm:size-5.5 text-rose-400" />,
  },
  {
    id: 'kinh-doanh-tai-chinh',
    number: '03',
    title: 'Kinh doanh, Thương mại và Tài chính',
    tag: 'FinTech',
    description:
      'Giải pháp tài chính số, quản lý dòng tiền cá nhân & doanh nghiệp, tối ưu thương mại điện tử và nền tảng kinh doanh thông minh.',
    icon: <TrendingUp className="size-5 sm:size-5.5 text-amber-400" />,
  },
  {
    id: 'logistics-chuoi-cung-ung',
    number: '04',
    title: 'Logistics và Chuỗi cung ứng',
    tag: 'Logistics',
    description:
      'Tối ưu hóa tuyến đường vận tải, tự động hóa kho bãi, theo dõi đơn hàng thời gian thực và quản trị chuỗi cung ứng.',
    icon: <Truck className="size-5 sm:size-5.5 text-emerald-400" />,
  },
  {
    id: 'xa-hoi-moi-truong',
    number: '05',
    title: 'Xã hội và Môi trường',
    tag: 'GreenTech',
    description:
      'Công nghệ xanh giảm phát thải, xử lý môi trường, năng lượng tái tạo, phát triển bền vững (ESG) và các dự án vì cộng đồng.',
    icon: <Leaf className="size-5 sm:size-5.5 text-lime-400" />,
  },
]

export default function TopicsSection() {
  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60 overflow-hidden">
      {/* Subtle background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-brand-cyan/4 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12 md:mb-14">
          <Badge variant="brand" size="md" className="mb-3">
            LĨNH VỰC DỰ THI
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-3">
            5 Lĩnh Vực Đột Phá Tại GenD Arena
          </h2>
          <p className="text-text-secondary text-sm md:text-base max-w-2xl leading-relaxed">
            Thí sinh tự do lựa chọn 1 trong 5 nhóm chủ đề công nghệ mũi nhọn để phát triển đề án khởi nghiệp giải quyết bài toán thị trường thực tế.
          </p>
        </div>

        {/* 5 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-4.5">
          {TOPICS_DATA.map((topic) => (
            <Card
              key={topic.id}
              interactive
              className="card-hover-glow flex flex-col justify-start h-full relative overflow-hidden group transition-all duration-300 p-5 bg-surface-raised/80 hover:bg-surface-raised border-surface-border hover:border-brand-cyan/40"
            >
              <CursorCardGlow />

              <CardHeader className="relative z-10 p-0 pb-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {/* Icon */}
                  <div className="size-10 rounded-xl bg-surface-overlay border border-surface-border group-hover:border-brand-cyan/40 group-hover:scale-105 flex items-center justify-center transition-all duration-300 shadow-sm shrink-0">
                    {topic.icon}
                  </div>

                  {/* Track Number */}
                  <span className="font-mono text-xs font-bold text-text-tertiary group-hover:text-brand-cyan transition-colors">
                    {topic.number}
                  </span>
                </div>

                <CardTitle className="text-base font-semibold text-text-primary group-hover:text-brand-cyan transition-colors leading-snug">
                  {topic.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative z-10 p-0 pt-0">
                <p className="text-text-secondary text-xs sm:text-[13px] leading-relaxed">
                  {topic.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
