export const SEDES_VALIDAS = ['Sede Llano', 'Sede Providencia', 'Sede Temuco', 'Sede Talca'] as const;

export const SEMESTRES_VALIDOS = Array.from({ length: 12 }, (_, index) => String(index + 1)) as const;

export type StudentProfileLike = {
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  carrera?: string | null;
  sede?: string | null;
  semestre?: string | number | null;
};

export const matchSede = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = SEDES_VALIDAS.find((valid) => valid.toLowerCase() === trimmed.toLowerCase());
  return match ?? '';
};

export const isStudentProfileComplete = (student: StudentProfileLike) => {
  const hasAllFields =
    Boolean(student?.nombre) &&
    Boolean(student?.apellido) &&
    Boolean(student?.email) &&
    Boolean(student?.telefono) &&
    Boolean(student?.carrera) &&
    Boolean(student?.sede) &&
    Boolean(student?.semestre);

  if (!hasAllFields) {
    return false;
  }

  const sedeCanonical = matchSede(String(student?.sede ?? ''));
  const semestreValue = String(student?.semestre ?? '').trim();

  if (!sedeCanonical || !SEMESTRES_VALIDOS.includes(semestreValue as (typeof SEMESTRES_VALIDOS)[number])) {
    return false;
  }

  return true;
};
