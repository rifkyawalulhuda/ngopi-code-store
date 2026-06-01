/**
 * Email-change verification template.
 * Sent to the NEW email address when a customer requests to change their email.
 * The email only changes after the customer clicks the verification link.
 */

export interface EmailChangeData {
  customerName: string;
  newEmail: string;
  verificationUrl: string;
}

export function renderEmailChangeEmail(data: EmailChangeData): string {
  const { customerName, newEmail, verificationUrl } = data;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konfirmasi Perubahan Email - NgopiCode</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <tr>
            <td style="background-color: #1f7a4d; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                NgopiCode
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #111827;">
                Konfirmasi Perubahan Email
              </h2>
              <p style="margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.6;">
                Halo <strong>${escapeHtml(customerName)}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.6;">
                Kami menerima permintaan untuk mengubah alamat email akun NgopiCode kamu menjadi
                <strong>${escapeHtml(newEmail)}</strong>. Klik tombol di bawah untuk mengkonfirmasi perubahan ini.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #1f7a4d; border-radius: 8px;">
                          <a href="${escapeHtml(verificationUrl)}" target="_blank" style="display: inline-block; padding: 14px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                            Konfirmasi Email Baru
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280;">
                Atau salin link berikut ke browser Anda:
              </p>
              <p style="margin: 0 0 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;">
                <a href="${escapeHtml(verificationUrl)}" style="color: #1f7a4d; text-decoration: underline; word-break: break-all;">
                  ${escapeHtml(verificationUrl)}
                </a>
              </p>

              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Jika kamu tidak meminta perubahan ini, abaikan email ini dan email akun kamu tidak akan berubah.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} NgopiCode. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
