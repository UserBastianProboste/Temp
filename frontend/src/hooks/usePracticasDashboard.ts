import { useEffect, useMemo, useState } from 'react';
import type { PracticeRecord } from '../types/practica';
import { fetchPracticeRecords } from '../services/practiceDashboardService';
import { supabase } from '../services/supabaseClient';

type RealtimeSubscription = {
  unsubscribe?: () => void;
};

export function usePracticasDashboard() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof PracticeRecord>('fecha_envio');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  const collator = useMemo(
    () => new Intl.Collator('es', { sensitivity: 'base', usage: 'sort' }),
    []
  );
  const estadoOrder: PracticeRecord['estado'][] = useMemo(
    () => ['Pendiente', 'En progreso', 'Aprobada', 'Completada', 'Rechazada'],
    []
  );

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) setLoading(true);
      try {
        const data = await fetchPracticeRecords();
        if (mounted) setRecords(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    // Try to subscribe to realtime changes on the `practicas` table.
    // Use the modern `channel` API if available, otherwise fall back to the older `from(...).on(...)`.
    let subscription: RealtimeSubscription | null = null;
    try {
      const clientWithChannel = supabase as unknown as {
        channel?: (
          name: string
        ) => {
          on: (
            _event: string,
            _filter: { event: string; schema: string; table: string },
            callback: (payload: Record<string, unknown>) => void
          ) => RealtimeSubscription;
          subscribe: () => RealtimeSubscription;
        };
        removeChannel?: (channel: RealtimeSubscription) => void;
      };

      if (typeof clientWithChannel.channel === 'function') {
        const channel = clientWithChannel
          .channel('public:practicas')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'practicas' }, (payload) => {
            console.log('Realtime payload (practicas):', payload);
            load();
          });
        subscription = channel.subscribe();
      } else {
        const clientWithFrom = supabase as unknown as {
          from?: (
            table: string
          ) => {
            on: (
              _event: string,
              callback: (payload: Record<string, unknown>) => void
            ) => RealtimeSubscription & { subscribe?: () => RealtimeSubscription };
          };
        };

        if (typeof clientWithFrom.from === 'function') {
          const legacyChannel = clientWithFrom
            .from('practicas')
            .on('*', (payload) => {
              console.log('Realtime (legacy) payload (practicas):', payload);
              load();
            });
          subscription = typeof legacyChannel.subscribe === 'function'
            ? legacyChannel.subscribe()
            : legacyChannel;
        }
      }
    } catch (error) {
      console.warn('Realtime subscription failed:', error);
    }

    return () => {
      mounted = false;
      try {
        if (subscription?.unsubscribe) subscription.unsubscribe();
        const maybeRemove = (supabase as unknown as { removeChannel?: (channel: RealtimeSubscription) => void }).removeChannel;
        if (subscription && typeof maybeRemove === 'function') {
          maybeRemove(subscription);
        }
      } catch (error) {
        // ignore
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
      item.carrera.toLowerCase().includes(term)
    );
  }, [debouncedSearch, records]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      let comparison = 0;

      if (orderBy === 'fecha_envio') {
        comparison =
          new Date(aVal as string).getTime() -
          new Date(bVal as string).getTime();
      } else if (orderBy === 'estado') {
        comparison =
          estadoOrder.indexOf(aVal as PracticeRecord['estado']) -
          estadoOrder.indexOf(bVal as PracticeRecord['estado']);
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = collator.compare(aVal, bVal);
      } else {
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

  const statusCounts = useMemo(
    () =>
      records.reduce(
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
        } as Record<PracticeRecord['estado'], number>
      ),
    [records]
  );

  const pendingQueue = useMemo(
    () =>
      sorted
        .filter((item) => item.estado === 'Pendiente')
        .sort(
          (a, b) =>
            new Date(a.fecha_envio).getTime() -
            new Date(b.fecha_envio).getTime()
        ),
    [sorted]
  );

  const upcomingPractices = useMemo(() => {
    return sorted
      .filter((item) => item.fecha_inicio)
      .sort(
        (a, b) =>
          new Date(a.fecha_inicio ?? a.fecha_envio).getTime() -
          new Date(b.fecha_inicio ?? b.fecha_envio).getTime()
      );
  }, [sorted]);

  const recentActivity = useMemo(() => {
    return [...records]
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? b.fecha_envio).getTime() -
          new Date(a.updated_at ?? a.fecha_envio).getTime()
      )
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        timestamp: item.updated_at ?? item.fecha_envio,
        estado: item.estado,
        nombre: item.nombre_estudiante,
      }));
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
    records,
    sorted,
    statusCounts,
    pendingQueue,
    upcomingPractices,
    recentActivity,
  };
}