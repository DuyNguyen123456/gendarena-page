import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, Eye, Server, FileText, Mail, AlertTriangle, ArrowLeft } from 'lucide-react'
import Footer from '@/components/footer'
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
    <div className="min-h-screen bg-[#050814] text-slate-200 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#112E81]/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">

        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-orbitron font-bold tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Trang chủ</span>
        </Link>

        {/* Header */}
        <div className="tech-panel-glow p-8 mb-10 rounded-2xl cyber-corners border-cyan-500/30 shadow-[0_0_30px_rgba(0,240,255,0.08)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Chính Sách Bảo Mật Dữ Liệu
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white mb-3">
            CHÍNH SÁCH BẢO MẬT
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            Quy định về thu thập, sử dụng, lưu trữ và bảo mật dữ liệu thông tin cá nhân dành cho thí sinh, giám khảo và người dùng tham gia hệ thống GenD Arena 2026.
          </p>
          <div className="mt-4 pt-4 border-t border-[#1e2d5a] flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Ngày cập nhật cuối: 14/08/2026</span>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-8">

          {/* Section 1: Giới thiệu */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>1. Giới Thiệu</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Cuộc thi khởi nghiệp công nghệ <strong className="text-white">GenD Arena 2026</strong> được đồng tổ chức bởi <strong className="text-white">{siteConfig.organizers.sse.name}</strong> và <strong className="text-white">{siteConfig.organizers.fic.name}</strong>. Chúng tôi cam kết tôn trọng và bảo vệ quyền riêng tư, cũng như sự an toàn của tất cả dữ liệu cá nhân mà người dùng cung cấp khi đăng ký, truy cập và sử dụng hệ thống trực tuyến của cuộc thi.
            </p>
          </section>

          {/* Section 2: Dữ liệu thu thập */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              <span>2. Dữ Liệu Thu Thập</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              Để đảm bảo quá trình đăng ký, thi đấu và vận hành diễn ra minh bạch, hệ thống GenD Arena 2026 thu thập các loại dữ liệu sau:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm leading-relaxed pl-2">
              <li><strong className="text-slate-100">Thông tin tài khoản cá nhân:</strong> Họ và tên, địa chỉ email, số điện thoại, đơn vị / trường học.</li>
              <li><strong className="text-slate-100">Thông tin đội thi & dự án:</strong> Tên đội, danh sách thành viên, ý tưởng, tóm tắt giải pháp công nghệ.</li>
              <li><strong className="text-slate-100">Bài nộp dự thi (Submissions):</strong> Các tài liệu thuyết trình (pitch deck), đường dẫn liên kết sản phẩm, video giới thiệu và các tập tin liên quan.</li>
              <li><strong className="text-slate-100">Dữ liệu chấm điểm (dành cho Ban Giám Khảo):</strong> Điểm số đánh giá, nhận xét chuyên môn và thông tin hồ sơ giám khảo.</li>
              <li><strong className="text-slate-100">Dữ liệu kỹ thuật & Cookies:</strong> Địa chỉ IP, loại trình duyệt, nhật ký truy cập và cookies đo lường từ Google Analytics.</li>
            </ul>
          </section>

          {/* Section 3: Mục đích sử dụng */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              <span>3. Mục Đích Sử Dụng Dữ Liệu</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="bg-[#0a1025] p-4 rounded-lg border border-[#1e2d5a]">
                <h3 className="font-bold text-white mb-1">Vận hành cuộc thi</h3>
                <p className="text-xs text-slate-400">Xác thực tư cách thí sinh, quản lý hồ sơ đội thi, tạo điều kiện thuận lợi cho việc nộp bài và tổ chức các vòng thi.</p>
              </div>
              <div className="bg-[#0a1025] p-4 rounded-lg border border-[#1e2d5a]">
                <h3 className="font-bold text-white mb-1">Đánh giá & Chấm điểm</h3>
                <p className="text-xs text-slate-400">Cung cấp hồ sơ dự án cho Hội đồng Ban Giám khảo để tiến hành thẩm định và công bố kết quả.</p>
              </div>
              <div className="bg-[#0a1025] p-4 rounded-lg border border-[#1e2d5a]">
                <h3 className="font-bold text-white mb-1">Thông báo & Liên hệ</h3>
                <p className="text-xs text-slate-400">Gửi email kích hoạt tài khoản, thông báo lịch trình, kết quả các vòng thi và cập nhật quan trọng từ Ban Tổ chức.</p>
              </div>
              <div className="bg-[#0a1025] p-4 rounded-lg border border-[#1e2d5a]">
                <h3 className="font-bold text-white mb-1">Cải thiện trải nghiệm</h3>
                <p className="text-xs text-slate-400">Đo lường lưu lượng truy cập và tối ưu hiệu năng website thông qua dữ liệu thống kê vô danh.</p>
              </div>
            </div>
          </section>

          {/* Section 4: Chia sẻ với bên thứ ba */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              <span>4. Chia Sẻ Dữ Liệu Với Bên Thứ Ba</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Chúng tôi cam kết không bán hoặc chia sẻ thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại. Dữ liệu chỉ được xử lý thông qua các hạ tầng dịch vụ công nghệ tin cậy:
            </p>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="p-3.5 bg-[#0a1025] rounded-lg border border-[#1e2d5a]">
                <strong className="text-cyan-400 font-orbitron">Supabase:</strong> Quản lý cơ sở dữ liệu và hệ thống xác thực người dùng (Auth & Database Cloud) tuân thủ tiêu chuẩn an toàn dữ liệu quốc tế.
              </div>
              <div className="p-3.5 bg-[#0a1025] rounded-lg border border-[#1e2d5a]">
                <strong className="text-cyan-400 font-orbitron">Google Gemini:</strong> Cung cấp năng lực trợ lý hỏi đáp tự động (FAQ Chatbot). Hệ thống không gửi hay lưu trữ lịch sử dữ liệu cá nhân nhạy cảm của người dùng lên các mô hình AI bên ngoài.
              </div>
              <div className="p-3.5 bg-[#0a1025] rounded-lg border border-[#1e2d5a]">
                <strong className="text-cyan-400 font-orbitron">Google Analytics:</strong> Thu thập các chỉ số thống kê truy cập vô danh để phân tích hiệu năng và cải thiện trải nghiệm giao diện người dùng.
              </div>
              <div className="p-3.5 bg-[#0a1025] rounded-lg border border-[#1e2d5a]">
                <strong className="text-cyan-400 font-orbitron">Brevo (Sendinblue):</strong> Hạ tầng gửi email giao dịch để chuyển tới người dùng email xác thực tài khoản và khôi phục mật khẩu.
              </div>
            </div>
          </section>

          {/* Section 5: Quyền người dùng */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>5. Quyền Của Người Dùng</span>
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm leading-relaxed pl-2">
              <li><strong className="text-white">Quyền truy cập & Xem dữ liệu:</strong> Thí sinh có quyền xem thông tin cá nhân và hồ sơ đội thi trong trang Hồ sơ / Dashboard.</li>
              <li><strong className="text-white">Quyền chỉnh sửa:</strong> Thí sinh có thể chủ động cập nhật thông tin cá nhân và hồ sơ đội thi trong thời gian mở cổng đăng ký quy định.</li>
              <li><strong className="text-white">Quyền xóa dữ liệu:</strong> Thí sinh có thể gửi yêu cầu hủy tài khoản hoặc xóa dữ liệu dự thi bằng cách liên hệ trực tiếp với Ban Tổ chức qua email chính thức.</li>
            </ul>
          </section>

          {/* Section 6: Bảo mật dữ liệu */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              <span>6. Bảo Mật Dữ Liệu</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Mọi dữ liệu truyền tải giữa trình duyệt của bạn và máy chủ GenD Arena đều được mã hóa chuẩn <strong className="text-white">SSL/TLS (HTTPS)</strong>. Cơ sở dữ liệu Supabase áp dụng cơ chế phân quyền <strong className="text-white">Row Level Security (RLS)</strong> nghiêm ngặt, đảm bảo chỉ có người dùng hợp lệ hoặc Ban Tổ chức được phân quyền mới có thể truy vấn thông tin tương ứng.
            </p>
          </section>

          {/* Section 7: Thời gian lưu trữ */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              <span>7. Thời Gian Lưu Trữ Dữ Liệu</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              BTC GenD Arena 2026 cam kết lưu trữ dữ liệu người dùng theo các thời hạn sau:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm leading-relaxed pl-2 mb-3">
              <li><strong className="text-white">Dữ liệu tài khoản và đội thi</strong> (email, họ tên, thông tin đội, bài nộp): lưu trữ tối đa <strong className="text-cyan-400">12 tháng</strong> kể từ ngày cuộc thi kết thúc, sau đó sẽ được xóa hoặc ẩn danh hóa.</li>
              <li><strong className="text-white">Dữ liệu tài chính và pháp lý</strong> (nếu có): lưu trữ <strong className="text-cyan-400">5 năm</strong> theo quy định của pháp luật Việt Nam về kế toán và thuế.</li>
              <li><strong className="text-white">Bài nộp đoạt giải và thông tin công khai</strong>: có thể được lưu trữ lâu dài cho mục đích truyền thông, lưu trữ lịch sử cuộc thi và giới thiệu cho các mùa sau.</li>
            </ul>
            <p className="text-slate-300 text-sm leading-relaxed">
              Người dùng có quyền yêu cầu xóa dữ liệu sớm hơn theo quy định tại Mục 5.
            </p>
          </section>

          {/* Section 8: Liên hệ */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              <span>8. Thông Tin Liên Hệ Ban Tổ Chức</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc yêu cầu nào liên quan đến Chính sách bảo mật này, vui lòng liên hệ BTC qua:
            </p>
            <div className="p-4 bg-[#0a1025] rounded-lg border border-[#1e2d5a] text-sm text-slate-300">
              <p>📧 <strong className="text-white">Email:</strong> <a href={`mailto:${siteConfig.contact.email}`} className="text-cyan-400 underline font-semibold ml-1">{siteConfig.contact.email}</a></p>
            </div>
          </section>

          {/* Section 9: Ngày cập nhật cuối */}
          <section className="tech-panel p-6 rounded-xl border-[#1e2d5a] relative">
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>9. Điều Khoản Thay Đổi & Cập Nhật</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Ban Tổ chức có quyền cập nhật và điều chỉnh nội dung Chính sách bảo mật này bất kỳ lúc nào để phù hợp với quy định pháp luật hoặc thực tiễn vận hành. Mọi thay đổi sẽ được công bố công khai trên trang này cùng mốc thời gian cập nhật tương ứng.
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  )
}
