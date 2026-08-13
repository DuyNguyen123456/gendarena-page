This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Cấu hình Luồng Quên Mật Khẩu (Password Reset Flow)

### 1. Luồng hoạt động
1. Người dùng bấm **"Quên mật khẩu?"** ở trang `/login` và nhập Email.
2. Ứng dụng gọi `supabase.auth.resetPasswordForEmail()` gửi kèm `redirectTo: <SITE_URL>/auth/callback?next=/dat-lai-mat-khau`.
3. Người dùng nhấp vào link trong email -> được dẫn tới `/auth/callback` để trao đổi mã xác thực PKCE thành phiên (session).
4. Người dùng được chuyển hướng tới trang `/dat-lai-mat-khau` để cập nhật mật khẩu mới.
5. Sau khi cập nhật thành công, phiên khôi phục tự động đăng xuất và điều hướng người dùng về `/login`.

### 2. Cấu hình trên Supabase Dashboard
- **Site URL & Redirect URLs**:
  Vào **Authentication -> URL Configuration**:
  - `Site URL`: `http://localhost:3000` (hoặc tên miền production).
  - `Redirect URLs`: Thêm các URL callback chính xác của môi trường:
    - `http://localhost:3000/auth/callback`
    - `https://<your-production-domain>/auth/callback`
- **Custom SMTP (Email gửi tin)**:
  Nếu muốn dùng email thương hiệu riêng của CLB/cuộc thi thay vì email mặc định của Supabase:
  - Vào **Project Settings -> Authentication -> Email Settings**.
  - Bật **Enable Custom SMTP** và điền thông tin SMTP host, port, username, password.
