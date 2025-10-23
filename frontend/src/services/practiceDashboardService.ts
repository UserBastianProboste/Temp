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
  empresa_nombre?: string | null;
  razon_social?: string | null;
}

export async function fetchPracticeRecords(): Promise<PracticeRecord[]> {
  const { data, error } = await practicaService.getAllWithDetails();
  if (error || !data) return [];
  return (data as RawPractice[]).map((p) => ({
    id: p.id,
    nombre_estudiante: `${p.estudiante_nombre ?? ''} ${p.estudiante_apellido ?? ''}`.trim(),
    rut: p.estudiante_rut ?? '',
    carrera: p.estudiante_carrera ?? '',
    fecha_envio: p.created_at,
    estado:
      p.estado === 'pendiente'
        ? 'Pendiente'
        : p.estado === 'aprobada'
        ? 'Aprobada'
        : p.estado === 'en_progreso'
        ? 'En progreso'
        : p.estado === 'completada'
        ? 'Completada'
        : p.estado === 'rechazada'
        ? 'Rechazada'
        : 'Pendiente',
    fecha_inicio: p.fecha_inicio ?? null,
    fecha_termino: p.fecha_termino ?? null,
    tipo_practica: p.tipo_practica ?? null,
    empresa:
      p.empresa_razon_social ??
      p.empresa_nombre ??
      p.razon_social ??
      null,
  }));
}
