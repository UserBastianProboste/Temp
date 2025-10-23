import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeRecord } from '../types/practica';
import { fetchPracticeRecords } from '../services/practiceDashboardService';
import { supabase } from '../services/supabaseClient';

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
    [],
  );
  const estadoOrder: PracticeRecord['estado'][] = useMemo(
    () => ['Pendiente', 'En progreso', 'Aprobada', 'Completada', 'Rechazada'],
    []
  );

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const isMountedRef = useRef(true);

  const loadRecords = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await fetchPracticeRecords();
        if (isMountedRef.current) {
          setRecords(data);
        }
      } catch (error) {
        console.warn('No fue posible cargar prácticas del dashboard:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    loadRecords();

    // Try to subscribe to realtime changes on the `practicas` table.
    // Use the modern `channel` API if available, otherwise fall back to the older `from(...).on(...)`.
    let subscription: any = null;
    try {
      if ((supabase as any).channel) {
        subscription = (supabase as any)
          .channel('public:practicas')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'practicas' }, (payload: any) => {
            console.log('Realtime payload (practicas):', payload);
            // Simple strategy: reload full list on any change
            loadRecords(true);
          })
          .subscribe();
      } else if ((supabase as any).from) {
        // older API
        subscription = (supabase as any)
          .from('practicas')
          .on('*', (payload: any) => {
            console.log('Realtime (legacy) payload (practicas):', payload);
            loadRecords(true);
          })
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime subscription failed:', e);
    }

    return () => {
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
        if (subscription && typeof (supabase as any).removeChannel === 'function') {
          // some SDKs use removeChannel
          (supabase as any).removeChannel(subscription);
        }
      } catch (e) {
        // ignore
      }
    };
  }, [loadRecords]);

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


  const refresh = useCallback(() => loadRecords(false), [loadRecords]);

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
    records,
    loading,
    refresh,
  };
}