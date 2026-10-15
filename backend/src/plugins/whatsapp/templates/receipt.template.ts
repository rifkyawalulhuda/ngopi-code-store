import { escapeWhatsapp, formatDateID, formatIDR } from './format';

export interface WhatsappReceiptData {
  customerName: string;
  orderCode: string;
  items: Array<{ productName: string; price: number }>;
  totalAmount: number;
  paymentMethod: string;
  paidAt: Date | string;
  /** Public receipt page, e.g. {storefront}/receipt/{code}. */
  receiptUrl: string;
}

/**
 * Proof-of-transaction notification with a link to the printable receipt.
 */
export function renderReceiptMessage(data: WhatsappReceiptData): string {
  const itemLines = data.items
    .map((i) => `• ${escapeWhatsapp(i.productName)} — ${formatIDR(i.price)}`)
    .join('\n');

  return [
    `Halo *${escapeWhatsapp(data.customerName)}*,`,
    '',
    `Berikut bukti transaksi untuk pesanan *${escapeWhatsapp(data.orderCode)}*.`,
    '',
    '*Rincian*',
    itemLines,
    '',
    `Total: *${formatIDR(data.totalAmount)}*`,
    `Metode: ${escapeWhatsapp(data.paymentMethod)}`,
    `Tanggal: ${formatDateID(data.paidAt)}`,
    '',
    'Lihat / cetak bukti transaksi:',
    data.receiptUrl,
  ].join('\n');
}
