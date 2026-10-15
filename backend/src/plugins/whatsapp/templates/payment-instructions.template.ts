import { escapeWhatsapp, formatDateID, formatIDR } from './format';

export interface WhatsappPaymentInstructionsData {
  customerName: string;
  orderCode: string;
  channelName: string;
  /** VA number / pay code the customer must pay to. */
  payCode?: string | null;
  amount: number;
  expiresAt?: Date | string | null;
  paymentUrl?: string | null;
  instructions?: Array<{ title: string; steps: string[] }>;
}

/**
 * Payment instructions sent right after a Tripay transaction is created, so the
 * customer has the VA number / QRIS link in WhatsApp instead of hunting for it.
 */
export function renderPaymentInstructionsMessage(data: WhatsappPaymentInstructionsData): string {
  const lines: string[] = [
    `Halo *${escapeWhatsapp(data.customerName)}*,`,
    '',
    `Pesanan *${escapeWhatsapp(data.orderCode)}* sudah dibuat. Silakan selesaikan pembayaran:`,
    '',
    `Metode: *${escapeWhatsapp(data.channelName)}*`,
  ];

  if (data.payCode) {
    lines.push(`Nomor Pembayaran: *${escapeWhatsapp(data.payCode)}*`);
  }
  lines.push(`Total: *${formatIDR(data.amount)}*`);

  if (data.expiresAt) {
    lines.push(`Batas waktu: ${formatDateID(data.expiresAt)}`);
  }

  if (data.paymentUrl) {
    lines.push('', 'Bayar online di sini:', data.paymentUrl);
  }

  // Include at most the first instruction group so the message stays readable.
  const firstGroup = data.instructions?.[0];
  if (firstGroup?.steps?.length) {
    lines.push('', `*${escapeWhatsapp(firstGroup.title)}*`);
    firstGroup.steps
      .slice(0, 5)
      .forEach((step, idx) => lines.push(`${idx + 1}. ${escapeWhatsapp(stripHtml(step))}`));
  }

  lines.push('', 'Pesanan akan otomatis diproses setelah pembayaran terverifikasi.');
  return lines.join('\n');
}

/** Tripay returns instruction steps as HTML fragments; flatten them to text. */
function stripHtml(input: string): string {
  return String(input ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
