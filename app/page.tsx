import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>

      <section style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px', lineHeight: 1.2 }}>
          Cuộc Thi Khởi Nghiệp<br />Sáng Tạo 2026
        </h2>
        <p style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Biến ý tưởng thành hiện thực. Kết nối với mentors, nhà đầu tư và cộng đồng startup.
        </p>
        <Link href="/register" style={{ display: 'inline-block', padding: '16px 40px', backgroundColor: '#eab308', color: 'black', fontWeight: 'bold', fontSize: '18px', borderRadius: '12px', textDecoration: 'none' }}>
          🎯 Đăng Ký Ngay
        </Link>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginTop: '60px' }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>500+</div>
            <div style={{ color: '#94a3b8' }}>Thí sinh</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>100TR</div>
            <div style={{ color: '#94a3b8' }}>Giải thưởng</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>50+</div>
            <div style={{ color: '#94a3b8' }}>Mentors</div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 20px' }}>
        <h3 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '40px' }}>
          Về Cuộc Thi
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[
            { icon: '💡', title: 'Ý Tưởng', desc: 'Chia sẻ ý tưởng khởi nghiệp với cộng đồng và nhận feedback chuyên nghiệp.' },
            { icon: '👥', title: 'Đội Nhóm', desc: 'Tạo đội 2-5 thành viên, kết hợp đa lĩnh vực để tạo sản phẩm hoàn chỉnh.' },
            { icon: '🏆', title: 'Giải Thưởng', desc: 'Tổng giải thưởng lên đến 100 triệu VNĐ và cơ hội nhận đầu tư.' },
          ].map((item) => (
            <div key={item.title} style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>{item.icon}</div>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>{item.title}</h4>
              <p style={{ color: '#94a3b8', margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '40px', color: '#475569', borderTop: '1px solid #1e293b' }}>
        © 2026 GenD Arena. All rights reserved.
      </footer>

    </div>
  )
}