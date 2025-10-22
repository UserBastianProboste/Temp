import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  templateCambioEstado,
  templateFichaRecibida,
  templateGenerico,
  getEmailTemplate,
} from '../emailTemplates';

describe('emailTemplates', () => {
  describe('templateCambioEstado', () => {
    it('includes celebratory message when status is approved', () => {
      const { subject, html } = templateCambioEstado({
        estudiante_nombre: 'Ana',
        estudiante_apellido: 'Rojas',
        tipo_practica: 'Práctica I',
        empresa: 'Tech Corp',
        estado: 'aprobada',
        coordinator_name: 'Carlos Pérez',
        practica_id: 'abc-123',
      });

      expect(subject).toContain('APROBADA');
      expect(subject).toContain('Práctica I');
      expect(html).toContain('¡Felicidades!');
      expect(html).toContain('Tech Corp');
      expect(html).toContain('Carlos Pérez');
    });

    it('falls back to generic messaging for unknown states', () => {
      const { subject, html } = templateCambioEstado({
        estudiante_nombre: 'Ana',
        estudiante_apellido: 'Rojas',
        tipo_practica: 'Práctica II',
        empresa: 'Tech Corp',
        estado: 'desconocido',
      });

      expect(subject).toContain('DESCONOCIDO');
      expect(html).toContain('ℹ️ Información');
    });
  });

  describe('templateFichaRecibida', () => {
    it('formats the key information for the student', () => {
      const { subject, html } = templateFichaRecibida({
        estudiante_nombre: 'Luis',
        estudiante_apellido: 'Martínez',
        tipo_practica: 'Práctica Profesional',
        empresa: 'Innova',
        fecha_inicio: '2024-01-15',
        fecha_termino: '2024-04-15',
      });

      expect(subject).toContain('Ficha de Práctica Recibida');
      expect(html).toContain('Luis Martínez');
      expect(html).toContain('Innova');
      expect(html).toMatch(/15 de [a-záéíóú]+ de 2024/i);
    });
  });

  describe('templateGenerico', () => {
    const fixedDate = new Date('2024-08-05T12:00:00Z');

    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('wraps simple HTML in the institutional layout', () => {
      const { subject, html } = templateGenerico({
        subject: 'Alerta',
        mensaje_html: '<p>Nuevo mensaje</p>',
      });

      expect(subject).toBe('Alerta');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Nuevo mensaje');
      expect(html).toContain('2024');
    });

    it('preserves complete HTML documents without wrapping them again', () => {
      const fullHtml = '<html><body><h1>Hola</h1></body></html>';
      const { html } = templateGenerico({
        subject: 'Manual',
        mensaje_html: fullHtml,
      });

      expect(html).toBe(fullHtml);
    });
  });

  describe('getEmailTemplate', () => {
    it('delegates to the correct template implementation', () => {
      const ficha = getEmailTemplate('ficha_recibida', { estudiante_nombre: 'Ana' });
      const cambio = getEmailTemplate('cambio_estado', { estado: 'en_progreso' });
      const generico = getEmailTemplate('generico', { mensaje_html: '<p>Hola</p>' });

      expect(ficha.subject).toContain('Ficha de Práctica Recibida');
      expect(cambio.subject).toContain('EN PROGRESO');
      expect(generico.subject).toContain('Notificación');
    });
  });
});
