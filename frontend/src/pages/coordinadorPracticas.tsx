import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  InputAdornment,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';

import DashboardTemplate from '../../../../consultoria_informatica/frontend/src/components/DashboardTemplate';
import { supabase } from '../../../../consultoria_informatica/frontend/src/services/supabaseClient';
import { practicaService } from '../../../../consultoria_informatica/frontend/src/services/practicaService';
import { evaluacionSupervisorService } from '../../../../consultoria_informatica/frontend/src/services/evaluacionSupervisorService';


import type { Practica } from '../../../../consultoria_informatica/frontend/src/types/database';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// PAGINACIÓN: cantidad de prácticas a mostrar por página
const ITEMS_PER_PAGE = 10;

type PracticeEstado = Practica['estado'];

interface PracticeDetail extends Practica {
  estudiantes: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string | null;
    carrera?: string | null;
    //rut?: string | null;
  } | null;
  empresas: {
    id: string;
    razon_social: string;
    direccion: string;
    jefe_directo: string;
    cargo_jefe: string;
    telefono: string;
    email: string;
  } | null;
}

interface NormalizedPractice {
  id: string;
  estado: PracticeEstado;
  tipo_practica: Practica['tipo_practica'];
  fecha_inicio: string;
  fecha_termino: string;
  horario_trabajo: string;
  colacion: string;
  cargo_por_desarrollar: string;
  departamento: string;
  actividades: string;
  fecha_firma?: string | null;
  firma_alumno?: string | null;
  created_at: string;
  updated_at: string;
  estudiante: PracticeDetail['estudiantes'];
  empresa: PracticeDetail['empresas'];
}

type DecisionAction = 'aprobada' | 'rechazada';

const estadoChips: Record<PracticeEstado, { label: string; color: 'default' | 'warning' | 'success' | 'info' | 'error' }> = {
  pendiente: { label: 'Pendiente', color: 'warning' },
  aprobada: { label: 'Aprobada', color: 'success' },
  en_progreso: { label: 'En progreso', color: 'info' },
  completada: { label: 'Completada', color: 'default' },
  rechazada: { label: 'Rechazada', color: 'error' }
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatDateShort = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const CoordinadorPracticas = () => {


  // Estados principales
  const [practicas, setPracticas] = useState<NormalizedPractice[]>([]);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de diálogos
  const [dialog, setDialog] = useState<{ open: boolean; action: DecisionAction | null }>({ 
    open: false, 
    action: null 
  });
  const [dialogEvaluacion, setDialogEvaluacion] = useState(false);
  
  // Estados de loading
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generandoEnlace, setGenerandoEnlace] = useState(false);
  
  // Estados de evaluación
  const [enlaceGenerado, setEnlaceGenerado] = useState<string | null>(null);
  const [evaluacionExistente, setEvaluacionExistente] = useState<any>(null);
  
  // Estados de feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  
  // Refs
  const detailRef = useRef<HTMLDivElement>(null);
  const verificacionEnCurso = useRef(false);
  const ultimaPracticaVerificada = useRef<string | null>(null);

  // BÚSQUEDA: filtrar solo por nombre del estudiante o por carrera
  const filteredPracticas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return practicas;

    return practicas.filter((practice) => {
      const nombreCompleto = `${practice.estudiante?.nombre ?? ''} ${practice.estudiante?.apellido ?? ''}`.toLowerCase();
      const carrera = (practice.estudiante?.carrera ?? '').toLowerCase();

      return nombreCompleto.includes(term) || carrera.includes(term);
    });
  }, [practicas, searchTerm]);

  // OPTIMIZADO: Práctica seleccionada con memo
  const selectedPractice = useMemo(
    () => filteredPracticas.find((p) => p.id === selectedId) ?? filteredPracticas[0] ?? null,
    [filteredPracticas, selectedId]
  );
  
  // PAGINACIÓN: calcular total de páginas disponibles según la data cargada
  const totalPages = useMemo(
    () => Math.ceil(filteredPracticas.length / ITEMS_PER_PAGE),
    [filteredPracticas]
  );

  // PAGINACIÓN: obtener el slice de prácticas correspondiente a la página actual
  const paginatedPracticas = useMemo(() => {
    if (filteredPracticas.length === 0) return [];

    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredPracticas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPracticas, page, totalPages]);

// PAGINACIÓN: ajustar la página actual si disminuye el total
  useEffect(() => {
    setPage((prevPage) => {
      if (totalPages === 0) return 1;
      return Math.min(prevPage, totalPages);
    });
  }, [totalPages]);

// PAGINACIÓN: asegurar que siempre exista una práctica seleccionada dentro del rango visible
  useEffect(() => {
    const effectivePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    const currentSlice = filteredPracticas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (currentSlice.length === 0) {
      if (filteredPracticas.length === 0) {
        if (selectedId !== null) {
          setSelectedId(null);
        }
      } else if (effectivePage > totalPages) {
        setPage(Math.max(totalPages, 1));
      }
      return;
    }

    if (!currentSlice.some((practice) => practice.id === selectedId)) {
      setSelectedId(currentSlice[0].id);
    }
  }, [filteredPracticas, page, selectedId, totalPages]);

  // OPTIMIZADO: Normalizar prácticas
  const normalizePractices = useCallback((rows: PracticeDetail[]): NormalizedPractice[] =>
    rows.map((row) => ({
      id: row.id,
      estado: row.estado,
      tipo_practica: row.tipo_practica,
      fecha_inicio: row.fecha_inicio,
      fecha_termino: row.fecha_termino,
      horario_trabajo: row.horario_trabajo,
      colacion: row.colacion,
      cargo_por_desarrollar: row.cargo_por_desarrollar,
      departamento: row.departamento,
      actividades: row.actividades,
      fecha_firma: row.fecha_firma,
      firma_alumno: row.firma_alumno,
      created_at: row.created_at,
      updated_at: row.updated_at,
      estudiante: row.estudiantes,
      empresa: row.empresas
    })), []
  );

  // OPTIMIZADO: Cargar prácticas (sin logs excesivos)
  const loadPracticas = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('practicas')
        .select(`
          *,
          estudiantes:estudiante_id (
            id,
            nombre,
            apellido,
            email,
            telefono,
            carrera
          ),
          empresas:empresa_id (
            id,
            razon_social,
            direccion,
            jefe_directo,
            cargo_jefe,
            telefono,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const normalized = normalizePractices((data ?? []) as PracticeDetail[]);
      setPracticas(normalized);
      
      // Solo seleccionar primera práctica si no hay ninguna seleccionada
      if (normalized.length > 0 && !selectedId) {
        setSelectedId(normalized[0].id);
      }
      
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('No fue posible cargar las prácticas. Intenta nuevamente más tarde.');
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, [selectedId, normalizePractices]);

  // OPTIMIZADO: Carga inicial (solo una vez)
  // LOG: Mostrar usuario conectado

  useEffect(() => {
    loadPracticas();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const channel = supabase
      .channel('public:practicas-dashboard')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'practicas' 
      }, () => {
        // Debounce: esperar 500ms antes de recargar
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          loadPracticas(true); // silent=true para no mostrar spinner
        }, 500);
      })
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      void supabase.removeChannel(channel);
    };
  }, [loadPracticas]);

  // OPTIMIZADO: Verificar evaluación solo cuando cambia la práctica
  useEffect(() => {
    const practicaId = selectedPractice?.id;
    
    // Evitar verificación duplicada
    if (!practicaId || 
        verificacionEnCurso.current || 
        ultimaPracticaVerificada.current === practicaId) {
      return;
    }

    const verificarEvaluacion = async () => {
      verificacionEnCurso.current = true;
      ultimaPracticaVerificada.current = practicaId;

      try {
        const result = await evaluacionSupervisorService.obtenerEvaluacionPorPractica(practicaId);
        
        if (result.success && result.data) {
          setEvaluacionExistente(result.data);
          const baseUrl = window.location.origin;
          setEnlaceGenerado(`${baseUrl}/evaluacion-supervisor/${result.data.token}`);
        } else {
          setEvaluacionExistente(null);
          setEnlaceGenerado(null);
        }
      } finally {
        verificacionEnCurso.current = false;
      }
    };

    verificarEvaluacion();
  }, [selectedPractice?.id]);

  // OPTIMIZADO: Generar PDF
  const handleDownloadPdf = async () => {
    if (!detailRef.current || !selectedPractice) return;
    
    setPdfLoading(true);
    
    try {
      const canvas = await html2canvas(detailRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const nombreEstudiante = `${selectedPractice.estudiante?.nombre ?? ''}-${selectedPractice.estudiante?.apellido ?? ''}`
        .replace(/\s+/g, '-');
      pdf.save(`ficha-practica-${nombreEstudiante || selectedPractice.id}.pdf`);
      
      setSnackbar({ open: true, message: '✅ PDF descargado exitosamente' });
    } catch {
      setErrorMessage('No se pudo generar el PDF. Inténtalo nuevamente.');
    } finally {
      setPdfLoading(false);
    }
  };

  // OPTIMIZADO: Generar enlace de evaluación
  const handleGenerarEnlaceEvaluacion = async () => {
    if (!selectedPractice) return;

    // Validaciones
    if (selectedPractice.estado !== 'aprobada') {
      setErrorMessage('Solo se puede generar evaluación para prácticas aprobadas');
      return;
    }

    if (!selectedPractice.empresa) {
      setErrorMessage('No hay información de empresa disponible');
      return;
    }

    // Si ya existe, solo abrir dialog
    if (evaluacionExistente) {
      setDialogEvaluacion(true);
      return;
    }

    setGenerandoEnlace(true);
    setErrorMessage(null);

    try {
      const result = await evaluacionSupervisorService.generarTokenEvaluacion({
        practicaId: selectedPractice.id,
        estudianteId: selectedPractice.estudiante?.id || '',
        empresaId: selectedPractice.empresa.id,
        nombreSupervisor: selectedPractice.empresa.jefe_directo,
        cargoSupervisor: selectedPractice.empresa.cargo_jefe,
        emailSupervisor: selectedPractice.empresa.email,
        telefonoSupervisor: selectedPractice.empresa.telefono,
        diasValidez: 30
      });

      if (result.success && result.data) {
        setEnlaceGenerado(result.data.url);
        setEvaluacionExistente(result.data);
        setDialogEvaluacion(true);
        ultimaPracticaVerificada.current = selectedPractice.id;
      } else {
        setErrorMessage(result.error || 'Error al generar enlace de evaluación');
      }
    } catch {
      setErrorMessage('Error inesperado al generar enlace');
    } finally {
      setGenerandoEnlace(false);
    }
  };

  // OPTIMIZADO: Copiar enlace (sin alert)
  const handleCopiarEnlace = async () => {
    if (!enlaceGenerado) return;

    try {
      await navigator.clipboard.writeText(enlaceGenerado);
      setSnackbar({ open: true, message: '✅ Enlace copiado al portapapeles' });
    } catch {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea');
      textarea.value = enlaceGenerado;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setSnackbar({ open: true, message: '✅ Enlace copiado al portapapeles' });
    }
  };

  // Enviar email (placeholder)
  const handleEnviarEnlacePorEmail = () => {
    if (!selectedPractice?.empresa?.email) return;
    
    // TODO: Implementar Edge Function
    setSnackbar({ 
      open: true, 
      message: `📧 Email preparado para: ${selectedPractice.empresa.email}` 
    });
    setDialogEvaluacion(false);
  };

  // OPTIMIZADO: Enviar email de decisión
  const sendDecisionEmail = async (practice: NormalizedPractice, action: DecisionAction) => {
    const destinatario = practice.estudiante?.email;
    if (!destinatario) return;

    const payload = {
      to: destinatario,
      action,
      estudiante_nombre: `${practice.estudiante?.nombre ?? ''} ${practice.estudiante?.apellido ?? ''}`.trim(),
      tipo_practica: practice.tipo_practica,
      empresa: practice.empresa?.razon_social ?? '',
      fecha_inicio: practice.fecha_inicio,
      fecha_termino: practice.fecha_termino
    };

    // Intentar con Edge Function
    if (typeof supabase.functions?.invoke === 'function') {
      try {
        await supabase.functions.invoke('send-email-brevo', {
          body: JSON.stringify({ 
            ...payload, 
            template: action === 'aprobada' ? 'practica_aprobada' : 'practica_rechazada' 
          })
        });
        return;
      } catch {
        // Continuar con fallback
      }
    }

    // Fallback: guardar en notificaciones
    try {
      await supabase.from('notificaciones').insert([{
        to: destinatario,
        subject: `Estado ficha práctica - ${practice.tipo_practica}`,
        body: JSON.stringify(payload),
        created_at: new Date().toISOString()
      }]);
    } catch {
      // Silencioso
    }
  };

  // OPTIMIZADO: Manejar decisión
  const handleDecision = async (action: DecisionAction) => {
    if (!selectedPractice) return;
    
    setDecisionLoading(true);
    
    try {
      const { data, error } = await practicaService.updateEstado(selectedPractice.id, action);
      if (error) throw error;
      
      const updatedPractice: NormalizedPractice = {
        ...selectedPractice,
        estado: (data?.estado as PracticeEstado) ?? action,
        updated_at: data?.updated_at ?? new Date().toISOString()
      };

      setPracticas((prev) => prev.map((p) => (p.id === updatedPractice.id ? updatedPractice : p)));
      
      // Enviar email en background
      sendDecisionEmail(updatedPractice, action);
      
      setSnackbar({ 
        open: true, 
        message: `Práctica ${action === 'aprobada' ? 'aprobada' : 'rechazada'} exitosamente` 
      });
    } catch {
      setErrorMessage('No se pudo actualizar el estado. Intenta nuevamente.');
    } finally {
      setDecisionLoading(false);
      setDialog({ open: false, action: null });
    }
  };

  // ===== RENDER FUNCTIONS =====

  const renderListSkeleton = () => (
    <Stack spacing={2}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Paper variant="outlined" key={index} sx={{ p: 2 }}>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="rectangular" height={24} sx={{ mt: 1 }} />
        </Paper>
      ))}
    </Stack>
  );

  const renderList = () => {
    const showEmptyState = !loading && practicas.length === 0;
    const showNoMatches =
      !loading && practicas.length > 0 && filteredPracticas.length === 0;

    return (
      <Stack spacing={2}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por nombre o carrera"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <List disablePadding>
          {paginatedPracticas.map((practice) => {
        const chip = estadoChips[practice.estado];
        const isActive = selectedPractice?.id === practice.id;
        const tieneEvaluacion = isActive && evaluacionExistente?.practica_id === practice.id;
        const evaluacionRespondida = tieneEvaluacion && evaluacionExistente?.respondido;
        
        return (
          <ListItem key={practice.id} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={isActive}
              onClick={() => setSelectedId(practice.id)}
              sx={{
                alignItems: 'flex-start',
                borderRadius: 2,
                border: (theme) => `1px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                backgroundColor: isActive ? 'primary.main' : 'background.paper',
                color: isActive ? 'primary.contrastText' : 'inherit'
              }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                      {`${practice.estudiante?.nombre ?? 'Estudiante'} ${practice.estudiante?.apellido ?? ''}`.trim() || 'Sin nombre'}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      <Chip
                        size="small"
                        color={chip.color}
                        label={chip.label}
                        sx={{
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : undefined,
                          color: isActive ? 'primary.contrastText' : undefined
                        }}
                      />
                      {evaluacionRespondida && (
                        <Chip
                          size="small"
                          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                          label="Evaluado"
                          color="success"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      )}
                    </Stack>
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      {practice.tipo_practica}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Enviada el {formatDateShort(practice.created_at)}
                    </Typography>
                  </Stack>
                }
              />
            </ListItemButton>
          </ListItem>
        );
          })}
          {showEmptyState && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                No hay fichas de práctica registradas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cuando un estudiante complete su ficha, aparecerá automáticamente en este listado.
              </Typography>
            </Paper>
          )}
          {showNoMatches && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                No encontramos coincidencias
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ajusta la búsqueda por nombre, RUT o carrera para ver otras prácticas disponibles.
              </Typography>
            </Paper>
          )}
        </List>

        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={totalPages === 0 ? 1 : Math.min(page, totalPages)}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        )}
      </Stack>
    );
  };

  const renderDetail = () => {
    if (loading) {
      return (
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
          <Divider sx={{ my: 3 }} />
          <Skeleton variant="rectangular" height={180} />
        </Paper>
      );
    }

    if (!selectedPractice) {
      if (!loading && practicas.length > 0 && filteredPracticas.length === 0) {
        return (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              No hay detalles para mostrar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Modifica la búsqueda para seleccionar una ficha de práctica y visualizar su información.
            </Typography>
          </Paper>
        );
      }

      return (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Selecciona una ficha de la lista para ver el detalle
          </Typography>
        </Paper>
      );
    }

    const chip = estadoChips[selectedPractice.estado];

    return (
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3 }} ref={detailRef}>
          <Stack 
            direction={{ xs: 'column', md: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', md: 'center' }} 
            spacing={2}
          >
            <Box>
              <Typography variant="h5" component="h2" fontWeight={700}>
                {`${selectedPractice.estudiante?.nombre ?? 'Sin'} ${selectedPractice.estudiante?.apellido ?? 'nombre'}`.trim()}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {selectedPractice.tipo_practica}
              </Typography>
            </Box>
            <Chip color={chip.color} label={chip.label} sx={{ fontWeight: 600 }} />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section 
                title="Datos del estudiante" 
                items={[
                  { label: 'Nombre completo', value: `${selectedPractice.estudiante?.nombre ?? ''} ${selectedPractice.estudiante?.apellido ?? ''}`.trim() || '—' },
                  { label: 'Carrera', value: selectedPractice.estudiante?.carrera ?? '—' },
                  { label: 'Correo', value: selectedPractice.estudiante?.email ?? '—' },
                  { label: 'Teléfono', value: selectedPractice.estudiante?.telefono ?? '—' },
                ]} 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section 
                title="Datos de la empresa" 
                items={[
                  { label: 'Razón social', value: selectedPractice.empresa?.razon_social ?? '—' },
                  { label: 'Dirección', value: selectedPractice.empresa?.direccion ?? '—' },
                  { label: 'Jefe directo', value: selectedPractice.empresa?.jefe_directo ?? '—' },
                  { label: 'Cargo jefe', value: selectedPractice.empresa?.cargo_jefe ?? '—' },
                  { label: 'Teléfono empresa', value: selectedPractice.empresa?.telefono ?? '—' },
                  { label: 'Email empresa', value: selectedPractice.empresa?.email ?? '—' }
                ]} 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section 
                title="Información de la práctica" 
                items={[
                  { label: 'Fecha de inicio', value: formatDate(selectedPractice.fecha_inicio) },
                  { label: 'Fecha de término', value: formatDate(selectedPractice.fecha_termino) },
                  { label: 'Horario', value: selectedPractice.horario_trabajo || '—' },
                  { label: 'Colación', value: selectedPractice.colacion || '—' },
                  { label: 'Departamento', value: selectedPractice.departamento || '—' },
                  { label: 'Cargo a desarrollar', value: selectedPractice.cargo_por_desarrollar || '—' }
                ]} 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section 
                title="Documentos" 
                items={[
                  { label: 'Fecha firma alumno', value: formatDate(selectedPractice.fecha_firma ?? undefined) },
                  { label: 'Firma alumno', value: selectedPractice.firma_alumno || '—' }
                ]} 
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Section 
                title="Actividades" 
                items={[{ label: '', value: selectedPractice.actividades || 'Sin actividades registradas.' }]} 
              />
            </Grid>
          </Grid>
        </Paper>

        {/* ✅ BOTONES CON GRID LAYOUT */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: selectedPractice.estado === 'aprobada' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'
            },
            gap: 2
          }}
        >
          <Button
            variant="outlined"
            startIcon={pdfLoading ? <CircularProgress size={18} /> : <PictureAsPdfIcon />}
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            fullWidth
          >
            Descargar ficha
          </Button>

          {selectedPractice.estado === 'aprobada' && (
            <Button
              variant="outlined"
              color="info"
              startIcon={generandoEnlace ? <CircularProgress size={18} /> : <AssignmentIcon />}
              onClick={handleGenerarEnlaceEvaluacion}
              disabled={generandoEnlace}
              fullWidth
            >
              {evaluacionExistente?.respondido 
                ? 'Evaluado' 
                : evaluacionExistente 
                  ? 'Ver Enlace'
                  : 'Generar Eval.'
              }
            </Button>
          )}
          
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={selectedPractice.estado === 'aprobada' || decisionLoading}
            onClick={() => setDialog({ open: true, action: 'aprobada' })}
            fullWidth
          >
            Aprobar
          </Button>
          
          <Button
            variant="contained"
            color="error"
            startIcon={<CancelIcon />}
            disabled={selectedPractice.estado === 'rechazada' || decisionLoading}
            onClick={() => setDialog({ open: true, action: 'rechazada' })}
            fullWidth
          >
            Rechazar
          </Button>
        </Box>
      </Stack>
    );
  };

  // ===== MAIN RENDER =====

  return (
    <DashboardTemplate title="Gestión de prácticas">
      <Box sx={{ mb: 4 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          spacing={2}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              Inscripciones de práctica profesional
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Revisa el detalle de cada ficha enviada por los estudiantes, descárgala en PDF y aprueba o rechaza según corresponda.
            </Typography>
          </Box>
          <Tooltip title="Actualizar lista">
            <span>
              <IconButton color="primary" onClick={() => loadPracticas()} disabled={refreshing}>
                {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          {loading ? renderListSkeleton() : renderList()}
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          {renderDetail()}
        </Grid>
      </Grid>


      <Dialog 
        open={dialog.open} 
        onClose={() => setDialog({ open: false, action: null })} 
        maxWidth="xs" 
        fullWidth
      >
        <DialogTitle>
          {dialog.action === 'aprobada' ? 'Aprobar ficha de práctica' : 'Rechazar ficha de práctica'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialog.action === 'aprobada'
              ? '¿Confirmas que deseas aprobar esta ficha de práctica? Se notificará al estudiante por correo electrónico.'
              : '¿Confirmas que deseas rechazar esta ficha de práctica? Se notificará al estudiante por correo electrónico.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, action: null })} disabled={decisionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={() => dialog.action && handleDecision(dialog.action)}
            variant="contained"
            color={dialog.action === 'aprobada' ? 'success' : 'error'}
            disabled={decisionLoading}
          >
            {decisionLoading ? <CircularProgress size={18} /> : dialog.action === 'aprobada' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog 
        open={dialogEvaluacion} 
        onClose={() => setDialogEvaluacion(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AssignmentIcon color="info" />
            <Typography variant="h6" fontWeight={600}>
              Enlace de Evaluación de Supervisor
            </Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info" sx={{ mt: 1 }}>
              Comparte este enlace con el supervisor de la empresa para que evalúe al estudiante.
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                ⏱️ El enlace es válido por 30 días
              </Typography>
            </Alert>

            {evaluacionExistente && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Datos del supervisor:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    <strong>Nombre:</strong> {evaluacionExistente.nombre_supervisor}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Cargo:</strong> {evaluacionExistente.cargo_supervisor}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong> {evaluacionExistente.email_supervisor}
                  </Typography>
                  {evaluacionExistente.telefono_supervisor && (
                    <Typography variant="body2">
                      <strong>Teléfono:</strong> {evaluacionExistente.telefono_supervisor}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                🔗 Enlace de evaluación:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={enlaceGenerado || 'Generando...'}
                InputProps={{
                  readOnly: true,
                  sx: { 
                    fontFamily: 'monospace', 
                    fontSize: '0.875rem',
                    bgcolor: 'grey.50'
                  }
                }}
              />
            </Box>

            {evaluacionExistente?.respondido ? (
              <Alert severity="success">
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Evaluación completada
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  Respondida el {new Date(evaluacionExistente.fecha_respuesta).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>Promedio Técnico:</strong> {evaluacionExistente.promedio_tecnico?.toFixed(2)} / 5.0
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Promedio Personal:</strong> {evaluacionExistente.promedio_personal?.toFixed(2)} / 5.0
                  </Typography>
                  <Typography variant="caption" display="block" fontWeight={700} color="success.main">
                    <strong>Promedio General:</strong> {evaluacionExistente.promedio_general?.toFixed(2)} / 5.0
                  </Typography>
                </Box>
              </Alert>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: 'warning.main',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 }
                    }
                  }} 
                />
                <Typography variant="caption" color="text.secondary">
                  Estado: <strong style={{ color: '#ed6c02' }}>Pendiente de respuesta</strong>
                </Typography>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDialogEvaluacion(false)}>
            Cerrar
          </Button>
          
          {!evaluacionExistente?.respondido && (
            <>
              <Button 
                startIcon={<ContentCopyIcon />}
                onClick={handleCopiarEnlace}
                variant="outlined"
              >
                Copiar enlace
              </Button>
              
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleEnviarEnlacePorEmail}
              >
                Enviar por email
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardTemplate>
  );
};

// ===== SECTION COMPONENT =====

interface SectionProps {
  title: string;
  items: Array<{ label: string; value: string }>;
}

const Section = ({ title, items }: SectionProps) => (
  <Paper variant="outlined" sx={{ p: 2.5 }}>
    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
      {title}
    </Typography>
    <Stack spacing={1.2}>
      {items.map((item, index) => (
        <Box key={`${item.label}-${index}`}>
          {item.label && (
            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, opacity: 0.7 }}>
              {item.label}
            </Typography>
          )}
          <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  </Paper>
);

export default CoordinadorPracticas;