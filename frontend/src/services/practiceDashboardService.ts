import { practicaService } from './practicaService';
import type { PracticeRecord } from '../types/practica';

interface RawPractice {
  id: string;
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  estudiante_carrera?: string;
  estudiante_rut?: string;
  created_at: string;
  estado: string;
  fecha_inicio?: string | null;
  fecha_termino?: string | null;
  tipo_practica?: string | null;
  empresa_razon_social?: string | null;
  coordinador_nombre?: string | null;
  coordinador_apellido?: string | null;
}

const normalizeEstado = (estado?: string | null): PracticeRecord['estado'] => {
  const value = (estado ?? '').toLowerCase();

  if (value.includes('rechaz')) return 'Rechazada';
  if (value.includes('complet')) return 'Completada';
  if (value.includes('en_progreso') || value.includes('en progreso')) return 'En progreso';
  if (value.includes('aprob') && !value.includes('no aprob')) return 'Aprobada';

  return 'Pendiente';
};

const needsCoordinatorReview = (estado?: string | null) => {
  if (!estado) return false;
  const normalized = estado.toLowerCase();

  if (normalized === 'pendiente') return true;
  if (normalized.includes('coordinador') && normalized.includes('pendiente')) return true;
  if (normalized.includes('por_aprobar')) return true;
  if (normalized.includes('revision') && normalized.includes('coordinador')) return true;

  return false;
};

export async function fetchPracticeRecords(): Promise<PracticeRecord[]> {
  const { data, error } = await practicaService.getAllWithDetails();
  if (error || !data) {
    console.warn('No se pudieron cargar los registros completos de prácticas.', error);
    return [];
  }

  return (data as RawPractice[]).map((p) => {
    const estadoOriginal = p.estado ?? '';
    const estado = normalizeEstado(estadoOriginal);

    return {
      id: p.id,
      nombre_estudiante: `${p.estudiante_nombre ?? ''} ${p.estudiante_apellido ?? ''}`.trim(),
      rut: p.estudiante_rut ?? '',
      carrera: p.estudiante_carrera ?? '',
      fecha_envio: p.created_at,
      estado,
      estadoOriginal,
      requiresCoordinatorAction: needsCoordinatorReview(estadoOriginal),
      fecha_inicio: p.fecha_inicio ?? null,
      fecha_termino: p.fecha_termino ?? null,
      tipo_practica: p.tipo_practica ?? null,
      empresa: p.empresa_razon_social ?? null,
      coordinador: `${p.coordinador_nombre ?? ''} ${p.coordinador_apellido ?? ''}`.trim() || null,
    } as PracticeRecord;
  });
}
