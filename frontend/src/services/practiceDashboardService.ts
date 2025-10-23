import { practicaService } from './practicaService';
import type { PracticeRecord } from '../types/practica';

interface RawPractice {
  id: string;
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  estudiante_carrera?: string;
  estudiante_rut?: string;
  created_at: string;
  estado?: string | null;
  fecha_inicio?: string | null;
  fecha_termino?: string | null;
  tipo_practica?: string | null;
  empresa_razon_social?: string | null;
  coordinador_nombre?: string | null;
  coordinador_apellido?: string | null;
}

const normalizeEstado = (estado?: string | null): PracticeRecord['estado'] => {
  const normalized = (estado ?? '').toString().toLowerCase().trim();

  if (normalized.includes('rechaz')) {
    return 'Rechazada';
  }

  if (normalized.includes('complet')) {
    return 'Completada';
  }

  if (normalized.includes('progreso') || normalized.includes('curso') || normalized.includes('ejec')) {
    return 'En progreso';
  }

  if (normalized.includes('aprob')) {
    return 'Aprobada';
  }

  return 'Pendiente';
};

export async function fetchPracticeRecords(): Promise<PracticeRecord[]> {
  const { data, error } = await practicaService.getAllWithDetails();

  if (error) {
    throw new Error(error.message ?? 'No se pudo obtener la lista de prácticas');
  }

  if (!data) {
    return [];
  }

  return (data as RawPractice[]).map((p) => ({
    id: p.id,
    nombre_estudiante: `${p.estudiante_nombre ?? ''} ${p.estudiante_apellido ?? ''}`.trim(),
    rut: p.estudiante_rut ?? '',
    carrera: p.estudiante_carrera ?? '',
    fecha_envio: p.created_at,
    estado: normalizeEstado(p.estado),
    fecha_inicio: p.fecha_inicio ?? null,
    fecha_termino: p.fecha_termino ?? null,
    tipo_practica: p.tipo_practica ?? null,
    empresa: p.empresa_razon_social ?? null,
    coordinador: `${p.coordinador_nombre ?? ''} ${p.coordinador_apellido ?? ''}`.trim() || null,
  }));
}