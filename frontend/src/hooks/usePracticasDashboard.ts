import { useEffect, useMemo, useState } from 'react';
import type { PracticeRecord } from '../types/practica';
import { fetchPracticeRecords } from '../services/practiceDashboardService';
import { supabase } from '../services/supabaseClient';

interface ActivityEvent {
  id: string;
  message: string;
  timestamp: string;
  highlight?: 'create' | 'update' | 'delete';
}

const ESTADO_LABEL: Record<string, PracticeRecord['estado']> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  en_progreso: 'En progreso',
  completada: 'Completada',
  rechazada: 'Rechazada',
};

const mapEstado = (value?: string | null): PracticeRecord['estado'] => {
  if (!value) return 'Pendiente';
  return ESTADO_LABEL[value] ?? (value as PracticeRecord['estado']);
};

const buildFeedFromRecords = (items: PracticeRecord[]): ActivityEvent[] =>
  [...items]
    .sort(
      (a, b) => new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime(),
    )
    .slice(0, 8)
    .map((record) => ({
      id: record.id,
      message: `${record.nombre_estudiante || 'Estudiante'} actualizó su práctica a "${record.estado}"`,
      timestamp: record.fecha_envio,
      highlight: record.estado === 'Pendiente' ? 'create' : 'update',
    }));

const createActivityId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export function usePracticasDashboard() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof PracticeRecord>('fecha_envio');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const itemsPerPage = 10;

  const collator = useMemo(
    () => new Intl.Collator('es', { sensitivity: 'base', usage: 'sort' }),
    [],
  );

  const estadoOrder: PracticeRecord['estado'][] = useMemo(
    () => ['Pendiente', 'En progreso', 'Aprobada', 'Completada', 'Rechazada'],
    [],
  );

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setError(null);
        }
        const data = await fetchPracticeRecords();
        if (mounted) {
          setRecords(data);
          setActivityFeed((prev) => (prev.length === 0 ? buildFeedFromRecords(data) : prev));
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? 'No se pudo cargar la información de prácticas');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const pushActivityFromPayload = (payload: any) => {
      if (!payload || (!payload.new && !payload.old)) return;
      const raw = payload.new ?? payload.old ?? {};
      const estado = mapEstado(raw.estado);
      const nombre = `${raw.estudiante_nombre ?? ''} ${raw.estudiante_apellido ?? ''}`.trim();
      const hasName = nombre.length > 0;
      const baseMessage =
        payload.eventType === 'DELETE'
          ? `Se eliminó una práctica${hasName ? ` de ${nombre}` : ''}`
          : `Práctica${hasName ? ` de ${nombre}` : ''} marcada como "${estado}"`;

      const highlight: ActivityEvent['highlight'] =
        payload.eventType === 'INSERT'
          ? 'create'
          : payload.eventType === 'DELETE'
          ? 'delete'
          : 'update';

      const timestamp =
        payload.new?.updated_at ??
        payload.new?.created_at ??
        payload.old?.updated_at ??
        payload.old?.created_at ??
        new Date().toISOString();

      const id = payload.new?.id ?? payload.old?.id ?? createActivityId();

      setActivityFeed((prev) => {
        const next = prev.filter((item) => item.id !== id);
        next.unshift({
          id,
          message: baseMessage,
          timestamp,
          highlight,
        });
        return next.slice(0, 12);
      });
    };

    load();

    // Try to subscribe to realtime changes on the `practicas` table.
    // Use the modern `channel` API if available, otherwise fall back to the older `from(...).on(...)`.
    let subscription: any = null;
    try {
      if ((supabase as any).channel) {
        subscription = (supabase as any)
          .channel('public:practicas')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'practicas' },
            (payload: any) => {
              console.log('Realtime payload (practicas):', payload);
              load();
              pushActivityFromPayload(payload);
            },
          )
          .subscribe();
      } else if ((supabase as any).from) {
        subscription = (supabase as any)
          .from('practicas')
          .on('*', (payload: any) => {
            console.log('Realtime (legacy) payload (practicas):', payload);
            load();
            pushActivityFromPayload(payload);
          })
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime subscription failed:', e);
    }

    return () => {
      mounted = false;
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
        if (subscription && typeof (supabase as any).removeChannel === 'function') {
          (supabase as any).removeChannel(subscription);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, orderBy, orderDirection]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return records.filter((item) =>
      item.nombre_estudiante.toLowerCase().includes(term) ||
      item.rut.toLowerCase().includes(term) ||
      item.carrera.toLowerCase().includes(term),
    );
  }, [debouncedSearch, records]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      let comparison = 0;

      if (orderBy === 'fecha_envio') {
        comparison = new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
      } else if (orderBy === 'estado') {
        comparison =
          estadoOrder.indexOf(aVal as PracticeRecord['estado']) -
          estadoOrder.indexOf(bVal as PracticeRecord['estado']);
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = collator.compare(aVal, bVal);
      } else if (
        aVal !== null &&
        aVal !== undefined &&
        bVal !== null &&
        bVal !== undefined &&
        typeof aVal === 'number' &&
        typeof bVal === 'number'
      ) {
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
      }

      if (comparison === 0) {
        return 0;
      }

      return orderDirection === 'asc' ? comparison : -comparison;
    });
  }, [filtered, orderBy, orderDirection, collator, estadoOrder]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, page]);

  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, sorted.length);

  const handleApprove = (id: string) => {
    console.log(`Aprobar práctica ${id}`);
  };

  const handleReject = (id: string) => {
    console.log(`Rechazar práctica ${id}`);
  };

  const toggleSort = (field: keyof PracticeRecord) => {
    if (orderBy === field) {
      setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setOrderBy(field);
    setOrderDirection(field === 'fecha_envio' ? 'desc' : 'asc');
  };

  const pipeline = useMemo(() => {
    return records.reduce(
      (acc, item) => {
        acc[item.estado] = (acc[item.estado] ?? 0) + 1;
        return acc;
      },
      {
        Pendiente: 0,
        'En progreso': 0,
        Aprobada: 0,
        Completada: 0,
        Rechazada: 0,
      } as Record<PracticeRecord['estado'], number>,
    );
  }, [records]);

  const pendingQueue = useMemo(() => {
    const requiresCoordinator = (record: PracticeRecord) => {
      const normalized = (record.estadoOriginal ?? record.estado ?? '').toLowerCase();
      if (record.estado === 'Pendiente') {
        return true;
      }

      const normalizedClean = normalized
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      return (
        normalizedClean === 'pendiente' ||
        normalizedClean === 'en_revision' ||
        normalizedClean === 'pendiente_revision' ||
        normalizedClean === 'pendiente_coordinador' ||
        normalizedClean === 'pendiente_aprobacion' ||
        normalizedClean.includes('pendiente') ||
        normalizedClean.includes('revision') ||
        normalizedClean.includes('por_aprobar')
      );
    };

    return records
      .filter(requiresCoordinator)
      .sort(
        (a, b) => new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime(),
      )
      .slice(0, 6);
  }, [records]);

  const upcomingPractices = useMemo(() => {
    return records
      .filter((item) => item.fecha_inicio)
      .sort(
        (a, b) =>
          new Date(a.fecha_inicio ?? 0).getTime() - new Date(b.fecha_inicio ?? 0).getTime(),
      )
      .slice(0, 6);
  }, [records]);

  return {
    search,
    setSearch,
    orderBy,
    orderDirection,
    toggleSort,
    page,
    setPage,
    totalPages,
    paginated,
    startIdx,
    endIdx,
    totalItems: sorted.length,
    handleApprove,
    handleReject,
    loading,
    error,
    records,
    pipeline,
    pendingQueue,
    upcomingPractices,
    activityFeed,
  };
}
