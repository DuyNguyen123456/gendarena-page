import Link from 'next/link'
import { siteConfig } from '@/config/site'
import Image from 'next/image'
import { Mail, MapPin } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-surface-raised border-t border-surface-border transition-colors duration-[250ms]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand column */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <Image
                src="/logo/gendarena-logo.png"
                alt="Logo GenD Arena 2026"
                width={32}
                height={32}
                className="object-contain shrink-0"
              />
              <span className="font-display text-lg font-bold tracking-wider text-text-primary">
                {siteConfig.name.toUpperCase()}
              </span>
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed line-clamp-3">
              {siteConfig.description}
            </p>
            <p className="text-text-tertiary text-xs tracking-wider uppercase font-medium">
              {siteConfig.tagline}
            </p>
          </div>

          {/* Cuộc thi */}
          <div>
            <h4 className="font-display text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Cuộc Thi
            </h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li>
                <Link href="/register" className="hover:text-brand-cyan transition-colors">
                  Đăng ký tham dự
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-brand-cyan transition-colors">
                  Bảng điều khiển
                </Link>
              </li>
              <li>
                <Link href="/submissions" className="hover:text-brand-cyan transition-colors">
                  Nộp bài dự thi
                </Link>
              </li>
              <li>
                <Link href="/organizers" className="hover:text-brand-cyan transition-colors">
                  Ban tổ chức
                </Link>
              </li>
            </ul>
          </div>

          {/* Tài nguyên */}
          <div>
            <h4 className="font-display text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Tài Nguyên
            </h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li>
                <a
                  href={siteConfig.resources.registrationGuide}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-cyan transition-colors"
                >
                  Hướng dẫn đăng ký
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.resources.scoringCriteria}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-cyan transition-colors"
                >
                  Tiêu chí chấm điểm
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.resources.reportTemplate}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-cyan transition-colors"
                >
                  Template báo cáo
                </a>
              </li>
              <li>
                <Link href="/organizers" className="hover:text-brand-cyan transition-colors">
                  FAQ (Ban tổ chức)
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-brand-cyan transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h4 className="font-display text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Liên Hệ
            </h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2.5">
                <Mail className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-brand-cyan transition-colors break-all">
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                <span>{siteConfig.contact.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-surface-border mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-text-tertiary text-xs">
            © {year} {siteConfig.name}. Bản quyền thuộc về GenD Arena.
          </p>
          <Link
            href="/privacy-policy"
            className="text-text-tertiary hover:text-brand-cyan text-xs transition-colors"
          >
            Chính sách bảo mật
          </Link>
        </div>
      </div>
    </footer>
  )
}
