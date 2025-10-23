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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DescriptionIcon from '@mui/icons-material/Description';
import BusinessIcon from '@mui/icons-material/Business';
import BoltIcon from '@mui/icons-material/Bolt';
import { Link as RouterLink } from 'react-router-dom';
import { usePracticasDashboard } from '../hooks/usePracticasDashboard';
import { useCoordinatorDashboardOverview } from '../hooks/useCoordinatorDashboardOverview';
import { PracticeFilters } from './Practices/PracticeFilters';

const WIDGET_IDS = [
  'practicePipeline',
  'pendingStudents',
  'approvalQueue',
  'upcomingCalendar',
  'reportsTracker',
  'companyOverview',
  'activityFeed',
] as const;

type WidgetId = (typeof WIDGET_IDS)[number];

type LayoutState = {
  order: WidgetId[];
  hidden: WidgetId[];
};

const STORAGE_KEY = 'coordinator-dashboard-layout-v1';

const DEFAULT_LAYOUT: LayoutState = {
  order: [...WIDGET_IDS],
  hidden: [],
};

const WIDGET_META: Record<WidgetId, { title: string; description: string; icon: JSX.Element; grid: { xs: number; md: number; lg?: number } }> = {
  practicePipeline: {
    title: 'Panorama de prácticas',
    description: 'Resumen de estados para todas las prácticas activas',
    icon: <PlaylistAddCheckIcon color="primary" />,
    grid: { xs: 12, md: 6, lg: 4 },
  },
  pendingStudents: {
    title: 'Estudiantes con datos pendientes',
    description: 'Contacta rápidamente a quienes necesitan completar información',
    icon: <PeopleAltIcon color="warning" />,
    grid: { xs: 12, md: 6, lg: 4 },
  },
  approvalQueue: {
    title: 'Cola de aprobaciones',
    description: 'Revisa las prácticas esperando tu decisión',
    icon: <PendingActionsIcon color="info" />,
    grid: { xs: 12, md: 6 },
  },
  upcomingCalendar: {
    title: 'Próximos hitos',
    description: 'Fechas de inicio y cierre que se aproximan',
    icon: <EventNoteIcon color="secondary" />,
    grid: { xs: 12, md: 6, lg: 4 },
  },
  reportsTracker: {
    title: 'Seguimiento de informes',
    description: 'Controla los informes por revisar y los más recientes',
    icon: <DescriptionIcon color="success" />,
    grid: { xs: 12, md: 6, lg: 4 },
  },
  companyOverview: {
    title: 'Salud de convenios',
    description: 'Disponibilidad de cupos y estado de las empresas colaboradoras',
    icon: <BusinessIcon color="primary" />,
    grid: { xs: 12, md: 6 },
  },
  activityFeed: {
    title: 'Últimas novedades',
    description: 'Cambios recientes en las prácticas',
    icon: <BoltIcon color="warning" />,
    grid: { xs: 12, md: 6 },
  },
};

const STATUS_LABELS: Record<'Pendiente' | 'En progreso' | 'Aprobada' | 'Completada' | 'Rechazada', string> = {
  Pendiente: 'Pendientes',
  'En progreso': 'En progreso',
  Aprobada: 'Aprobadas',
  Completada: 'Completadas',
  Rechazada: 'Rechazadas',
};

const ensureLayout = (layout: LayoutState): LayoutState => {
  const order = layout.order.filter((id): id is WidgetId => WIDGET_IDS.includes(id));
  const hidden = layout.hidden.filter((id): id is WidgetId => WIDGET_IDS.includes(id));
  const completeOrder = [...order];
  WIDGET_IDS.forEach((id) => {
    if (!completeOrder.includes(id)) completeOrder.push(id);
  });
  const filteredHidden = hidden.filter((id) => completeOrder.includes(id));
  return { order: completeOrder, hidden: filteredHidden };
};

const loadLayout = (): LayoutState => {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_LAYOUT;
    const candidate: LayoutState = {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    } as LayoutState;
    return ensureLayout(candidate);
  } catch (error) {
    console.warn('No fue posible cargar el layout del panel:', error);
    return DEFAULT_LAYOUT;
  }
};

const saveLayout = (layout: LayoutState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const describeActivity = (estado: 'Pendiente' | 'Aprobada' | 'En progreso' | 'Completada' | 'Rechazada') => {
  switch (estado) {
    case 'Pendiente':
      return 'envió una práctica para revisión';
    case 'En progreso':
      return 'tiene una práctica en desarrollo';
    case 'Aprobada':
      return 'recibió aprobación de su práctica';
    case 'Completada':
      return 'finalizó su práctica';
    case 'Rechazada':
      return 'recibió observaciones en su práctica';
    default:
      return 'actualizó su práctica';
  }
};

export default function CoordinatorDashboard() {
  const [layout, setLayout] = useState<LayoutState>(() => ensureLayout(loadLayout()));
  const [editing, setEditing] = useState(false);

  const {
    search,
    setSearch,
    handleApprove,
    handleReject,
    loading: practicesLoading,
    statusCounts,
    pendingQueue,
    upcomingPractices,
    recentActivity,
  } = usePracticasDashboard();

  const {
    loading: overviewLoading,
    error: overviewError,
    totalStudents,
    pendingStudentsCount,
    topPendingStudents,
    reportsAwaiting,
    reviewedReports,
    recentReports,
    totalReports,
    companyStats,
  } = useCoordinatorDashboardOverview();

  const visibleOrder = useMemo(() => {
    return layout.order.filter((id) => !layout.hidden.includes(id));
  }, [layout.order, layout.hidden]);

  const handleMove = (id: WidgetId, direction: 'up' | 'down') => {
    setLayout((prev) => {
      const currentIndex = prev.order.indexOf(id);
      if (currentIndex === -1) return prev;
      const swapWith = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (swapWith < 0 || swapWith >= prev.order.length) return prev;
      const nextOrder = [...prev.order];
      [nextOrder[currentIndex], nextOrder[swapWith]] = [nextOrder[swapWith], nextOrder[currentIndex]];
      const nextLayout = ensureLayout({ ...prev, order: nextOrder });
      saveLayout(nextLayout);
      return nextLayout;
    });
  };

  const handleToggleVisibility = (id: WidgetId) => {
    setLayout((prev) => {
      const isHidden = prev.hidden.includes(id);
      if (!isHidden && prev.order.filter((widgetId) => !prev.hidden.includes(widgetId)).length === 1) {
        return prev; // evita ocultar el último widget visible
      }
      const nextHidden = isHidden
        ? prev.hidden.filter((widgetId) => widgetId !== id)
        : [...prev.hidden, id];
      const nextLayout = ensureLayout({ ...prev, hidden: nextHidden });
      saveLayout(nextLayout);
      return nextLayout;
    });
  };

  const handleReset = () => {
    setLayout(() => {
      saveLayout(DEFAULT_LAYOUT);
      return DEFAULT_LAYOUT;
    });
  };

  const renderHiddenPlaceholder = (id: WidgetId) => (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
      }}
    >
      <CardContent>
        <Stack spacing={1} alignItems="center">
          <VisibilityOffIcon color="disabled" />
          <Typography variant="subtitle1" textAlign="center">
            Este widget está oculto
          </Typography>
          <Button size="small" variant="outlined" onClick={() => handleToggleVisibility(id)}>
            Mostrar nuevamente
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderPipelineWidget = () => {
    const totalPractices = Object.values(statusCounts).reduce((acc, count) => acc + count, 0);
    const statusOrder: Array<keyof typeof statusCounts> = [
      'Pendiente',
      'En progreso',
      'Aprobada',
      'Completada',
      'Rechazada',
    ];

    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader
          avatar={WIDGET_META.practicePipeline.icon}
          title={WIDGET_META.practicePipeline.title}
          subheader={WIDGET_META.practicePipeline.description}
        />
        <CardContent>
          {practicesLoading ? (
            <LinearProgress />
          ) : (
            <Stack spacing={2}>
              <Typography variant="h3">{totalPractices}</Typography>
              <Typography variant="body2" color="text.secondary">
                prácticas totales cargadas
              </Typography>
              <Grid container spacing={1}>
                {statusOrder.map((status) => (
                  <Grid key={status} item xs={6} sm={4}>
                    <Chip
                      label={`${STATUS_LABELS[status]}: ${statusCounts[status] ?? 0}`}
                      color={
                        status === 'Pendiente'
                          ? 'warning'
                          : status === 'En progreso'
                          ? 'info'
                          : status === 'Rechazada'
                          ? 'error'
                          : 'success'
                      }
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="flex-end">
            <Button component={RouterLink} to="/coordinador/practicas" size="small">
              Ir a prácticas
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const renderPendingStudentsWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={WIDGET_META.pendingStudents.icon}
        title={WIDGET_META.pendingStudents.title}
        subheader={WIDGET_META.pendingStudents.description}
      />
      <CardContent>
        {overviewLoading && <LinearProgress sx={{ mb: 2 }} />}
        {overviewError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {overviewError}
          </Alert>
        )}
        <Stack direction="row" spacing={2} alignItems="baseline">
          <Typography variant="h3">{pendingStudentsCount}</Typography>
          <Typography variant="body2" color="text.secondary">
            de {totalStudents} estudiantes con información incompleta
          </Typography>
        </Stack>
        <List dense>
          {pendingStudentsCount === 0 && !overviewLoading ? (
            <ListItem>
              <ListItemText primary="Todos los estudiantes están al día 🎉" />
            </ListItem>
          ) : (
            topPendingStudents.map((student) => (
              <ListItem key={student.id} disableGutters>
                <ListItemText
                  primary={student.nombre}
                  secondary={student.carrera ? `Carrera: ${student.carrera}` : 'Completar datos de contacto'}
                />
              </ListItem>
            ))
          )}
        </List>
        <Stack direction="row" justifyContent="flex-end">
          <Button component={RouterLink} to="/coordinador/estudiantes" size="small">
            Gestionar estudiantes
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderApprovalQueueWidget = () => {
    const actionable = pendingQueue.slice(0, 6);
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader
          avatar={WIDGET_META.approvalQueue.icon}
          title={WIDGET_META.approvalQueue.title}
          subheader={WIDGET_META.approvalQueue.description}
        />
        <CardContent>
          <PracticeFilters search={search} onSearchChange={setSearch} />
          {practicesLoading && <LinearProgress sx={{ mb: 2 }} />}
          {actionable.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay prácticas pendientes con el filtro actual.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {actionable.map((item) => (
                <Box key={item.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={600}>{item.nombre_estudiante}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enviado el {formatDate(item.fecha_envio)} • {item.carrera}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" size="small" onClick={() => handleApprove(item.id)}>
                        Aprobar
                      </Button>
                      <Button variant="outlined" size="small" color="warning" onClick={() => handleReject(item.id)}>
                        Solicitar cambios
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderUpcomingWidget = () => {
    const upcoming = upcomingPractices.slice(0, 6);
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader
          avatar={WIDGET_META.upcomingCalendar.icon}
          title={WIDGET_META.upcomingCalendar.title}
          subheader={WIDGET_META.upcomingCalendar.description}
        />
        <CardContent>
          {practicesLoading && <LinearProgress sx={{ mb: 2 }} />}
          {upcoming.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no hay prácticas programadas con fecha de inicio.
            </Typography>
          ) : (
            <List dense>
              {upcoming.map((item) => (
                <ListItem key={item.id} disableGutters>
                  <ListItemText
                    primary={`${item.nombre_estudiante} — ${item.empresa ?? 'Empresa por confirmar'}`}
                    secondary={`Inicio: ${formatDate(item.fecha_inicio)}${
                      item.fecha_termino ? ` · Término: ${formatDate(item.fecha_termino)}` : ''
                    }`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderReportsWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={WIDGET_META.reportsTracker.icon}
        title={WIDGET_META.reportsTracker.title}
        subheader={WIDGET_META.reportsTracker.description}
      />
      <CardContent>
        {overviewLoading && <LinearProgress sx={{ mb: 2 }} />}
        {overviewError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {overviewError}
          </Alert>
        )}
        <Stack spacing={1}>
          <Typography variant="h4">{reportsAwaiting}</Typography>
          <Typography variant="body2" color="text.secondary">
            informes esperando revisión · {reviewedReports} revisados de {totalReports}
          </Typography>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Últimos informes cargados
        </Typography>
        <List dense>
          {recentReports.length === 0 ? (
            <ListItem>
              <ListItemText primary="Aún no hay informes registrados." />
            </ListItem>
          ) : (
            recentReports.map((report) => (
              <ListItem key={report.id} disableGutters>
                <ListItemText
                  primary={report.nombre}
                  secondary={`${formatDate(report.created_at)} · ${
                    report.nota == null ? 'Sin nota' : `Nota: ${report.nota.toFixed(1)}`
                  }`}
                />
              </ListItem>
            ))
          )}
        </List>
        <Stack direction="row" justifyContent="flex-end">
          <Button component={RouterLink} to="/coordinador/informes-estudiante" size="small">
            Revisar informes
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderCompaniesWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={WIDGET_META.companyOverview.icon}
        title={WIDGET_META.companyOverview.title}
        subheader={WIDGET_META.companyOverview.description}
      />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="baseline">
            <Typography variant="h3">{companyStats.total}</Typography>
            <Typography variant="body2" color="text.secondary">
              empresas en cartera
            </Typography>
          </Stack>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={4}>
              <Chip label={`Activos: ${companyStats.activos}`} color="success" variant="outlined" sx={{ width: '100%' }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <Chip label={`Negociación: ${companyStats.enNegociacion}`} color="warning" variant="outlined" sx={{ width: '100%' }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <Chip label={`Vencidos: ${companyStats.vencidos}`} color="error" variant="outlined" sx={{ width: '100%' }} />
            </Grid>
            <Grid item xs={6} sm={6}>
              <Chip label={`Con cupos: ${companyStats.conCupos}`} color="primary" variant="outlined" sx={{ width: '100%' }} />
            </Grid>
            <Grid item xs={6} sm={6}>
              <Chip label={`Sin cupos: ${companyStats.sinCupos}`} color="default" variant="outlined" sx={{ width: '100%' }} />
            </Grid>
          </Grid>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" justifyContent="flex-end">
          <Button component={RouterLink} to="/coordinador/empresas" size="small">
            Gestionar convenios
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderActivityWidget = () => (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={WIDGET_META.activityFeed.icon}
        title={WIDGET_META.activityFeed.title}
        subheader={WIDGET_META.activityFeed.description}
      />
      <CardContent>
        {practicesLoading && <LinearProgress sx={{ mb: 2 }} />}
        {recentActivity.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay novedades recientes. Cuando lleguen nuevas prácticas aparecerán aquí automáticamente.
          </Typography>
        ) : (
          <List dense>
            {recentActivity.map((item) => (
              <ListItem key={`${item.id}-${item.timestamp}`} disableGutters>
                <ListItemText
                  primary={`${item.nombre?.trim() ? item.nombre : 'Estudiante'} ${describeActivity(item.estado)}`}
                  secondary={formatDate(item.timestamp)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  const renderWidget = (id: WidgetId, hidden: boolean) => {
    if (hidden && editing) {
      return renderHiddenPlaceholder(id);
    }

    if (hidden) {
      return null;
    }

    switch (id) {
      case 'practicePipeline':
        return renderPipelineWidget();
      case 'pendingStudents':
        return renderPendingStudentsWidget();
      case 'approvalQueue':
        return renderApprovalQueueWidget();
      case 'upcomingCalendar':
        return renderUpcomingWidget();
      case 'reportsTracker':
        return renderReportsWidget();
      case 'companyOverview':
        return renderCompaniesWidget();
      case 'activityFeed':
        return renderActivityWidget();
      default:
        return null;
    }
  };

  const renderControls = (id: WidgetId) => {
    const index = layout.order.indexOf(id);
    const isHidden = layout.hidden.includes(id);
    const canMoveUp = index > 0;
    const canMoveDown = index < layout.order.length - 1;

    if (!editing) return null;

    return (
      <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 8, right: 8 }}>
        <Tooltip title="Mover arriba">
          <span>
            <IconButton size="small" disabled={!canMoveUp} onClick={() => handleMove(id, 'up')}>
              <ArrowUpwardIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Mover abajo">
          <span>
            <IconButton size="small" disabled={!canMoveDown} onClick={() => handleMove(id, 'down')}>
              <ArrowDownwardIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={isHidden ? 'Mostrar widget' : 'Ocultar widget'}>
          <IconButton size="small" onClick={() => handleToggleVisibility(id)}>
            {isHidden ? <VisibilityIcon fontSize="inherit" /> : <VisibilityOffIcon fontSize="inherit" />}
          </IconButton>
        </Tooltip>
      </Stack>
    );
  };

  const gridOrder = editing ? layout.order : visibleOrder;

  return (
    <Box sx={{ position: 'relative', pb: 10 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Panel del coordinador
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Mantén a la vista tus pendientes, próximas fechas y relación con empresas para agilizar la gestión diaria.
        </Typography>
        {editing && (
          <Alert severity="info" action={<Button size="small" onClick={handleReset}>Restablecer orden</Button>}>
            Arrastra los widgets con los botones para reordenar, ocultar o mostrar bloques según tus preferencias.
          </Alert>
        )}
      </Stack>

      <Grid container spacing={3}>
        {gridOrder.map((id) => {
          const hidden = layout.hidden.includes(id);
          const widget = renderWidget(id, hidden);
          if (!widget) return null;
          const { grid } = WIDGET_META[id];
          return (
            <Grid key={id} item xs={grid.xs} md={grid.md} lg={grid.lg} sx={{ position: 'relative' }}>
              {renderControls(id)}
              {widget}
            </Grid>
          );
        })}
      </Grid>

      <Tooltip title={editing ? 'Cerrar edición' : 'Personalizar panel'}>
        <Fab
          color={editing ? 'secondary' : 'primary'}
          onClick={() => setEditing((prev) => !prev)}
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          aria-label="Editar panel"
        >
          <EditIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
}
