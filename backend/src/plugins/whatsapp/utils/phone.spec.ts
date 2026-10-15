import {
  normalizeIndonesianPhone,
  toWhatsappChatId,
  isValidIndonesianPhone,
  formatIndonesianPhone,
} from './phone';

describe('phone utils', () => {
  describe('normalizeIndonesianPhone', () => {
    it.each([
      ['081234567890', '6281234567890'],
      ['+6281234567890', '6281234567890'],
      ['6281234567890', '6281234567890'],
      ['81234567890', '6281234567890'],
      ['0812-3456-7890', '6281234567890'],
      [' 0812 3456 7890 ', '6281234567890'],
      ['+62 812 3456 7890', '6281234567890'],
      ['(0812) 3456-7890', '6281234567890'],
      ['0812345678', '62812345678'],
      ['08123456789012', '628123456789012'],
    ])('normalises %s → %s', (input, expected) => {
      expect(normalizeIndonesianPhone(input)).toBe(expected);
    });

    it.each([
      [''],
      ['   '],
      ['abc'],
      ['12345'],
      ['0211234567'], // Jakarta landline, not a mobile
      ['+14155552671'], // foreign number
      ['0888'], // too short
      [null],
      [undefined],
    ])('rejects %s', (input) => {
      expect(normalizeIndonesianPhone(input as any)).toBeNull();
    });
  });

  describe('toWhatsappChatId', () => {
    it('appends the WhatsApp chat suffix', () => {
      expect(toWhatsappChatId('081234567890')).toBe('6281234567890@c.us');
    });

    it('returns null for an invalid number', () => {
      expect(toWhatsappChatId('not-a-number')).toBeNull();
      expect(toWhatsappChatId(null)).toBeNull();
    });
  });

  describe('isValidIndonesianPhone', () => {
    it('accepts valid mobile numbers', () => {
      expect(isValidIndonesianPhone('081234567890')).toBe(true);
    });

    it('rejects invalid input', () => {
      expect(isValidIndonesianPhone('123')).toBe(false);
      expect(isValidIndonesianPhone('')).toBe(false);
    });
  });

  describe('formatIndonesianPhone', () => {
    it('formats a normalised number for display', () => {
      expect(formatIndonesianPhone('081234567890')).toBe('+62 812-3456-7890');
    });

    it('falls back to the raw input when it cannot be normalised', () => {
      expect(formatIndonesianPhone('weird')).toBe('weird');
      expect(formatIndonesianPhone(null)).toBe('');
    });
  });
});
