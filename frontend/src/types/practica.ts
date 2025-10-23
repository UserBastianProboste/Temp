export interface PracticeRecord {
  id: string;
  nombre_estudiante: string;
  rut: string;
  carrera: string;
  fecha_envio: string; // ISO 8601
  estado: 'Pendiente' | 'Aprobada' | 'En progreso' | 'Completada' | 'Rechazada';
  fecha_inicio?: string | null;
  fecha_termino?: string | null;
  tipo_practica?: string | null;
  empresa?: string | null;
  coordinador?: string | null;
}