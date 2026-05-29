import { OrderConfirmationEmailData } from '../../../shared/types/email.types';

/**
 * Formats a number as Indonesian Rupiah currency string.
 * Example: 150000 → "Rp 150.000"
 */
function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Formats a Date to a human-readable Indonesian date string.
 * Example: 2024-01-15T10:30:00Z → "15 Januari 2024, 10:30 WIB"
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
}

/**
 * Generates a responsive HTML email for order confirmation.
 *
 * Includes: order code, product list with prices, total amount,
 * payment method, and download page URL.
 *
 * @see Requirements 6.2
 */
export function renderOrderConfirmationEmail(data: OrderConfirmationEmailData): string {
  const { customerName, orderCode, items, totalAmount, paymentMethod, paidAt } = data;

  // All items share the same download URL (order-level download page)
  const downloadPageUrl = items.length > 0 ? items[0].downloadUrl : '';

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #374151;">
            ${escapeHtml(item.productName)}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #374151; text-align: right; white-space: nowrap;">
            ${formatIDR(item.price)}
          </td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Konfirmasi Pesanan - ${escapeHtml(orderCode)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Wrapper table for full-width background -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Main content container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1f2937; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                ☕ NgopiCode
              </h1>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td style="background-color: #ecfdf5; padding: 20px 24px; text-align: center; border-bottom: 1px solid #d1fae5;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #065f46;">
                ✓ Pembayaran Berhasil!
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 16px;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.5;">
                Halo <strong>${escapeHtml(customerName)}</strong>,
              </p>
              <p style="margin: 12px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.5;">
                Terima kasih atas pembelian Anda! Pembayaran telah kami terima dan produk digital Anda siap untuk diunduh.
              </p>
            </td>
          </tr>

          <!-- Order info -->
          <tr>
            <td style="padding: 8px 24px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280; padding-bottom: 4px;">
                          Kode Pesanan
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: #111827; padding-bottom: 12px; letter-spacing: 0.5px;">
                          ${escapeHtml(orderCode)}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280; padding-bottom: 4px;">
                          Metode Pembayaran
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 500; color: #111827; padding-bottom: 12px;">
                          ${escapeHtml(paymentMethod)}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280; padding-bottom: 4px;">
                          Tanggal Pembayaran
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 500; color: #111827;">
                          ${formatDate(paidAt)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Product list -->
          <tr>
            <td style="padding: 8px 24px 16px;">
              <h2 style="margin: 0 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #111827;">
                Detail Produk
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 10px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">
                    Produk
                  </td>
                  <td style="padding: 10px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right; border-bottom: 1px solid #e5e7eb;">
                    Harga
                  </td>
                </tr>
                ${itemRows}
                <!-- Total row -->
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 14px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #111827;">
                    Total
                  </td>
                  <td style="padding: 14px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #111827; text-align: right; white-space: nowrap;">
                    ${formatIDR(totalAmount)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Download CTA button -->
          <tr>
            <td style="padding: 8px 24px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #2563eb; border-radius: 6px;">
                          <a href="${escapeHtml(downloadPageUrl)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                            Unduh Produk Anda
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 12px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280;">
                      Atau kunjungi halaman download:
                    </p>
                    <p style="margin: 4px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;">
                      <a href="${escapeHtml(downloadPageUrl)}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">
                        ${escapeHtml(downloadPageUrl)}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Email ini dikirim otomatis oleh NgopiCode.<br>
                Jika Anda memiliki pertanyaan, silakan hubungi kami.
              </p>
              <p style="margin: 12px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">
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

/**
 * Escapes HTML special characters to prevent XSS in email content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
