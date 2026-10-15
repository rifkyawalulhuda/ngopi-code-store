export interface OrderAccessLinkEmailData {
  customerName: string;
  orderCode: string;
  accessUrl: string;
  expiresInHours: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders the magic order-access email sent to guests (and to returning guests
 * who request a fresh link) so they can open their purchase without a password.
 */
export function renderOrderAccessLinkEmail(data: OrderAccessLinkEmailData): string {
  const { customerName, orderCode, accessUrl, expiresInHours } = data;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Akses Pesanan - ${escapeHtml(orderCode)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #1f2937; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff;">
                ☕ NgopiCode
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.5;">
                Halo <strong>${escapeHtml(customerName)}</strong>,
              </p>
              <p style="margin: 12px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.5;">
                Klik tombol di bawah untuk membuka pesanan <strong>${escapeHtml(orderCode)}</strong> dan mengunduh produk digital Anda. Tautan ini hanya berlaku sekali.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #2563eb; border-radius: 6px;">
                          <a href="${escapeHtml(accessUrl)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                            Buka Pesanan Saya
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Tautan berlaku selama ${expiresInHours} jam. Jika Anda tidak meminta ini, abaikan saja email ini.
              </p>
              <p style="margin: 16px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280;">
                Atau salin tautan berikut:<br>
                <a href="${escapeHtml(accessUrl)}" style="color: #2563eb; word-break: break-all;">${escapeHtml(accessUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} NgopiCode. All rights reserved.
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
