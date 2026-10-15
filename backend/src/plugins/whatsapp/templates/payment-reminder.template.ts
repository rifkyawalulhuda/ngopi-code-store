import { escapeWhatsapp, formatDateID, formatIDR } from './format';

export interface WhatsappPaymentReminderData {
  customerName: string;
  orderCode: string;
  amount: number;
  expiresAt?: Date | string | null;
  paymentUrl?: string | null;
}

/**
 * Reminder for an order still awaiting payment shortly before it expires.
 */
export function renderPaymentReminderMessage(data: WhatsappPaymentReminderData): string {
  const lines: string[] = [
    `Halo *${escapeWhatsapp(data.customerName)}*,`,
    '',
    `Pesanan *${escapeWhatsapp(data.orderCode)}* belum dibayar.`,
    `Total: *${formatIDR(data.amount)}*`,
  ];

  if (data.expiresAt) {
    lines.push(`Segera selesaikan sebelum ${formatDateID(data.expiresAt)} agar tidak dibatalkan otomatis.`);
  } else {
    lines.push('Segera selesaikan pembayaran agar pesanan tidak dibatalkan otomatis.');
  }

  if (data.paymentUrl) {
    lines.push('', 'Lanjutkan pembayaran:', data.paymentUrl);
  }

  lines.push('', 'Sudah membayar? Abaikan pesan ini, pesanan akan diproses otomatis.');
  return lines.join('\n');
}
