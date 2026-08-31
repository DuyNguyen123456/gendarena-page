/**
 * @deprecated - TẠM DỪNG THEO YÊU CẦU BAN TỔ CHỨC
 * Tính năng gửi email xác nhận đăng ký sự kiện hiện đã được gỡ bỏ khỏi API đăng ký.
 * File này được giữ lại dưới dạng lưu trữ / tham khảo cho các giai đoạn sau nếu cần kích hoạt lại.
 */

export interface SendEventEmailParams {
  toEmail: string
  fullName: string
  eventTitle: string
  eventDate: string | null
  location: string | null
  registrationId: string
}

function formatDisplayDateTime(iso: string | null): string {
  if (!iso) return 'Ban tổ chức sẽ thông báo thời gian chính thức qua email'
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }) + ' (Giờ Việt Nam)'
  } catch {
    return iso
  }
}

export function generateEventEmailHtml({
  fullName,
  eventTitle,
  eventDate,
  location,
  ticketCode,
}: {
  fullName: string
  eventTitle: string
  eventDate: string | null
  location: string | null
  ticketCode: string
}): string {
  const formattedDate = formatDisplayDateTime(eventDate)
  const formattedLocation = location || 'Zoom Meeting Online (BTC sẽ gửi link phòng trước giờ diễn ra)'

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận đăng ký sự kiện - GenD Arena 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050814; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F0F4FA;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050814; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #0A1120; border: 1px solid #1E2A44; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(180deg, #0F1F3D 0%, #0A1120 100%); border-bottom: 1px solid #1E2A44; text-align: center;">
              <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); color: #00D4FF; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                GEND ARENA 2026
              </div>
              <h1 style="margin: 0; color: #F0F4FA; font-size: 22px; font-weight: 700; line-height: 1.3;">
                XÁC NHẬN ĐĂNG KÝ THAM GIA SỰ KIỆN
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #F0F4FA;">
                Xin chào <strong style="color: #00D4FF;">${fullName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #A8B4C8;">
                Ban Tổ Chức GenD Arena 2026 xin chân thành cảm ơn bạn đã quan tâm và đăng ký tham gia sự kiện. Dưới đây là thông tin vé và lịch trình tham dự của bạn:
              </p>

              <!-- Ticket Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #111B2E; border: 1px solid #1E2A44; border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; border-bottom: 1px dashed #1E2A44;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6B7A94; margin-bottom: 6px;">
                      Sự kiện
                    </div>
                    <div style="font-size: 17px; font-weight: 700; color: #F0F4FA; line-height: 1.4;">
                      ${eventTitle}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-size: 12px; color: #6B7A94; margin-bottom: 4px;">Mã vé tham dự</div>
                          <div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #00D4FF;">${ticketCode}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-size: 12px; color: #6B7A94; margin-bottom: 4px;">Thời gian tổ chức</div>
                          <div style="font-size: 14px; font-weight: 600; color: #F0F4FA;">${formattedDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style="font-size: 12px; color: #6B7A94; margin-bottom: 4px;">Địa điểm / Nền tảng</div>
                          <div style="font-size: 14px; font-weight: 600; color: #F0F4FA;">${formattedLocation}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="padding: 16px; border-radius: 8px; background-color: rgba(0, 212, 255, 0.05); border-left: 3px solid #00D4FF; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #A8B4C8;">
                  <strong style="color: #F0F4FA;">Lưu ý từ Ban Tổ Chức:</strong><br>
                  • Vui lòng có mặt hoặc đăng nhập phòng họp trực tuyến trước 10-15 phút để đảm bảo đường truyền ổn định.<br>
                  • Vui lòng giữ lại email này và mã vé <strong style="color: #00D4FF;">${ticketCode}</strong> khi làm thủ tục check-in tại sự kiện.<br>
                  • Nếu sự kiện diễn ra trên Zoom/Google Meet, link tham gia chính thức sẽ được gửi nhắc lại trước giờ bắt đầu.
                </p>
              </div>

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #A8B4C8;">
                Nếu có bất kỳ thắc mắc hoặc cần hỗ trợ, bạn vui lòng phản hồi trực tiếp email này hoặc liên hệ fanpage GenD Arena 2026.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #050814; border-top: 1px solid #1E2A44; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #F0F4FA;">
                BAN TỔ CHỨC CUỘC THI KHỞI NGHIỆP GEND ARENA 2026
              </p>
              <p style="margin: 0; font-size: 12px; color: #6B7A94;">
                Đại học Ngân Hàng TP. Hồ Chí Minh (HUB) · Email: contact@gendarena.vn
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Send event confirmation email with graceful error handling.
 */
export async function sendEventConfirmationEmail(
  params: SendEventEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { toEmail, fullName, eventTitle, eventDate, location, registrationId } = params
  const ticketCode = `GEND-EVT-${registrationId.replace(/-/g, '').slice(0, 8).toUpperCase()}`

  try {
    const htmlContent = generateEventEmailHtml({
      fullName,
      eventTitle,
      eventDate,
      location,
      ticketCode,
    })

    const subject = `[GenD Arena 2026] Xác nhận đăng ký sự kiện: ${eventTitle} (Mã vé: ${ticketCode})`

    // 1. Check Brevo API Key
    const brevoApiKey = process.env.BREVO_API_KEY
    if (brevoApiKey) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          sender: {
            name: 'GenD Arena 2026',
            email: process.env.BREVO_SENDER_EMAIL || 'no-reply@gendarena.vn',
          },
          to: [{ email: toEmail, name: fullName }],
          subject,
          htmlContent,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        console.warn('[Brevo Email Error]', res.status, errBody)
        return { success: false, error: `Brevo error: ${res.statusText}` }
      }

      return { success: true }
    }

    // 2. Check Resend API Key
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'GenD Arena 2026 <onboarding@resend.dev>',
          to: [toEmail],
          subject,
          html: htmlContent,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        console.warn('[Resend Email Error]', res.status, errBody)
        return { success: false, error: `Resend error: ${res.statusText}` }
      }

      return { success: true }
    }

    // If no email provider key is configured, log in dev mode
    console.info(`[Email Service (Dev)] Brevo/Resend API key not configured. Mocking confirmation email sent to ${toEmail} for event "${eventTitle}" with ticket "${ticketCode}".`)
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown email error'
    console.warn('[Email Service Exception]', errorMsg)
    return { success: false, error: errorMsg }
  }
}
