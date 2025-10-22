/**
 * Calculates progress percentage based on current date relative to the practice period.
 */
export const calcularAvancePorTiempo = (fechaInicioStr: string, fechaTerminoStr: string): number => {
  const hoy = new Date();
  const inicio = new Date(fechaInicioStr);
  const termino = new Date(fechaTerminoStr);

  const totalDias = Math.max((termino.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24), 1);
  const diasTranscurridos = Math.min(
    (hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
    totalDias
  );

  const avance = Math.round((diasTranscurridos / totalDias) * 100);
  return Math.min(Math.max(avance, 0), 100);
};

/**
 * Normalizes text for comparisons (removes accents, spaces and lowercases).
 */
export const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
