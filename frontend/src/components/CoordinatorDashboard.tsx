import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Fab,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TimelineIcon from '@mui/icons-material/Timeline';
import DescriptionIcon from '@mui/icons-material/Description';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import UpdateIcon from '@mui/icons-material/Update';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CircleIcon from '@mui/icons-material/Circle';
import { usePracticasDashboard } from '../hooks/usePracticasDashboard';
import { PracticeFilters } from './Practices/PracticeFilters';
import { PracticeList } from './Practices/PracticeList';
import { PracticePagination } from './Practices/PracticePagination';
import { useCoordinatorInsights } from '../hooks/useCoordinatorInsights';
import type { PracticeRecord } from '../types/practica';

interface WidgetDefinition {
  id: WidgetId;
  title: string;
  grid: { xs: number; md?: number; lg?: number; xl?: number };
}

type WidgetId =
  | 'pending-students'
  | 'practice-pipeline'
  | 'approvals-queue'
  | 'upcoming-calendar'
  | 'reports-tracker'
  | 'company-health'
  | 'activity-feed';

const WIDGETS: WidgetDefinition[] = [
  { id: 'pending-students', title: 'Perfiles pendientes', grid: { xs: 12, md: 6, xl: 4 } },
  { id: 'practice-pipeline', title: 'Estado de prácticas', grid: { xs: 12, md: 6, xl: 4 } },
  { id: 'approvals-queue', title: 'Prácticas por aprobar', grid: { xs: 12, xl: 8 } },
  { id: 'upcoming-calendar', title: 'Próximos hitos', grid: { xs: 12, md: 6, xl: 4 } },
  { id: 'reports-tracker', title: 'Seguimiento de informes', grid: { xs: 12, md: 6, xl: 4 } },
  { id: 'company-health', title: 'Salud de empresas colaboradoras', grid: { xs: 12, md: 6, xl: 4 } },
  { id: 'activity-feed', title: 'Últimas novedades', grid: { xs: 12, md: 6, xl: 4 } },
];

const formatDate = (date?: string | null) => {
  if (!date) return 'Sin fecha';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  } catch (error) {
    return 'Fecha no disponible';
  }
};

const formatDateTime = (date: string) => {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch (error) {
    return date;
  }
};

const getActivityIcon = (highlight?: 'create' | 'update' | 'delete') => {
  if (highlight === 'create') return <AddCircleOutlineIcon color="success" fontSize="small" />;
  if (highlight === 'delete') return <DeleteOutlineIcon color="error" fontSize="small" />;
  return <UpdateIcon color="primary" fontSize="small" />;
};

export default function CoordinatorDashboard() {
  const practice = usePracticasDashboard();
  const insights = useCoordinatorInsights();
  const [isEditing, setIsEditing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => WIDGETS.map((widget) => widget.id));
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([]);

  const range = useMemo(() => {
    if (practice.totalItems === 0) return '0–0 de 0';
    return `${practice.startIdx + 1}–${practice.endIdx} de ${practice.totalItems}`;
  }, [practice.endIdx, practice.startIdx, practice.totalItems]);

  const widgetMap = useMemo(() => {
    return WIDGETS.reduce<Record<WidgetId, WidgetDefinition>>((acc, widget) => {
      acc[widget.id] = widget;
      return acc;
    }, {} as Record<WidgetId, WidgetDefinition>);
  }, []);

  const orderedWidgets = widgetOrder.filter((id) => (isEditing ? true : !hiddenWidgets.includes(id)));

  const moveWidget = (id: WidgetId, direction: 'up' | 'down') => {
    setWidgetOrder((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const newOrder = [...prev];
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= newOrder.length) return prev;
      [newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]];
      return newOrder;
    });
  };

  const toggleVisibility = (id: WidgetId) => {
    setHiddenWidgets((prev) => (prev.includes(id) ? prev.filter((widgetId) => widgetId !== id) : [...prev, id]));
  };

  const renderPendingStudents = () => {
    if (insights.loading && insights.pendingStudentsPreview.length === 0) {
      return <LinearProgress />;
    }

    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="h2" component="p" fontWeight={700}>
            {insights.pendingStudentsCount}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Estudiantes con datos pendientes de completar
          </Typography>
        </Box>
        <Divider />
        <Stack spacing={2}>
          {insights.pendingStudentsPreview.length > 0 ? (
            insights.pendingStudentsPreview.map((student) => (
              <Box key={student.id}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {student.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.carrera}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                  {student.missingFields.map((field) => (
                    <Chip key={field} size="small" color="warning" variant="outlined" label={field} />
                  ))}
                </Stack>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Todos los perfiles de estudiantes están completos. ¡Excelente!
            </Typography>
          )}
        </Stack>
      </Stack>
    );
  };

  const renderPracticePipeline = () => {
    const entries = Object.entries(practice.pipeline) as Array<[
      PracticeRecord['estado'],
      number,
    ]>;
    const total = practice.records.length;

    return (
      <Stack spacing={2}>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Estado general de {total} prácticas registradas
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(auto-fit, minmax(140px, 1fr))',
            },
            gap: 2,
            justifyItems: 'center',
          }}
        >
          {entries.map(([estado, value]) => (
            <Box
              key={estado}
              sx={{
                borderRadius: 2,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.default',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                minWidth: 140,
                width: '100%',
              }}
            >
              <Typography variant="h4" component="p" fontWeight={700}>
                {value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {estado}
              </Typography>
            </Box>
          ))}
        </Box>
      </Stack>
    );
  };

  const renderApprovalsQueue = () => {
    return (
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="h3" component="p" fontWeight={700}>
              {practice.pendingQueue.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prácticas esperando revisión
            </Typography>
          </Box>
          {practice.loading && <LinearProgress sx={{ flexGrow: 1, minWidth: 120 }} />}
        </Stack>
        <Stack spacing={2}>
          {practice.pendingQueue.length > 0 ? (
            practice.pendingQueue.map((record) => (
              <Box
                key={record.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {record.nombre_estudiante || 'Estudiante sin nombre'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enviada el {formatDate(record.fecha_envio)} · {record.carrera || 'Carrera no especificada'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" onClick={() => practice.handleApprove(record.id)}>
                    Aprobar
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => practice.handleReject(record.id)}>
                    Solicitar ajustes
                  </Button>
                </Stack>
              </Box>
            ))
          ) : (
            <Stack direction="row" spacing={2} alignItems="center" color="text.secondary">
              <PendingActionsIcon />
              <Typography>No hay prácticas pendientes de aprobación.</Typography>
            </Stack>
          )}
        </Stack>
        <Divider />
        <Box>
          <Typography variant="h6" component="h3" gutterBottom>
            Explorar todas las prácticas
          </Typography>
          {practice.error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {practice.error}
            </Alert>
          )}
          <PracticeFilters search={practice.search} onSearchChange={practice.setSearch} />
          <PracticeList
            records={practice.paginated}
            orderBy={practice.orderBy}
            orderDirection={practice.orderDirection}
            onToggleSort={practice.toggleSort}
            onApprove={practice.handleApprove}
            onReject={practice.handleReject}
          />
          <PracticePagination page={practice.page} totalPages={practice.totalPages} onChange={practice.setPage} range={range} />
        </Box>
      </Stack>
    );
  };

  const renderUpcomingCalendar = () => {
    if (practice.upcomingPractices.length === 0) {
      return (
        <Stack spacing={1} alignItems="center" textAlign="center" color="text.secondary">
          <TimelineIcon />
          <Typography variant="body2">Aún no hay prácticas con fechas agendadas.</Typography>
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        {practice.upcomingPractices.map((record) => (
          <Box key={record.id} sx={{ display: 'flex', gap: 2 }}>
            <CircleIcon sx={{ fontSize: 12, mt: 0.7 }} color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {record.nombre_estudiante || 'Estudiante sin nombre'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inicio {formatDate(record.fecha_inicio)} · Término {formatDate(record.fecha_termino)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {record.empresa ? `Empresa: ${record.empresa}` : 'Empresa por confirmar'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    );
  };

  const renderReportsTracker = () => {
    const { reportsSummary } = insights;
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="h4" component="p" fontWeight={700}>
              {reportsSummary.pendingReview}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Informes por revisar
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="p" fontWeight={700}>
              {reportsSummary.graded}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Informes evaluados
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="p" fontWeight={700}>
              {reportsSummary.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total recibidos
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <Stack spacing={1.5}>
          {reportsSummary.recent.length > 0 ? (
            reportsSummary.recent.map((report) => (
              <Box key={report.id}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {report.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {report.studentName} · {formatDate(report.createdAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {report.tipo ?? 'Tipo no registrado'} · {report.nota === null ? 'Pendiente de nota' : `Nota ${report.nota}`}
                </Typography>
              </Box>
            ))
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
              <DescriptionIcon fontSize="small" />
              <Typography variant="body2">Aún no se han recibido informes.</Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    );
  };

  const renderCompanyHealth = () => {
    const { companySummary } = insights;
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="h4" component="p" fontWeight={700}>
              {companySummary.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Empresas activas en la red
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="p" fontWeight={700}>
              {companySummary.withSlots}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Con cupos disponibles
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="p" fontWeight={700}>
              {companySummary.withoutSlots}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sin cupos
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <Stack spacing={1}>
          {companySummary.byStatus.map((status) => (
            <Stack key={status.label} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {status.label}
              </Typography>
              <Chip label={status.value} size="small" color="primary" variant="outlined" />
            </Stack>
          ))}
        </Stack>
        <Divider />
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Recomendaciones
          </Typography>
          <Stack spacing={1.5}>
            {companySummary.needsAttention.length > 0 ? (
              companySummary.needsAttention.map((empresa) => (
                <Stack key={empresa.id} direction="row" spacing={1} alignItems="center">
                  <BusinessCenterIcon fontSize="small" color="warning" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {empresa.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {empresa.estado} · {empresa.cuposDisponibles} cupos disponibles
                    </Typography>
                  </Box>
                </Stack>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay empresas que requieran acción inmediata.
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    );
  };

  const renderActivityFeed = () => {
    if (practice.activityFeed.length === 0) {
      return (
        <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
          <UpdateIcon fontSize="small" />
          <Typography variant="body2">Aún no hay actividad reciente.</Typography>
        </Stack>
      );
    }

    return (
      <List disablePadding>
        {practice.activityFeed.map((event) => (
          <ListItem key={event.id} disableGutters sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>{getActivityIcon(event.highlight)}</ListItemIcon>
            <ListItemText
              primary={event.message}
              secondary={formatDateTime(event.timestamp)}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderWidgetContent = (id: WidgetId) => {
    switch (id) {
      case 'pending-students':
        return renderPendingStudents();
      case 'practice-pipeline':
        return renderPracticePipeline();
      case 'approvals-queue':
        return renderApprovalsQueue();
      case 'upcoming-calendar':
        return renderUpcomingCalendar();
      case 'reports-tracker':
        return renderReportsTracker();
      case 'company-health':
        return renderCompanyHealth();
      case 'activity-feed':
        return renderActivityFeed();
      default:
        return null;
    }
  };

  const getColumnSpan = (
    widget: WidgetDefinition,
    breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  ) => {
    const directValue = widget.grid[breakpoint as keyof WidgetDefinition['grid']];
    if (typeof directValue === 'number') {
      return directValue;
    }
    if (breakpoint === 'xl') {
      return widget.grid.xl ?? widget.grid.lg ?? widget.grid.md ?? widget.grid.xs ?? 12;
    }
    if (breakpoint === 'lg') {
      return widget.grid.lg ?? widget.grid.md ?? widget.grid.xs ?? 12;
    }
    if (breakpoint === 'md') {
      return widget.grid.md ?? widget.grid.xs ?? 12;
    }
    return widget.grid.xs ?? 12;
  };

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gridAutoFlow: 'row dense',
        }}
      >
        {orderedWidgets.map((id) => {
          const widget = widgetMap[id];
          const isHidden = hiddenWidgets.includes(id);
          if (!widget) return null;

          const columnSpan = {
            xs: `span ${Math.min(getColumnSpan(widget, 'xs'), 12)}`,
            md: `span ${Math.min(getColumnSpan(widget, 'md'), 12)}`,
            lg: `span ${Math.min(getColumnSpan(widget, 'lg'), 12)}`,
            xl: `span ${Math.min(getColumnSpan(widget, 'xl'), 12)}`,
          } as const;

          return (
            <Box
              key={id}
              sx={{
                gridColumn: columnSpan,
                minWidth: 0,
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  opacity: isHidden && isEditing ? 0.5 : 1,
                  borderStyle: isHidden && isEditing ? 'dashed' : 'solid',
                  transition: 'opacity 0.2s ease',
                }}
              >
                <CardHeader
                  title={widget.title}
                  action={
                    isEditing ? (
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Mover arriba">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => moveWidget(id, 'up')}
                              disabled={widgetOrder.indexOf(id) === 0}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Mover abajo">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => moveWidget(id, 'down')}
                              disabled={widgetOrder.indexOf(id) === widgetOrder.length - 1}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={isHidden ? 'Mostrar widget' : 'Ocultar widget'}>
                          <IconButton size="small" onClick={() => toggleVisibility(id)}>
                            {isHidden ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : undefined
                  }
                />
                <CardContent>
                  {isHidden && isEditing ? (
                    <Typography variant="body2" color="text.secondary">
                      Este widget está oculto. Actívalo para volver a mostrarlo.
                    </Typography>
                  ) : (
                    renderWidgetContent(id)
                  )}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      <Fab
        color={isEditing ? 'secondary' : 'primary'}
        aria-label="Editar widgets"
        onClick={() => setIsEditing((prev) => !prev)}
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
      >
        <EditIcon />
      </Fab>
    </Box>
  );
}
