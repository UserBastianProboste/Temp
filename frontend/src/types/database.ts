export interface DatabaseUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
  role?: 'estudiante' | 'coordinador';
  };
}

export interface Estudiante {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  carrera?: string;
  sede?: string;
  created_at: string;
  updated_at: string;
}

export interface Coordinador {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  departamento?: string;
  domicilio?: string;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id: string;
  razon_social: string;
  direccion: string;
  jefe_directo: string;
  cargo_jefe: string;
  telefono: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Practica {
  id: string;
  estudiante_id: string;  // FK → Estudiante
  empresa_id: string;     // FK → Empresa
  coordinador_id?: string; // FK → Coordinador (NUEVA RELACIÓN)
  
  tipo_practica: 'Práctica I' | 'Práctica II';
  
  fecha_inicio: string;
  fecha_termino: string;
  horario_trabajo: string;
  colacion: string;
  cargo_por_desarrollar: string;
  departamento: string;
  actividades: string;
  
  fecha_firma?: string;
  firma_alumno?: string;
  estado: 'pendiente' | 'aprobada' | 'en_progreso' | 'completada' | 'rechazada';
  created_at: string;
  updated_at: string;
}