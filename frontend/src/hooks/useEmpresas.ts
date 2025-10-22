import { useCallback, useEffect, useMemo, useState } from 'react';
import { empresaService } from '../services/empresaService';
import type { Empresa } from '../types/database';

export type ConvenioEstado = 'activo' | 'en_negociacion' | 'vencido';

export interface EmpresaWithMetadata extends Empresa {
  estado_convenio?: ConvenioEstado | null;
  ubicacion?: string | null;
  cupos_disponibles?: number | null;
  ultimo_contacto?: string | null;
}

interface UseEmpresasState {
  empresas: EmpresaWithMetadata[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setEmpresas: React.Dispatch<React.SetStateAction<EmpresaWithMetadata[]>>;
}

const normalizeEmpresas = (data: Empresa[] | null): EmpresaWithMetadata[] => {
  if (!data) return [];
  return data.map((empresa) => ({
    ...empresa,
    estado_convenio: empresa.estado_convenio ?? null,
    ubicacion: empresa.ubicacion ?? null,
    cupos_disponibles: empresa.cupos_disponibles ?? null,
    ultimo_contacto: empresa.ultimo_contacto ?? null,
  }));
};

export const useEmpresas = (): UseEmpresasState => {
  const [empresas, setEmpresas] = useState<EmpresaWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    const { data, error: serviceError } = await empresaService.getAll();
    if (serviceError) {
      setError(serviceError.message ?? 'No fue posible obtener las empresas.');
      setEmpresas([]);
    } else {
      setError(null);
      setEmpresas(normalizeEmpresas(data ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchEmpresas();
  }, [fetchEmpresas]);

  const refresh = useCallback(async () => {
    await fetchEmpresas();
  }, [fetchEmpresas]);

  return useMemo(
    () => ({ empresas, loading, error, refresh, setEmpresas }),
    [empresas, error, loading, refresh]
  );
};

export const estadoLabels: Record<ConvenioEstado, string> = {
  activo: 'Activo',
  en_negociacion: 'En negociación',
  vencido: 'Vencido',
};
