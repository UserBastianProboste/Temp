export const SEDES_VALIDAS = [
  'Sede Llano',
  'Sede Providencia',
  'Sede Temuco',
  'Sede Talca',
];

export const SEMESTRES_VALIDOS = Array.from({ length: 12 }, (_, index) => String(index + 1));

export const matchSede = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = SEDES_VALIDAS.find(
    (sede) => sede.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? '';
};

type StudentRecordLike = {
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  carrera?: string | null;
  sede?: string | null;
  semestre?: string | number | null;
};

export const isStudentComplete = (student: StudentRecordLike) => {
  const hasAllFields =
    Boolean(student.nombre) &&
    Boolean(student.apellido) &&
    Boolean(student.email) &&
    Boolean(student.telefono) &&
    Boolean(student.carrera) &&
    Boolean(student.sede) &&
    Boolean(student.semestre);

  if (!hasAllFields) {
    return false;
  }

  const sedeCanonical = matchSede(String(student.sede ?? ''));
  const semestreValue = String(student.semestre ?? '').trim();

  if (!sedeCanonical || !SEMESTRES_VALIDOS.includes(semestreValue)) {
    return false;
  }

  return true;
};
