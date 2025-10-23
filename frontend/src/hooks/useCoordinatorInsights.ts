import { useEffect, useMemo, useState } from 'react';
import { estudianteService } from '../services/estudianteService';
import { supabase } from '../services/supabaseClient';
import { EMPRESAS, ESTADO_LABELS } from '../data/empresas';

interface StudentRecord {
  id: string;
  nombre: string;
  apellido: string;
  carrera?: string | null;
  telefono?: string | null;
  sede?: string | null;
  semestre?: string | null;
}

interface InformeRecord {
  id: string;
  estudiante_id?: string | null;
  nombre?: string | null;
  created_at: string;
  nota?: number | null;
  tipo?: string | null;
  tipo_practica?: string | null;
  bucket?: string | null;
}

export interface PendingStudentPreview {
  id: string;
  nombre: string;
  carrera: string;
  missingFields: string[];
}

export interface ReportsSummary {
  total: number;
  pendingReview: number;
  graded: number;
  recent: Array<{
    id: string;
    nombre: string;
    studentName: string;
    createdAt: string;
    nota: number | null;
    tipo: string | null;
  }>;
}

export interface CompanySummary {
  total: number;
  byStatus: Array<{ label: string; value: number }>;
  withSlots: number;
  withoutSlots: number;
  needsAttention: Array<{ id: string; nombre: string; estado: string; cuposDisponibles: number }>;
}

export interface CoordinatorInsights {
  loading: boolean;
  error: string | null;
  totalStudents: number;
  pendingStudentsCount: number;
  pendingStudentsPreview: PendingStudentPreview[];
  reportsSummary: ReportsSummary;
  companySummary: CompanySummary;
}

const REQUIRED_LABELS: Array<{ key: keyof StudentRecord; label: string }> = [
  { key: 'telefono', label: 'Teléfono' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'sede', label: 'Sede' },
  { key: 'semestre', label: 'Semestre' },
];

const formatStudentName = (student: StudentRecord) =>
  `${student.nombre ?? ''} ${student.apellido ?? ''}`.trim() || 'Estudiante';

export function useCoordinatorInsights(): CoordinatorInsights {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<InformeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setError(null);
        }

        const [studentsResponse, informesResponse] = await Promise.all([
          estudianteService.getAll(),
          supabase
            .from('informes')
            .select(
              'id, estudiante_id, nombre, created_at, nota, tipo, tipo_practica, bucket',
            )
            .order('created_at', { ascending: false }),
        ]);

        if (!mounted) return;

        const estudiantesData = (studentsResponse.data ?? []) as StudentRecord[];
        setStudents(estudiantesData);

        if (studentsResponse.error) {
          console.warn('No se pudieron cargar estudiantes:', studentsResponse.error);
        }

        if (informesResponse.error) {
          console.warn('No se pudieron cargar informes:', informesResponse.error);
          setReports([]);
        } else {
          const acceptedBuckets = new Set([
            'informe_avance_practica',
            'informe_final_practica',
            'documentos',
          ]);
          const informesFiltrados = (informesResponse.data ?? []).filter((inf: InformeRecord) => {
            if (!inf) return false;
            if (inf.tipo_practica) return true;
            if (inf.bucket && acceptedBuckets.has(inf.bucket)) return true;
            if (typeof inf.nombre === 'string') {
              const lower = inf.nombre.toLowerCase();
              return lower.includes('informe') && lower.includes('pract');
            }
            return false;
          });
          setReports(informesFiltrados as InformeRecord[]);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? 'No se pudo cargar la información complementaria');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const pendingStudentsPreview = useMemo<PendingStudentPreview[]>(() => {
    return students
      .map((student) => {
        const missing: string[] = [];
        REQUIRED_LABELS.forEach(({ key, label }) => {
          const value = student[key];
          if (value === null || value === undefined || String(value).trim() === '') {
            missing.push(label);
          }
        });
        return {
          id: student.id,
          nombre: formatStudentName(student),
          carrera: student.carrera ?? 'Carrera no registrada',
          missingFields: missing,
        };
      })
      .filter((student) => student.missingFields.length > 0)
      .sort((a, b) => b.missingFields.length - a.missingFields.length)
      .slice(0, 5);
  }, [students]);

  const pendingStudentsCount = useMemo(() => {
    return students.reduce((acc, student) => {
      const hasAllRequired = REQUIRED_LABELS.every(({ key }) => {
        const value = student[key];
        return value !== null && value !== undefined && String(value).trim() !== '';
      });
      return hasAllRequired ? acc : acc + 1;
    }, 0);
  }, [students]);

  const studentNameMap = useMemo(() => {
    return students.reduce<Record<string, string>>((acc, student) => {
      acc[student.id] = formatStudentName(student);
      return acc;
    }, {});
  }, [students]);

  const reportsSummary = useMemo<ReportsSummary>(() => {
    const total = reports.length;
    const pendingReview = reports.filter((inf) => inf.nota === null || inf.nota === undefined).length;
    const graded = total - pendingReview;

    const recent = [...reports]
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5)
      .map((inf) => ({
        id: inf.id,
        nombre: inf.nombre ?? inf.tipo ?? 'Informe de práctica',
        studentName: studentNameMap[inf.estudiante_id ?? ''] ?? 'Estudiante',
        createdAt: inf.created_at,
        nota: inf.nota ?? null,
        tipo: inf.tipo_practica ?? inf.tipo ?? null,
      }));

    return {
      total,
      pendingReview,
      graded,
      recent,
    };
  }, [reports, studentNameMap]);

  const companySummary = useMemo<CompanySummary>(() => {
    const byStatusMap = new Map<string, number>();
    EMPRESAS.forEach((empresa) => {
      const label = ESTADO_LABELS[empresa.estadoConvenio];
      byStatusMap.set(label, (byStatusMap.get(label) ?? 0) + 1);
    });

    const needsAttention = EMPRESAS.filter(
      (empresa) => empresa.estadoConvenio !== 'activo' || empresa.cuposDisponibles === 0,
    )
      .sort((a, b) => a.cuposDisponibles - b.cuposDisponibles)
      .slice(0, 4)
      .map((empresa) => ({
        id: empresa.id,
        nombre: empresa.nombre,
        estado: ESTADO_LABELS[empresa.estadoConvenio],
        cuposDisponibles: empresa.cuposDisponibles,
      }));

    const withSlots = EMPRESAS.filter((empresa) => empresa.cuposDisponibles > 0).length;
    const withoutSlots = EMPRESAS.length - withSlots;

    return {
      total: EMPRESAS.length,
      byStatus: Array.from(byStatusMap.entries()).map(([label, value]) => ({ label, value })),
      withSlots,
      withoutSlots,
      needsAttention,
    };
  }, []);

  return {
    loading,
    error,
    totalStudents: students.length,
    pendingStudentsCount,
    pendingStudentsPreview,
    reportsSummary,
    companySummary,
  };
}
