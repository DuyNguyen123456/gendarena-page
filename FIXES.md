# Khắc Phục Lỗi Authentication/Redirect

## Vấn đề
Users đăng nhập xong không quay về trang Dashboard được.

## Nguyên nhân
- Server-side Supabase client (`supabaseServer.ts`) không xử lý cookies đúng cách
- Session được thiết lập ở client-side nhưng server-side không nhận ra
- Middleware không tồn tại để quản lý authentication state

## Giải pháp

### 1. **Thêm Middleware** (`middleware.ts`)
- Tạo middleware để kiểm tra auth state trên mỗi request
- Tự động redirect đến /login nếu user chưa authenticated khi truy cập protected routes
- Tự động redirect đến /dashboard nếu user đã authenticated khi truy cập /login hoặc /register

### 2. **Cập nhật Server Supabase Client** (`lib/supabaseServer.ts`)
- Từ cách sử dụng `createClient()` từ `@supabase/supabase-js` sang dùng `createServerClient()` từ `@supabase/ssr`
- Xử lý cookies đúng cách trên server-side
- Cookie được tự động read/set/delete qua Next.js cookies API

### 3. **Cập nhật Dashboard Page** (`app/dashboard/page.tsx`)
- Import `createSupabaseServerClient` thay vì `supabaseServer`
- Gọi `await createSupabaseServerClient()` để lấy instance client

### 4. **Thêm Delay Sau Đăng Nhập** (`app/login/page.tsx`)
- Thêm 1 giây delay trước khi redirect để đảm bảo session được thiết lập
- Điều này cho phép cookies được ghi vào đúng cách trước khi middleware kiểm tra

### 5. **Cài Đặt Package**
- `npm install @supabase/ssr` để hỗ trợ server-side authentication

## Files Đã Thay Đổi
1. `middleware.ts` - **Created** - Middleware xử lý authentication
2. `lib/supabaseServer.ts` - **Updated** - Server client configuration
3. `app/dashboard/page.tsx` - **Updated** - Use new server client
4. `app/login/page.tsx` - **Updated** - Add delay before redirect
5. `package.json` - **Updated** - Added @supabase/ssr

## Routes Protected Bởi Middleware
- `/dashboard` - Yêu cầu authentication
- `/submissions` - Yêu cầu authentication
- `/admin` - Yêu cầu authentication

## Cách Hoạt Động
1. User đăng nhập → Supabase client-side lưu session vào cookies
2. Thêm 1 giây delay
3. Redirect đến `/dashboard`
4. Middleware kiểm tra cookies (server-side) → Xác nhận user đã authenticated
5. Dashboard page load dữ liệu từ Supabase server client
6. User thấy dashboard page thành công
