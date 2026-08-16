import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, Eye, Server, FileText, Mail, ArrowLeft } from 'lucide-react'
import Footer from '@/components/footer'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật thông tin và dữ liệu cá nhân người dùng tham gia cuộc thi khởi nghiệp công nghệ GenD Arena 2026.',
  openGraph: {
    title: 'Chính sách bảo mật | GenD Arena 2026',
    description: 'Chính sách bảo mật thông tin và dữ liệu cá nhân người dùng tham gia cuộc thi khởi nghiệp công nghệ GenD Arena 2026.',
  },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary relative overflow-hidden font-body">
      {/* Background ambient decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/3 right-10 w-[350px] h-[350px] bg-brand-blue/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-cyan hover:text-brand-cyan-bright transition-colors uppercase mb-8"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại Trang chủ</span>
        </Link>

        {/* Header */}
        <Card className="p-6 sm:p-8 mb-8 shadow-elevation-2 bg-surface-overlay border-surface-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-bold text-brand-cyan uppercase tracking-wider mb-4">
            <ShieldCheck className="size-4 text-brand-cyan" />
            Chính Sách Bảo Mật Dữ Liệu
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-3">
            CHÍNH SÁCH BẢO MẬT
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed max-w-2xl">
            Quy định về thu thập, sử dụng, lưu trữ và bảo mật dữ liệu thông tin cá nhân dành cho thí sinh, giám khảo và người dùng tham gia hệ thống GenD Arena 2026.
          </p>
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center gap-2 text-xs text-text-tertiary font-mono">
            <span>Ngày cập nhật cuối: 14/08/2026</span>
          </div>
        </Card>

        {/* Policy Content Sections */}
        <div className="space-y-6">
          {/* Section 1: Giới thiệu */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <FileText className="size-5 text-brand-cyan shrink-0" />
              <span>1. Giới Thiệu</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Cuộc thi khởi nghiệp công nghệ <strong className="text-text-primary font-medium">GenD Arena 2026</strong> được đồng tổ chức bởi <strong className="text-text-primary font-medium">{siteConfig.organizers.sse.name}</strong> và <strong className="text-text-primary font-medium">{siteConfig.organizers.fic.name}</strong>. Chúng tôi cam kết tôn trọng và bảo vệ quyền riêng tư, cũng như sự an toàn của tất cả dữ liệu cá nhân mà người dùng cung cấp khi đăng ký, truy cập và sử dụng hệ thống trực tuyến của cuộc thi.
            </p>
          </Card>

          {/* Section 2: Dữ liệu thu thập */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Server className="size-5 text-brand-cyan shrink-0" />
              <span>2. Dữ Liệu Thu Thập</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-3">
              Để đảm bảo quá trình đăng ký, thi đấu và vận hành diễn ra minh bạch, hệ thống GenD Arena 2026 thu thập các loại dữ liệu sau:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary text-sm leading-relaxed pl-2">
              <li><strong className="text-text-primary font-medium">Thông tin tài khoản cá nhân:</strong> Họ và tên, địa chỉ email, số điện thoại, đơn vị / trường học.</li>
              <li><strong className="text-text-primary font-medium">Thông tin đội thi & dự án:</strong> Tên đội, danh sách thành viên, ý tưởng, tóm tắt giải pháp công nghệ.</li>
              <li><strong className="text-text-primary font-medium">Bài nộp dự thi (Submissions):</strong> Các tài liệu thuyết trình (pitch deck), đường dẫn liên kết sản phẩm, video giới thiệu và các tập tin liên quan.</li>
              <li><strong className="text-text-primary font-medium">Dữ liệu chấm điểm (dành cho Ban Giám Khảo):</strong> Điểm số đánh giá, nhận xét chuyên môn và thông tin hồ sơ giám khảo.</li>
              <li><strong className="text-text-primary font-medium">Dữ liệu kỹ thuật & Cookies:</strong> Địa chỉ IP, loại trình duyệt, nhật ký truy cập và cookies đo lường từ Google Analytics.</li>
            </ul>
          </Card>

          {/* Section 3: Mục đích sử dụng */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Eye className="size-5 text-brand-cyan shrink-0" />
              <span>3. Mục Đích Sử Dụng Dữ Liệu</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
              <div className="bg-surface-raised p-4 rounded-lg border border-surface-border">
                <h3 className="font-semibold text-text-primary mb-1 text-sm">Vận hành cuộc thi</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">Xác thực tư cách thí sinh, quản lý hồ sơ đội thi, tạo điều kiện thuận lợi cho việc nộp bài và tổ chức các vòng thi.</p>
              </div>
              <div className="bg-surface-raised p-4 rounded-lg border border-surface-border">
                <h3 className="font-semibold text-text-primary mb-1 text-sm">Đánh giá & Chấm điểm</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">Cung cấp hồ sơ dự án cho Hội đồng Ban Giám khảo để tiến hành thẩm định và công bố kết quả.</p>
              </div>
              <div className="bg-surface-raised p-4 rounded-lg border border-surface-border">
                <h3 className="font-semibold text-text-primary mb-1 text-sm">Thông báo & Liên hệ</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">Gửi email kích hoạt tài khoản, thông báo lịch trình, kết quả các vòng thi và cập nhật quan trọng từ Ban Tổ chức.</p>
              </div>
              <div className="bg-surface-raised p-4 rounded-lg border border-surface-border">
                <h3 className="font-semibold text-text-primary mb-1 text-sm">Cải thiện trải nghiệm</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">Đo lường lưu lượng truy cập và tối ưu hiệu năng website thông qua dữ liệu thống kê vô danh.</p>
              </div>
            </div>
          </Card>

          {/* Section 4: Chia sẻ với bên thứ ba */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Lock className="size-5 text-brand-cyan shrink-0" />
              <span>4. Chia Sẻ Dữ Liệu Với Bên Thứ Ba</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              Chúng tôi cam kết không bán hoặc chia sẻ thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại. Dữ liệu chỉ được xử lý thông qua các hạ tầng dịch vụ công nghệ tin cậy:
            </p>
            <div className="space-y-3 text-xs sm:text-sm text-text-secondary">
              <div className="p-3.5 bg-surface-raised rounded-lg border border-surface-border">
                <strong className="text-brand-cyan font-medium">Supabase:</strong> Quản lý cơ sở dữ liệu và hệ thống xác thực người dùng (Auth & Database Cloud) tuân thủ tiêu chuẩn an toàn dữ liệu quốc tế.
              </div>
              <div className="p-3.5 bg-surface-raised rounded-lg border border-surface-border">
                <strong className="text-brand-cyan font-medium">Google Analytics:</strong> Thu thập các chỉ số thống kê truy cập vô danh để phân tích hiệu năng và cải thiện trải nghiệm giao diện người dùng.
              </div>
              <div className="p-3.5 bg-surface-raised rounded-lg border border-surface-border">
                <strong className="text-brand-cyan font-medium">Brevo (Sendinblue):</strong> Hạ tầng gửi email giao dịch để chuyển tới người dùng email xác thực tài khoản và khôi phục mật khẩu.
              </div>
            </div>
          </Card>

          {/* Section 5: Quyền người dùng */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand-cyan shrink-0" />
              <span>5. Quyền Của Người Dùng</span>
            </h2>
            <ul className="list-disc list-inside space-y-2 text-text-secondary text-sm leading-relaxed pl-2">
              <li><strong className="text-text-primary font-medium">Quyền truy cập & Xem dữ liệu:</strong> Thí sinh có quyền xem thông tin cá nhân và hồ sơ đội thi trong trang Hồ sơ / Dashboard.</li>
              <li><strong className="text-text-primary font-medium">Quyền chỉnh sửa:</strong> Thí sinh có thể chủ động cập nhật thông tin cá nhân và hồ sơ đội thi trong thời gian mở cổng đăng ký quy định.</li>
              <li><strong className="text-text-primary font-medium">Quyền xóa dữ liệu:</strong> Thí sinh có thể gửi yêu cầu hủy tài khoản hoặc xóa dữ liệu dự thi bằng cách liên hệ trực tiếp với Ban Tổ chức qua email chính thức.</li>
            </ul>
          </Card>

          {/* Section 6: Bảo mật dữ liệu */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Lock className="size-5 text-brand-cyan shrink-0" />
              <span>6. Bảo Mật Dữ Liệu</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Mọi dữ liệu truyền tải giữa trình duyệt của bạn và máy chủ GenD Arena đều được mã hóa chuẩn <strong className="text-text-primary font-medium">SSL/TLS (HTTPS)</strong>. Cơ sở dữ liệu Supabase áp dụng cơ chế phân quyền <strong className="text-text-primary font-medium">Row Level Security (RLS)</strong> nghiêm ngặt, đảm bảo chỉ có người dùng hợp lệ hoặc Ban Tổ chức được phân quyền mới có thể truy vấn thông tin tương ứng.
            </p>
          </Card>

          {/* Section 7: Thời gian lưu trữ */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Server className="size-5 text-brand-cyan shrink-0" />
              <span>7. Thời Gian Lưu Trữ Dữ Liệu</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-3">
              BTC GenD Arena 2026 cam kết lưu trữ dữ liệu người dùng theo các thời hạn sau:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary text-sm leading-relaxed pl-2 mb-3">
              <li><strong className="text-text-primary font-medium">Dữ liệu tài khoản và đội thi</strong> (email, họ tên, thông tin đội, bài nộp): lưu trữ tối đa <strong className="text-brand-cyan font-medium">12 tháng</strong> kể từ ngày cuộc thi kết thúc, sau đó sẽ được xóa hoặc ẩn danh hóa.</li>
              <li><strong className="text-text-primary font-medium">Dữ liệu tài chính và pháp lý</strong> (nếu có): lưu trữ <strong className="text-brand-cyan font-medium">5 năm</strong> theo quy định của pháp luật Việt Nam về kế toán và thuế.</li>
              <li><strong className="text-text-primary font-medium">Bài nộp đoạt giải và thông tin công khai</strong>: có thể được lưu trữ lâu dài cho mục đích truyền thông, lưu trữ lịch sử cuộc thi và giới thiệu cho các mùa sau.</li>
            </ul>
            <p className="text-text-secondary text-sm leading-relaxed">
              Người dùng có quyền yêu cầu xóa dữ liệu sớm hơn theo quy định tại Mục 5.
            </p>
          </Card>

          {/* Section 8: Liên hệ */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Mail className="size-5 text-brand-cyan shrink-0" />
              <span>8. Thông Tin Liên Hệ Ban Tổ Chức</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc yêu cầu nào liên quan đến Chính sách bảo mật này, vui lòng liên hệ BTC qua:
            </p>
            <div className="p-4 bg-surface-raised rounded-lg border border-surface-border text-sm text-text-secondary">
              <p>📧 <strong className="text-text-primary font-medium">Email:</strong> <a href={`mailto:${siteConfig.contact.email}`} className="text-brand-cyan underline font-medium ml-1">{siteConfig.contact.email}</a></p>
            </div>
          </Card>

          {/* Section 9: Điều khoản thay đổi */}
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <FileText className="size-5 text-brand-cyan shrink-0" />
              <span>9. Điều Khoản Thay Đổi & Cập Nhật</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Ban Tổ chức có quyền cập nhật và điều chỉnh nội dung Chính sách bảo mật này bất kỳ lúc nào để phù hợp với quy định pháp luật hoặc thực tiễn vận hành. Mọi thay đổi sẽ được công bố công khai trên trang này cùng mốc thời gian cập nhật tương ứng.
            </p>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}
