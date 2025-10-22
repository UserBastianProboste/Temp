import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calcularAvancePorTiempo, normalizeText } from '../../utils/practiceProgress';

describe('calcularAvancePorTiempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when current date is before the start date', () => {
    vi.setSystemTime(new Date('2024-03-01T00:00:00Z'));
    expect(calcularAvancePorTiempo('2024-03-10', '2024-03-20')).toBe(0);
  });

  it('returns 100 when the practice is complete', () => {
    vi.setSystemTime(new Date('2024-03-25T00:00:00Z'));
    expect(calcularAvancePorTiempo('2024-03-01', '2024-03-10')).toBe(100);
  });

  it('returns the rounded percentage of elapsed time', () => {
    vi.setSystemTime(new Date('2024-03-05T00:00:00Z'));
    // 4 days elapsed out of 9 total days => 44.44... => 44 after rounding
    expect(calcularAvancePorTiempo('2024-03-01', '2024-03-10')).toBe(44);
  });

  it('handles identical start and end dates gracefully', () => {
    vi.setSystemTime(new Date('2024-03-01T12:00:00Z'));
    expect(calcularAvancePorTiempo('2024-03-01', '2024-03-01')).toBe(50);
  });
});

describe('normalizeText', () => {
  it('removes diacritics and whitespace while lowercasing', () => {
    expect(normalizeText(' Álvaro   Núñez ')).toBe('alvaronunez');
  });

  it('returns an empty string when input is empty', () => {
    expect(normalizeText('')).toBe('');
  });
});
