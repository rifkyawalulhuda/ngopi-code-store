/**
 * Shared formatting helpers for WhatsApp message templates.
 * WhatsApp supports a small markdown subset: *bold*, _italic_, ~strike~, ```mono```.
 */

/** Formats a number as Indonesian Rupiah, e.g. 150000 → "Rp 150.000". */
export function formatIDR(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/** Formats a date in Indonesian, e.g. "15 Juni 2025, 14:30 WIB". */
export function formatDateID(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${minutes} WIB`;
}

/**
 * Strips characters that would break WhatsApp markdown when customer-supplied
 * text (names, product titles) is interpolated into a message.
 */
export function escapeWhatsapp(text: string): string {
  return String(text ?? '').replace(/[*_~`]/g, '');
}
