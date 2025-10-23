import { useMemo, useState, type ReactNode } from 'react';
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
  Fade,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BusinessIcon from '@mui/icons-material/Business';
import ArticleIcon from '@mui/icons-material/Article';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Link as RouterLink } from 'react-router-dom';
import { usePracticasDashboard } from '../hooks/usePracticasDashboard';
import { useCoordinatorSummary } from '../hooks/useCoordinatorSummary';
import type { PracticeRecord } from '../types/practica';

const DASHBOARD_STORAGE_KEY = 'coordinator-dashboard-layout-v1';

const STATUS_METADATA: Record<PracticeRecord['estado'], { label: string; color: 'default' | 'primary' | 'success' | 'info' | 'warning' | 'error' }> = {
  Pendiente: { label: 'Pendiente', color: 'warning' },
  'En progreso': { label: 'En progreso', color: 'info' },
  Aprobada: { label: 'Aprobada', color: 'success' },
  Completada: { label: 'Completada', color: 'default' },
  Rechazada: { label: 'Rechazada', color: 'error' },
};

const ACTIVITY_LABELS = {
  practica: 'Práctica',
  informe: 'Informe',
  estudiante: 'Estudiante',
} as const;

type WidgetId =
  | 'pendingStudents'
  | 'practiceSnapshot'
  | 'approvalsQueue'
  | 'upcomingPractices'
  | 'reportTracker'
  | 'companyHealth'
  | 'activityFeed';

const ALL_WIDGETS: WidgetId[] = [
  'pendingStudents',
  'practiceSnapshot',
  'approvalsQueue',
  'upcomingPractices',
  'reportTracker',
  'companyHealth',
  'activityFeed',
];

type DashboardLayoutState = {
  order: WidgetId[];
  hidden: WidgetId[];
};

const DEFAULT_LAYOUT_STATE: DashboardLayoutState = {
  order: [...ALL_WIDGETS],
  hidden: [],
};

const widgetConfig: Record<WidgetId, { title: string; icon: ReactNode; grid: { xs: number; md: number; lg?: number } }> = {
  pendingStudents: {
    title: 'Perfiles pendientes',
    icon: <TimelineIcon fontSize="small" />, // reuse icon for a subtle accent
    grid: { xs: 12, md: 6, lg: 4 },
  },
  practiceSnapshot: {
    title: 'Estado de prácticas',
    icon: <TimelineIcon fontSize="small" />,
    grid: { xs: 12, md: 6, lg: 4 },
  },
  approvalsQueue: {
    title: 'Solicitudes por aprobar',
    icon: <CheckCircleOutlineIcon fontSize="small" />, 
    grid: { xs: 12, md: 12, lg: 8 },
  },
  upcomingPractices: {
    title: 'Próximos inicios',
    icon: <CalendarTodayIcon fontSize="small" />, 
    grid: { xs: 12, md: 6, lg: 4 },
  },
  reportTracker: {
    title: 'Informes de estudiantes',
    icon: <ArticleIcon fontSize="small" />, 
    grid: { xs: 12, md: 6, lg: 4 },
  },
  companyHealth: {
    title: 'Convenios con empresas',
    icon: <BusinessIcon fontSize="small" />, 
    grid: { xs: 12, md: 6, lg: 4 },
  },
  activityFeed: {
    title: 'Actividad reciente',
    icon: <TimelineIcon fontSize="small" />, 
    grid: { xs: 12, md: 12, lg: 8 },
  },
};

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const getInitialLayout = (): DashboardLayoutState => {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT_STATE;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT_STATE;
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState> | null;
    const storedOrder = Array.isArray(parsed?.order)
      ? (parsed!.order.filter((id): id is WidgetId => ALL_WIDGETS.includes(id as WidgetId)))
      : [];
    const storedHidden = Array.isArray(parsed?.hidden)
      ? (parsed!.hidden.filter((id): id is WidgetId => ALL_WIDGETS.includes(id as WidgetId)))
      : [];
    const order = [...storedOrder];
    ALL_WIDGETS.forEach((id) => {
      if (!order.includes(id)) order.push(id);
    });
    const hidden = storedHidden.filter((id) => order.includes(id));
    return { order, hidden };
  } catch (error) {
    console.warn('No fue posible leer el layout del dashboard:', error);
    return DEFAULT_LAYOUT_STATE;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return dateTimeFormatter.format(new Date(value));
  } catch {
    return value;
  }
};

export default function CoordinatorDashboard() {
  const {
    records: practiceRecords,
    handleApprove,
    handleReject,
    loading: practicesLoading,
    refresh: refreshPractices,
  } = usePracticasDashboard();

  const summary = useCoordinatorSummary(practiceRecords);

  const [editMode, setEditMode] = useState(false);
  const initialLayout = useMemo(() => getInitialLayout(), []);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(initialLayout.order);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(initialLayout.hidden);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const pendingStudentsPreview = useMemo(
    () => summary.pendingStudents.slice(0, 5),
    [summary.pendingStudents],
  );
  const approvalsQueue = summary.approvalsQueue;
  const upcomingPractices = summary.upcomingPractices;
  const reportsPendingPreview = useMemo(
    () => summary.reportsPending.slice(0, 5),
    [summary.reportsPending],
  );
  const activityFeed = summary.activityFeed;

  const dashboardLoading = practicesLoading || summary.loading || manualRefreshing;

  const visibleWidgets = useMemo(
    () => widgetOrder.filter((id) => !hiddenWidgets.includes(id)),
    [widgetOrder, hiddenWidgets],
  );

  const persistLayout = (order: WidgetId[], hidden: WidgetId[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ order, hidden }),
    );
  };

  const handleMoveWidget = (id: WidgetId, direction: 'up' | 'down') => {
    const currentIndex = widgetOrder.indexOf(id);
    if (currentIndex === -1) return;
    let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    while (
      targetIndex >= 0 &&
      targetIndex < widgetOrder.length &&
      hiddenWidgets.includes(widgetOrder[targetIndex])
    ) {
      targetIndex = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
    }
    if (targetIndex < 0 || targetIndex >= widgetOrder.length) return;
    const nextOrder = [...widgetOrder];
    const [removed] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, removed);
    setWidgetOrder(nextOrder);
    persistLayout(nextOrder, hiddenWidgets);
  };

  const handleHideWidget = (id: WidgetId) => {
    if (hiddenWidgets.includes(id)) return;
    const nextHidden = [...hiddenWidgets, id];
    setHiddenWidgets(nextHidden);
    persistLayout(widgetOrder, nextHidden);
  };

  const handleShowWidget = (id: WidgetId) => {
    if (!hiddenWidgets.includes(id)) return;
    const nextHidden = hiddenWidgets.filter((hiddenId) => hiddenId !== id);
    setHiddenWidgets(nextHidden);
    persistLayout(widgetOrder, nextHidden);
  };

  const handleToggleEditMode = () => {
    setEditMode((prev) => !prev);
  };

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refreshPractices(), summary.refresh()]);
    } finally {
      setManualRefreshing(false);
    }
  };

  const isWidgetFirstVisible = (id: WidgetId) => {
    const idx = widgetOrder.indexOf(id);
    if (idx <= 0) return true;
    return !widgetOrder.slice(0, idx).some((other) => !hiddenWidgets.includes(other));
  };

  const isWidgetLastVisible = (id: WidgetId) => {
    const idx = widgetOrder.indexOf(id);
    if (idx === -1 || idx >= widgetOrder.length - 1) return true;
    return !widgetOrder.slice(idx + 1).some((other) => !hiddenWidgets.includes(other));
  };

  const renderPendingStudents = () => (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h3">{summary.pendingStudents.length}</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          estudiantes por completar perfil
        </Typography>
      </Stack>
      <Divider />
      {pendingStudentsPreview.length > 0 ? (
        <List disablePadding>
          {pendingStudentsPreview.map((student) => (
            <ListItem key={student.id} disableGutters sx={{ py: 0.75 }}>
              <ListItemText
                primary={`${student.nombre} ${student.apellido}`.trim() || 'Estudiante sin nombre'}
                secondary={student.carrera || 'Carrera no asignada'}
              />
              <Chip label={`Sem ${student.semestre ?? '—'}`} size="small" color="warning" />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          ¡Excelente! Todos los perfiles tienen la información necesaria.
        </Typography>
      )}
      <Box>
        <Button
          component={RouterLink}
          to="/coordinador/estudiantes"
          variant="outlined"
          size="small"
        >
          Gestionar estudiantes
        </Button>
      </Box>
    </Stack>
  );

  const renderPracticeSnapshot = () => (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h3">{summary.practiceStats.total}</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          prácticas activas
        </Typography>
      </Stack>
      <Divider />
      <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
        {Object.entries(summary.practiceStats.byStatus).map(([status, count]) => {
          const metadata = STATUS_METADATA[status as PracticeRecord['estado']];
          return (
            <Chip
              key={status}
              label={`${metadata.label}: ${count}`}
              color={metadata.color}
              variant={metadata.color === 'default' ? 'outlined' : 'filled'}
            />
          );
        })}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Esta vista se actualiza automáticamente cuando llega una nueva solicitud o cambia el estado de una práctica.
      </Typography>
    </Stack>
  );

  const renderApprovalsQueue = () => (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary">
        Prioriza las prácticas que esperan tu decisión. Usa los accesos directos para registrar la resolución.
      </Typography>
      <Divider />
      {approvalsQueue.length > 0 ? (
        <List disablePadding>
          {approvalsQueue.map((practice) => (
            <ListItem
              key={practice.id}
              disableGutters
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Aprobar práctica">
                    <IconButton color="success" onClick={() => handleApprove(practice.id)}>
                      <CheckCircleOutlineIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Solicitar ajustes">
                    <IconButton color="error" onClick={() => handleReject(practice.id)}>
                      <CancelOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
              sx={{ py: 1 }}
            >
              <ListItemText
                primary={`${practice.nombre_estudiante || 'Estudiante'} · ${practice.tipo_practica ?? 'Práctica'}`}
                secondary={`Enviada el ${formatDate(practice.fecha_envio)}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No hay solicitudes pendientes de aprobación en este momento.
        </Typography>
      )}
      <Box>
        <Button
          component={RouterLink}
          to="/coordinador/practicas"
          variant="outlined"
          size="small"
        >
          Abrir módulo de prácticas
        </Button>
      </Box>
    </Stack>
  );

  const renderUpcomingPractices = () => (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Fechas de inicio confirmadas para acompañar la inducción con las empresas.
      </Typography>
      <Divider />
      {upcomingPractices.length > 0 ? (
        <List disablePadding>
          {upcomingPractices.map((practice) => (
            <ListItem key={practice.id} disableGutters sx={{ py: 0.75 }}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">{formatDate(practice.fecha_inicio)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {practice.nombre_estudiante || 'Estudiante'} · {practice.empresa ?? 'Empresa por confirmar'}
                </Typography>
              </Stack>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Aún no hay prácticas con fecha de inicio próxima registrada.
        </Typography>
      )}
    </Stack>
  );

  const renderReportTracker = () => (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <Chip color="warning" label={`Pendientes: ${summary.reportsPending.length}`} />
        <Chip color="success" variant="outlined" label={`Evaluados: ${summary.reportsReviewed.length}`} />
      </Stack>
      <Divider />
      {reportsPendingPreview.length > 0 ? (
        <List disablePadding>
          {reportsPendingPreview.map((report) => (
            <ListItem key={report.id} disableGutters sx={{ py: 0.75 }}>
              <ListItemText
                primary={report.nombre ?? 'Informe sin nombre'}
                secondary={`Subido el ${formatDate(report.createdAt)}${report.tipoPractica ? ` · ${report.tipoPractica}` : ''}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Ningún informe requiere evaluación inmediata.
        </Typography>
      )}
      <Box>
        <Button
          component={RouterLink}
          to="/coordinador/informes-estudiante"
          variant="outlined"
          size="small"
        >
          Revisar informes
        </Button>
      </Box>
    </Stack>
  );

  const renderCompanyHealth = () => (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <Chip color="success" label={`Activos: ${summary.companyStats.activos}`} />
        <Chip color="warning" label={`En negociación: ${summary.companyStats.enNegociacion}`} />
        <Chip color="error" label={`Vencidos: ${summary.companyStats.vencidos}`} />
      </Stack>
      <Divider />
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          Cupos disponibles en convenios activos: {summary.companyStats.conCupos}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Convenios sin cupos disponibles: {summary.companyStats.sinCupos}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total de empresas monitoreadas: {summary.companyStats.total}
        </Typography>
      </Stack>
      <Box>
        <Button
          component={RouterLink}
          to="/coordinador/empresas"
          variant="outlined"
          size="small"
        >
          Gestionar convenios
        </Button>
      </Box>
    </Stack>
  );

  const renderActivityFeed = () => (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Resumen de las últimas novedades en estudiantes, informes y prácticas.
      </Typography>
      <Divider />
      {activityFeed.length > 0 ? (
        <List disablePadding>
          {activityFeed.map((item) => (
            <ListItem key={item.id} disableGutters sx={{ py: 0.75 }}>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={ACTIVITY_LABELS[item.category]} variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(item.timestamp)}
                  </Typography>
                </Stack>
                <Typography variant="subtitle2">{item.title}</Typography>
                {item.description ? (
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                ) : null}
              </Stack>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Aún no hay movimientos registrados en el sistema.
        </Typography>
      )}
    </Stack>
  );

  const widgetRenderers: Record<WidgetId, () => JSX.Element> = {
    pendingStudents: renderPendingStudents,
    practiceSnapshot: renderPracticeSnapshot,
    approvalsQueue: renderApprovalsQueue,
    upcomingPractices: renderUpcomingPractices,
    reportTracker: renderReportTracker,
    companyHealth: renderCompanyHealth,
    activityFeed: renderActivityFeed,
  };

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Panel de coordinación
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualiza en un solo lugar el avance de las prácticas, estudiantes, informes y empresas asociadas.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={manualRefreshing}
        >
          Actualizar datos
        </Button>
      </Stack>

      {dashboardLoading && <LinearProgress sx={{ mb: 3 }} />}

      {summary.error && !dashboardLoading && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {summary.error}
        </Alert>
      )}

      {editMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Modo edición activo. Usa las flechas para reordenar los módulos y el icono de ocultar para personalizar tu panel.
        </Alert>
      )}

      {editMode && hiddenWidgets.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader title="Módulos ocultos" subheader="Vuelve a mostrarlos cuando los necesites." />
          <CardContent>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {hiddenWidgets.map((id) => (
                <Chip
                  key={id}
                  label={widgetConfig[id].title}
                  onDelete={() => handleShowWidget(id)}
                  deleteIcon={<VisibilityIcon />}
                  color="default"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {visibleWidgets.map((id) => {
          const config = widgetConfig[id];
          const render = widgetRenderers[id];
          const disableMoveUp = isWidgetFirstVisible(id);
          const disableMoveDown = isWidgetLastVisible(id);
          return (
            <Grid item xs={config.grid.xs} md={config.grid.md} lg={config.grid.lg ?? config.grid.md} key={id}>
              <Card
                variant="outlined"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardHeader
                  avatar={config.icon}
                  title={config.title}
                  action={
                    editMode ? (
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Mover arriba">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleMoveWidget(id, 'up')}
                              disabled={disableMoveUp}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Mover abajo">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleMoveWidget(id, 'down')}
                              disabled={disableMoveDown}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Ocultar módulo">
                          <IconButton size="small" onClick={() => handleHideWidget(id)}>
                            <VisibilityOffIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : null
                  }
                />
                <CardContent sx={{ flexGrow: 1 }}>{render()}</CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Fade in>
        <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
          <Tooltip title={editMode ? 'Guardar cambios' : 'Editar dashboard'}>
            <Fab color={editMode ? 'secondary' : 'primary'} onClick={handleToggleEditMode}>
              {editMode ? <CheckIcon /> : <EditIcon />}
            </Fab>
          </Tooltip>
        </Box>
      </Fade>
    </Box>
  );
}
