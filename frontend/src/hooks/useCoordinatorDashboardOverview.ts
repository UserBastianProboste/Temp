import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { EMPRESAS } from '../data/empresas';
import { isStudentComplete } from '../utils/studentValidation';

interface StudentRow {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  carrera?: string | null;
  telefono?: string | null;
  sede?: string | null;
  semestre?: string | number | null;
  email?: string | null;
}

interface InformeRow {
  id: string;
  estudiante_id: string;
  nombre?: string | null;
  created_at?: string | null;
  nota?: number | null;
  tipo?: string | null;
  tipo_practica?: string | null;
}

interface PendingStudentSummary {
  id: string;
  nombre: string;
  carrera?: string | null;
}

interface RecentReportSummary {
  id: string;
  nombre: string;
  created_at: string;
  nota?: number | null;
}

export function useCoordinatorDashboardOverview() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [reports, setReports] = useState<InformeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentsResult, reportsResult] = await Promise.all([
          supabase
            .from('estudiantes')
            .select(
              'id, nombre, apellido, carrera, telefono, sede, semestre, email'
            )
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('informes')
            .select('id, estudiante_id, nombre, created_at, nota, tipo, tipo_practica')
            .order('created_at', { ascending: false })
            .limit(200),
        ]);

        if (!active) return;

        if (studentsResult.error) {
          throw new Error(studentsResult.error.message ?? 'Error al cargar estudiantes');
        }
        if (reportsResult.error) {
          throw new Error(reportsResult.error.message ?? 'Error al cargar informes');
        }

        setStudents(studentsResult.data ?? []);
        setReports(reportsResult.data ?? []);
      } catch (err: unknown) {
        if (!active) return;
        setStudents([]);
        setReports([]);
        setError(err instanceof Error ? err.message : 'No fue posible cargar la información del panel');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const pendingStudents = useMemo(() => {
    return students.filter((student) => !isStudentComplete(student));
  }, [students]);

  const topPendingStudents: PendingStudentSummary[] = useMemo(() => {
    return pendingStudents.slice(0, 5).map((student) => ({
      id: student.id,
      nombre: `${student.nombre ?? ''} ${student.apellido ?? ''}`.trim() || 'Estudiante sin nombre',
      carrera: student.carrera,
    }));
  }, [pendingStudents]);

  const reportsAwaiting = useMemo(
    () => reports.filter((report) => report.nota === null || report.nota === undefined).length,
    [reports]
  );

  const recentReports: RecentReportSummary[] = useMemo(() => {
    return reports
      .slice(0, 5)
      .map((report) => ({
        id: report.id,
        nombre: report.nombre ?? 'Informe sin nombre',
        created_at: report.created_at ?? new Date().toISOString(),
        nota: report.nota ?? null,
      }));
  }, [reports]);

  const reviewedReports = reports.length - reportsAwaiting;

  const companyStats = useMemo(() => {
    const total = EMPRESAS.length;
    const activos = EMPRESAS.filter((empresa) => empresa.estadoConvenio === 'activo').length;
    const enNegociacion = EMPRESAS.filter(
      (empresa) => empresa.estadoConvenio === 'en_negociacion'
    ).length;
    const vencidos = EMPRESAS.filter((empresa) => empresa.estadoConvenio === 'vencido').length;
    const sinCupos = EMPRESAS.filter((empresa) => empresa.cuposDisponibles === 0).length;
    const conCupos = EMPRESAS.filter((empresa) => empresa.cuposDisponibles > 0).length;

    return { total, activos, enNegociacion, vencidos, sinCupos, conCupos };
  }, []);

  return {
    loading,
    error,
    totalStudents: students.length,
    pendingStudentsCount: pendingStudents.length,
    topPendingStudents,
    reportsAwaiting,
    reviewedReports,
    recentReports,
    totalReports: reports.length,
    companyStats,
  };
}
