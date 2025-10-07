import { Chip } from '@mui/material';
import type { PracticeRecord } from '../../types/practica';

interface Props {
  estado: PracticeRecord['estado'];
}

export function StateBadge({ estado }: Props) {
  const color =
    estado === 'Pendiente'
      ? 'warning'
      : estado === 'Aprobada'
      ? 'success'
      : estado === 'En progreso'
      ? 'info'
      : 'default';
  return <Chip label={estado} color={color} size="small" />;
}