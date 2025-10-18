import { Alert, Box, Chip, Collapse } from '@mui/material';
import { useSessionMonitor } from '../hooks/useSessionMonitor';
import { useState } from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Componente de desarrollo para mostrar el estado de la sesión.
 * Solo se muestra en desarrollo y cuando el token está próximo a expirar.
 */
export const SessionStatusBadge = () => {
  const sessionStatus = useSessionMonitor(30000); // Check cada 30 segundos
  const [show, setShow] = useState(true);

  // Solo mostrar en desarrollo
  if (!import.meta.env.DEV) {
    return null;
  }

  // Solo mostrar si la sesión necesita refresh pronto
  if (!sessionStatus.needsRefresh || !show) {
    return null;
  }

  const minutes = sessionStatus.timeUntilExpiry 
    ? Math.floor(sessionStatus.timeUntilExpiry / 60)
    : 0;

  return (
    <Collapse in={show}>
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          maxWidth: 400,
        }}
      >
        <Alert
          severity="warning"
          onClose={() => setShow(false)}
          icon={<AccessTimeIcon />}
        >
          Tu sesión expirará en {minutes} minuto{minutes !== 1 ? 's' : ''}.
          {sessionStatus.needsRefresh && ' El token se refrescará automáticamente.'}
        </Alert>
      </Box>
    </Collapse>
  );
};

/**
 * Chip pequeño para mostrar el estado de la sesión en la esquina (más discreto)
 */
export const SessionStatusChip = () => {
  const sessionStatus = useSessionMonitor(60000); // Check cada 60 segundos

  // Solo mostrar en desarrollo
  if (!import.meta.env.DEV) {
    return null;
  }

  if (!sessionStatus.isValid) {
    return null;
  }

  const minutes = sessionStatus.timeUntilExpiry 
    ? Math.floor(sessionStatus.timeUntilExpiry / 60)
    : 0;

  const color = minutes < 5 ? 'error' : minutes < 15 ? 'warning' : 'success';

  return (
    <Chip
      icon={<AccessTimeIcon />}
      label={`Sesión: ${minutes}m`}
      color={color}
      size="small"
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
      }}
    />
  );
};
