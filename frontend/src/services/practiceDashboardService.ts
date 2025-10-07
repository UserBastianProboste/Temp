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
  }));
}