import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeRecord } from '../types/practica';
import { supabase } from '../services/supabaseClient';
import { EMPRESAS } from '../data/empresas';
import { isStudentProfileComplete } from '../utils/studentProfile';

export type StudentSummary = {
  id: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  carrera?: string | null;
  telefono?: string | null;
  sede?: string | null;
  semestre?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InformeSummary = {
  id: string;
  estudianteId?: string | null;
  nombre?: string | null;
  nota?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  tipoPractica?: string | null;
};

export type CompanySummary = {
  id: string;
  nombre: string;
  estado: 'activo' | 'en_negociacion' | 'vencido';
  cuposDisponibles: number;
};

export type ActivityItem = {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  category: 'practica' | 'informe' | 'estudiante';
};

const PRACTICE_STATUS_ORDER: PracticeRecord['estado'][] = [
  'Pendiente',
  'En progreso',
  'Aprobada',
  'Completada',
  'Rechazada',
];

const normalizeCompanyState = (value: any): CompanySummary['estado'] => {
  if (value === 'en_negociacion' || value === 'en_negociación') return 'en_negociacion';
  if (value === 'vencido') return 'vencido';
  return 'activo';
};

export function useCoordinatorSummary(practices: PracticeRecord[]) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [informes, setInformes] = useState<InformeSummary[]>([]);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsResp, informesResp, companiesResp] = await Promise.all([
        supabase
          .from('estudiantes')
          .select('id, nombre, apellido, email, carrera, telefono, sede, semestre, created_at, updated_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('informes')
          .select('id, estudiante_id, nombre, nota, created_at, updated_at, tipo_practica')
          .order('created_at', { ascending: false }),
        supabase
          .from('empresas')
          .select('id, razon_social, nombre, estado_convenio, estadoConvenio, cupos_disponibles, cuposDisponibles')
          .order('razon_social', { ascending: true }),
      ]);

      if (!isMountedRef.current) return;

      if (!studentsResp.error && Array.isArray(studentsResp.data)) {
        setStudents(
          studentsResp.data.map((student: any) => ({
            id: student.id,
            nombre: student.nombre ?? '',
            apellido: student.apellido ?? '',
            email: student.email ?? null,
            carrera: student.carrera ?? null,
            telefono: student.telefono ?? null,
            sede: student.sede ?? null,
            semestre: student.semestre ?? null,
            createdAt: student.created_at ?? null,
            updatedAt: student.updated_at ?? null,
          })),
        );
      } else if (studentsResp.error) {
        throw studentsResp.error;
      }

      if (!informesResp.error && Array.isArray(informesResp.data)) {
        setInformes(
          informesResp.data.map((inf: any) => ({
            id: inf.id,
            estudianteId: inf.estudiante_id ?? null,
            nombre: inf.nombre ?? null,
            nota: typeof inf.nota === 'number' ? inf.nota : null,
            createdAt: inf.created_at ?? null,
            updatedAt: inf.updated_at ?? null,
            tipoPractica: inf.tipo_practica ?? null,
          })),
        );
      } else if (informesResp.error) {
        throw informesResp.error;
      }

      if (!companiesResp.error && Array.isArray(companiesResp.data) && companiesResp.data.length > 0) {
        setCompanies(
          companiesResp.data.map((empresa: any) => ({
            id: empresa.id,
            nombre: (empresa.razon_social ?? empresa.nombre ?? 'Empresa sin nombre') as string,
            estado: normalizeCompanyState(empresa.estado_convenio ?? empresa.estadoConvenio),
            cuposDisponibles: Number(empresa.cupos_disponibles ?? empresa.cuposDisponibles ?? 0) || 0,
          })),
        );
      } else {
        setCompanies(
          EMPRESAS.map((empresa) => ({
            id: empresa.id,
            nombre: empresa.nombre,
            estado: empresa.estadoConvenio,
            cuposDisponibles: empresa.cuposDisponibles,
          })),
        );
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err?.message ?? 'No fue posible cargar la información');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    const subscriptions: any[] = [];
    try {
      if ((supabase as any).channel) {
        ['estudiantes', 'informes', 'empresas'].forEach((table) => {
          const channel = (supabase as any)
            .channel(`public:${table}-coordinator-dashboard`)
            .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
              refresh();
            })
            .subscribe();
          subscriptions.push(channel);
        });
      } else if ((supabase as any).from) {
        ['estudiantes', 'informes', 'empresas'].forEach((table) => {
          const subscription = (supabase as any)
            .from(table)
            .on('*', () => refresh())
            .subscribe();
          subscriptions.push(subscription);
        });
      }
    } catch (subscriptionError) {
      console.warn('No fue posible suscribir cambios en tiempo real:', subscriptionError);
    }

    return () => {
      subscriptions.forEach((subscription) => {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          }
          if (subscription && typeof (supabase as any).removeChannel === 'function') {
            (supabase as any).removeChannel(subscription);
          }
        } catch (cleanupError) {
          console.warn('Error cerrando suscripción de dashboard:', cleanupError);
        }
      });
    };
  }, [refresh]);

  const practiceStats = useMemo(() => {
    const byStatus = PRACTICE_STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<PracticeRecord['estado'], number>,
    );

    practices.forEach((practice) => {
      if (byStatus[practice.estado] === undefined) {
        byStatus[practice.estado] = 0;
      }
      byStatus[practice.estado] += 1;
    });

    return {
      total: practices.length,
      byStatus,
    };
  }, [practices]);

  const approvalsQueue = useMemo(() => {
    return practices
      .filter((practice) => practice.estado === 'Pendiente')
      .sort((a, b) => new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime())
      .slice(0, 8);
  }, [practices]);

  const upcomingPractices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return practices
      .filter((practice) => {
        if (!practice.fecha_inicio) return false;
        const start = new Date(practice.fecha_inicio);
        return !Number.isNaN(start.getTime()) && start.getTime() >= today.getTime();
      })
      .sort((a, b) => new Date(a.fecha_inicio ?? '').getTime() - new Date(b.fecha_inicio ?? '').getTime())
      .slice(0, 8);
  }, [practices]);

  const pendingStudents = useMemo(
    () => students.filter((student) => !isStudentProfileComplete(student)),
    [students],
  );

  const reportsPending = useMemo(
    () => informes.filter((informe) => informe.nota === null || informe.nota === undefined),
    [informes],
  );

  const reportsReviewed = useMemo(
    () => informes.filter((informe) => typeof informe.nota === 'number'),
    [informes],
  );

  const companyStats = useMemo(() => {
    const total = companies.length;
    const activos = companies.filter((company) => company.estado === 'activo').length;
    const enNegociacion = companies.filter((company) => company.estado === 'en_negociacion').length;
    const vencidos = companies.filter((company) => company.estado === 'vencido').length;
    const sinCupos = companies.filter((company) => company.cuposDisponibles <= 0).length;
    const conCupos = Math.max(total - sinCupos, 0);
    return { total, activos, enNegociacion, vencidos, sinCupos, conCupos };
  }, [companies]);

  const activityFeed = useMemo(() => {
    const items: ActivityItem[] = [];

    practices.forEach((practice) => {
      items.push({
        id: `practice-${practice.id}`,
        timestamp: practice.fecha_envio,
        title: `${practice.nombre_estudiante || 'Estudiante'} · ${practice.estado}`,
        description: practice.empresa
          ? `${practice.empresa}${practice.tipo_practica ? ` · ${practice.tipo_practica}` : ''}`
          : practice.tipo_practica ?? undefined,
        category: 'practica',
      });
      if (practice.fecha_inicio) {
        items.push({
          id: `practice-start-${practice.id}`,
          timestamp: practice.fecha_inicio,
          title: `${practice.nombre_estudiante || 'Estudiante'} inicia práctica`,
          description: practice.empresa ?? undefined,
          category: 'practica',
        });
      }
    });

    informes.forEach((informe) => {
      if (!informe.createdAt) return;
      items.push({
        id: `informe-${informe.id}`,
        timestamp: informe.createdAt,
        title: `${informe.nombre ?? 'Informe'} ${informe.nota == null ? 'requiere revisión' : 'evaluado'}`,
        description:
          informe.nota == null
            ? 'Pendiente de evaluación por coordinación'
            : `Nota registrada: ${informe.nota.toFixed(1)}`,
        category: 'informe',
      });
    });

    students.forEach((student) => {
      if (!student.createdAt) return;
      items.push({
        id: `student-${student.id}`,
        timestamp: student.createdAt,
        title: `${student.nombre} ${student.apellido}`.trim() || 'Nuevo estudiante',
        description: isStudentProfileComplete(student)
          ? 'Perfil completo'
          : 'Perfil incompleto: revisa los datos del estudiante',
        category: 'estudiante',
      });
    });

    return items
      .filter((item) => Boolean(item.timestamp))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);
  }, [practices, informes, students]);

  return {
    loading,
    error,
    refresh,
    students,
    informes,
    companies,
    practiceStats,
    approvalsQueue,
    upcomingPractices,
    pendingStudents,
    reportsPending,
    reportsReviewed,
    companyStats,
    activityFeed,
  };
}
