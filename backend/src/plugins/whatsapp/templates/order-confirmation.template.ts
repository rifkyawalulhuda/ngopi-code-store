import { escapeWhatsapp, formatIDR } from './format';

export interface WhatsappOrderConfirmationData {
  customerName: string;
  orderCode: string;
  items: Array<{ productName: string; price: number }>;
  totalAmount: number;
  paymentMethod: string;
  /** Magic order-access link (guests) or the downloads page (registered). */
  accessUrl: string;
  accessExpiresInHours: number;
  /** Printable proof-of-transaction page, appended when available. */
  receiptUrl?: string | null;
}

/**
 * "Pembayaran berhasil" notification carrying the order details, the link that
 * opens the purchase, and (when available) the printable receipt link.
 */
export function renderOrderConfirmationMessage(data: WhatsappOrderConfirmationData): string {
  const itemLines = data.items
    .map((i) => `• ${escapeWhatsapp(i.productName)} — ${formatIDR(i.price)}`)
    .join('\n');

  const lines = [
    `Halo *${escapeWhatsapp(data.customerName)}*,`,
    '',
    `Pembayaran untuk pesanan *${escapeWhatsapp(data.orderCode)}* sudah kami terima. 🎉`,
    '',
    '*Rincian Pesanan*',
    itemLines,
    '',
    `Total: *${formatIDR(data.totalAmount)}*`,
    `Metode: ${escapeWhatsapp(data.paymentMethod)}`,
    '',
    'Klik tautan berikut untuk membuka pesanan dan mengunduh produk Anda:',
    data.accessUrl,
    '',
    `Tautan berlaku ${data.accessExpiresInHours} jam dan hanya dapat digunakan sekali.`,
  ];

  if (data.receiptUrl) {
    lines.push('', 'Bukti transaksi:', data.receiptUrl);
  }

  lines.push('', 'Jika Anda tidak merasa melakukan pembelian ini, abaikan pesan ini.');
  return lines.join('\n');
}
