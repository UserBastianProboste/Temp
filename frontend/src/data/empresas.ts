export type EstadoConvenio = 'activo' | 'en_negociacion' | 'vencido';

export interface Empresa {
  id: string;
  nombre: string;
  ubicacion: string;
  estadoConvenio: EstadoConvenio;
  cuposDisponibles: number;
  ultimoContacto: string;
}

export const EMPRESAS: Empresa[] = [
  {
    id: 'innova-tech-solutions',
    nombre: 'InnovaTech Solutions',
    ubicacion: 'Santiago, Región Metropolitana',
    estadoConvenio: 'activo',
    cuposDisponibles: 6,
    ultimoContacto: 'Hace 3 días',
  },
  {
    id: 'bioandes-research',
    nombre: 'BioAndes Research',
    ubicacion: 'Talca, Región del Maule',
    estadoConvenio: 'en_negociacion',
    cuposDisponibles: 2,
    ultimoContacto: 'Hace 1 semana',
  },
  {
    id: 'patagonia-logistics',
    nombre: 'Patagonia Logistics',
    ubicacion: 'Puerto Montt, Región de Los Lagos',
    estadoConvenio: 'vencido',
    cuposDisponibles: 0,
    ultimoContacto: 'Hace 2 meses',
  },
  {
    id: 'nortemin-mining',
    nombre: 'NorteMin Mining',
    ubicacion: 'Calama, Región de Antofagasta',
    estadoConvenio: 'activo',
    cuposDisponibles: 4,
    ultimoContacto: 'Hace 5 días',
  },
  {
    id: 'solaris-energy',
    nombre: 'Solaris Energy',
    ubicacion: 'La Serena, Región de Coquimbo',
    estadoConvenio: 'en_negociacion',
    cuposDisponibles: 3,
    ultimoContacto: 'Hace 2 semanas',
  },
  {
    id: 'andessoft',
    nombre: 'AndesSoft',
    ubicacion: 'Temuco, Región de La Araucanía',
    estadoConvenio: 'activo',
    cuposDisponibles: 5,
    ultimoContacto: 'Ayer',
  },
  {
    id: 'greenfields-agro',
    nombre: 'GreenFields Agro',
    ubicacion: 'Curicó, Región del Maule',
    estadoConvenio: 'vencido',
    cuposDisponibles: 0,
    ultimoContacto: 'Hace 3 meses',
  },
  {
    id: 'andes-health',
    nombre: 'Andes Health',
    ubicacion: 'Rancagua, Región de O’Higgins',
    estadoConvenio: 'activo',
    cuposDisponibles: 2,
    ultimoContacto: 'Hace 4 días',
  },
  {
    id: 'pacifico-digital',
    nombre: 'Pacífico Digital',
    ubicacion: 'Iquique, Región de Tarapacá',
    estadoConvenio: 'en_negociacion',
    cuposDisponibles: 1,
    ultimoContacto: 'Hace 2 semanas',
  },
];

export const ESTADO_LABELS: Record<EstadoConvenio, string> = {
  activo: 'Activo',
  en_negociacion: 'En negociación',
  vencido: 'Vencido',
};
