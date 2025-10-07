import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
  TextField 
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';  
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; 
import OpenInNewIcon from '@mui/icons-material/OpenInNew';  
import DashboardTemplate from '../components/DashboardTemplate';
import { supabase } from '../services/supabaseClient';
import { practicaService } from '../services/practicaService';
import { googleFormService } from '../services/googleFormService';  
import type { Practica } from '../types/database';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type PracticeEstado = Practica['estado'];

interface PracticeDetail extends Practica {
  estudiantes: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string | null;
    carrera?: string | null;
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
  google_form_url?: string | null;
  google_form_enviado?: boolean;
  google_form_respondido?: boolean;
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
  google_form_url?: string | null; 
  google_form_enviado?: boolean;  
  google_form_respondido?: boolean;
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
  } catch (error) {
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
  } catch (error) {
    return value;
  }
};

const CoordinadorPracticas = () => {
  const [practicas, setPracticas] = useState<NormalizedPractice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; action: DecisionAction | null }>({ open: false, action: null });
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const [formDialog, setFormDialog] = useState(false);
  const [sendingForm, setSendingForm] = useState(false);
  const [generatedFormUrl, setGeneratedFormUrl] = useState('');

  const selectedPractice = useMemo(
    () => practicas.find((p) => p.id === selectedId) ?? practicas[0] ?? null,
    [practicas, selectedId]
  );

  useEffect(() => {
    const existing = practicas.find((p) => p.id === selectedId);
    if (!existing && practicas.length > 0) {
      setSelectedId(practicas[0].id);
    }
  }, [practicas, selectedId]);

  const normalizePractices = (rows: PracticeDetail[]): NormalizedPractice[] =>
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
      google_form_url: row.google_form_url || null,
      google_form_enviado: row.google_form_enviado || false,
      google_form_respondido: row.google_form_respondido || false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      estudiante: row.estudiantes,
      empresa: row.empresas
    }));

  const loadPracticas = useCallback(async () => {
    setRefreshing(true);
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

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }
      
      const normalized = normalizePractices((data ?? []) as PracticeDetail[]);
      setPracticas(normalized);
      if (normalized.length > 0 && !selectedId) {
        setSelectedId(normalized[0].id);
      }
      setErrorMessage(null);
    } catch (error) {
      console.error('Error cargando prácticas', error);
      setErrorMessage('No fue posible cargar las prácticas. Intenta nuevamente más tarde.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadPracticas();
  }, [loadPracticas]);

  useEffect(() => {
    const channel = supabase
      .channel('public:practicas-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practicas' }, () => {
        void loadPracticas();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPracticas]);

  const handleSnackbarClose = () => setSnackbar(null);

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
      const nombreEstudiante = `${selectedPractice.estudiante?.nombre ?? ''}-${selectedPractice.estudiante?.apellido ?? ''}`.replace(/\s+/g, '-');
      pdf.save(`ficha-practica-${nombreEstudiante || selectedPractice.id}.pdf`);
      setSnackbar({ message: 'Ficha descargada correctamente.', severity: 'success' });
    } catch (error) {
      console.error('Error generando PDF', error);
      setSnackbar({ message: 'No se pudo generar el PDF. Inténtalo nuevamente.', severity: 'error' });
    } finally {
      setPdfLoading(false);
    }
  };

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

    let sent = false;
    const errors: string[] = [];

    if (typeof supabase.functions?.invoke === 'function') {
      try {
        await supabase.functions.invoke('send-email-brevo', {
          body: JSON.stringify({ ...payload, template: action === 'aprobada' ? 'practica_aprobada' : 'practica_rechazada' })
        });
        sent = true;
      } catch (error) {
        console.warn('Fallo envío vía función', error);
        errors.push('function:' + String(error));
      }
    }

    if (!sent) {
      try {
        await supabase.from('notificaciones').insert([{
          to: destinatario,
          subject: `Estado ficha práctica - ${practice.tipo_practica}`,
          body: JSON.stringify(payload),
          created_at: new Date().toISOString()
        }]);
      } catch (error) {
        console.warn('Fallo registro notificación', error);
        errors.push('insert:' + String(error));
      }
    }

    if (errors.length > 0 && sent) {
      console.debug('Envío con advertencias', errors);
    }
  };

  const handleDecision = async (action: DecisionAction) => {
    if (!selectedPractice) return;
    setDecisionLoading(true);
    try {
      const { data, error } = await practicaService.updateEstado(selectedPractice.id, action);
      if (error) throw error;
      const updatedPractice = {
        ...selectedPractice,
        estado: (data?.estado as PracticeEstado) ?? action,
        updated_at: data?.updated_at ?? new Date().toISOString()
      } satisfies NormalizedPractice;

      setPracticas((prev) => prev.map((p) => (p.id === updatedPractice.id ? updatedPractice : p)));
      setSnackbar({
        message: action === 'aprobada' ? 'Ficha aprobada correctamente.' : 'Ficha rechazada correctamente.',
        severity: 'success'
      });

      await sendDecisionEmail(updatedPractice, action);
    } catch (error) {
      console.error('Error actualizando estado de práctica', error);
      setSnackbar({ message: 'No se pudo actualizar el estado. Intenta nuevamente.', severity: 'error' });
    } finally {
      setDecisionLoading(false);
      setDialog({ open: false, action: null });
    }
  };

  const handleEnviarFormulario = async () => {
    if (!selectedPractice) return;
    
    setSendingForm(true);
    try {
      const result = await googleFormService.enviarFormulario(selectedPractice.id);
      
      if (!result.success || result.error) {
        setSnackbar({ 
          message: `Error: ${result.error}`, 
          severity: 'error' 
        });
      } else {
        setGeneratedFormUrl(result.data?.form_url || '');
        setSnackbar({ 
          message: 'Formulario generado exitosamente', 
          severity: 'success' 
        });
        await loadPracticas();
      }
    } catch (error: any) {
      setSnackbar({ 
        message: `Error: ${error.message}`, 
        severity: 'error' 
      });
    } finally {
      setSendingForm(false);
    }
  };

  const handleCopyFormUrl = () => {
    if (generatedFormUrl) {
      navigator.clipboard.writeText(generatedFormUrl);
      setSnackbar({ 
        message: 'URL copiada al portapapeles', 
        severity: 'success' 
      });
    }
  };

  const handleOpenFormUrl = () => {
    if (generatedFormUrl) {
      window.open(generatedFormUrl, '_blank');
    }
  };

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

  const renderList = () => (
    <List disablePadding>
      {practicas.map((practice) => {
        const chip = estadoChips[practice.estado];
        const isActive = selectedPractice?.id === practice.id;
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
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={600}>
                      {`${practice.estudiante?.nombre ?? 'Estudiante'} ${practice.estudiante?.apellido ?? ''}`.trim() || 'Sin nombre'}
                    </Typography>
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
      {!loading && practicas.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            No hay fichas de práctica registradas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cuando un estudiante complete su ficha, aparecerá automáticamente en este listado.
          </Typography>
        </Paper>
      )}
    </List>
  );

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
      return (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Selecciona una ficha de la lista para ver el detalle
          </Typography>
        </Paper>
      );
    }

    const chip = estadoChips[selectedPractice.estado];
    const puedeEnviarFormulario = selectedPractice.estado === 'aprobada' && !selectedPractice.google_form_enviado;

    return (
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3 }} ref={detailRef}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5" component="h2" fontWeight={700}>
                {`${selectedPractice.estudiante?.nombre ?? 'Sin'} ${selectedPractice.estudiante?.apellido ?? 'nombre'}`.trim()}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {selectedPractice.tipo_practica}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip color={chip.color} label={chip.label} sx={{ fontWeight: 600 }} />
              {selectedPractice.google_form_enviado && (
                <Chip 
                  color="info" 
                  label={selectedPractice.google_form_respondido ? "Form Respondido" : "Form Enviado"} 
                  size="small" 
                />
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section title="Datos del estudiante" items={[
                { label: 'Nombre completo', value: `${selectedPractice.estudiante?.nombre ?? ''} ${selectedPractice.estudiante?.apellido ?? ''}`.trim() || '—' },
                { label: 'Carrera', value: selectedPractice.estudiante?.carrera ?? '—' },
                { label: 'Correo', value: selectedPractice.estudiante?.email ?? '—' },
                { label: 'Teléfono', value: selectedPractice.estudiante?.telefono ?? '—' },
              ]} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section title="Datos de la empresa" items={[
                { label: 'Razón social', value: selectedPractice.empresa?.razon_social ?? '—' },
                { label: 'Dirección', value: selectedPractice.empresa?.direccion ?? '—' },
                { label: 'Jefe directo', value: selectedPractice.empresa?.jefe_directo ?? '—' },
                { label: 'Cargo jefe', value: selectedPractice.empresa?.cargo_jefe ?? '—' },
                { label: 'Teléfono empresa', value: selectedPractice.empresa?.telefono ?? '—' },
                { label: 'Email empresa', value: selectedPractice.empresa?.email ?? '—' }
              ]} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section title="Información de la práctica" items={[
                { label: 'Fecha de inicio', value: formatDate(selectedPractice.fecha_inicio) },
                { label: 'Fecha de término', value: formatDate(selectedPractice.fecha_termino) },
                { label: 'Horario', value: selectedPractice.horario_trabajo || '—' },
                { label: 'Colación', value: selectedPractice.colacion || '—' },
                { label: 'Departamento', value: selectedPractice.departamento || '—' },
                { label: 'Cargo a desarrollar', value: selectedPractice.cargo_por_desarrollar || '—' }
              ]} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Section title="Documentos" items={[
                { label: 'Fecha firma alumno', value: formatDate(selectedPractice.fecha_firma ?? undefined) },
                { label: 'Firma alumno', value: selectedPractice.firma_alumno || '—' }
              ]} />
            </Grid>
            <Grid size={{ xs: 12}}>
              <Section title="Actividades" items={[{ label: '', value: selectedPractice.actividades || 'Sin actividades registradas.' }]} />
            </Grid>
          </Grid>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={pdfLoading ? <CircularProgress size={18} /> : <PictureAsPdfIcon />}
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            sx={{ minWidth: 200 }}
          >
            Descargar ficha (PDF)
          </Button>
          
          {puedeEnviarFormulario && (
            <Button
              variant="outlined"
              color="info"
              startIcon={<SendIcon />}
              onClick={() => setFormDialog(true)}
              sx={{ minWidth: 200 }}
            >
              Enviar Formulario Evaluación
            </Button>
          )}
          
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={selectedPractice.estado === 'aprobada' || decisionLoading}
            onClick={() => setDialog({ open: true, action: 'aprobada' })}
            sx={{ minWidth: 200 }}
          >
            Aprobar inscripción
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<CancelIcon />}
            disabled={selectedPractice.estado === 'rechazada' || decisionLoading}
            onClick={() => setDialog({ open: true, action: 'rechazada' })}
            sx={{ minWidth: 200 }}
          >
            Rechazar inscripción
          </Button>
        </Stack>
      </Stack>
    );
  };

  return (
    <DashboardTemplate title="Gestión de prácticas">
      <Box sx={{ mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4}}>
          {loading ? renderListSkeleton() : renderList()}
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          {renderDetail()}
        </Grid>
      </Grid>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, action: null })} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog.action === 'aprobada' ? 'Aprobar ficha de práctica' : 'Rechazar ficha de práctica'}</DialogTitle>
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
        open={formDialog} 
        onClose={() => {
          setFormDialog(false);
          setGeneratedFormUrl('');
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {generatedFormUrl ? 'Formulario Generado' : 'Enviar Formulario de Evaluación'}
        </DialogTitle>
        <DialogContent>
          {!generatedFormUrl ? (
            <>
              <DialogContentText paragraph>
                ¿Estás seguro de generar y enviar el formulario de evaluación confidencial al supervisor?
              </DialogContentText>
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Estudiante:</strong>
                </Typography>
                <Typography variant="body1" fontWeight={600} gutterBottom>
                  {selectedPractice?.estudiante?.nombre} {selectedPractice?.estudiante?.apellido}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                  <strong>Empresa:</strong>
                </Typography>
                <Typography variant="body1" fontWeight={600} gutterBottom>
                  {selectedPractice?.empresa?.razon_social}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                  <strong>Supervisor:</strong>
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedPractice?.empresa?.jefe_directo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPractice?.empresa?.email}
                </Typography>
              </Box>
              
              <Alert severity="info">
                Se generará un formulario personalizado con los datos de la práctica prellenados.
              </Alert>
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                ¡Formulario generado exitosamente!
              </Alert>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                URL del formulario:
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                value={generatedFormUrl}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyFormUrl}
                  fullWidth
                >
                  Copiar URL
                </Button>
                <Button
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  onClick={handleOpenFormUrl}
                  fullWidth
                >
                  Abrir Formulario
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFormDialog(false);
            setGeneratedFormUrl('');
          }}>
            {generatedFormUrl ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!generatedFormUrl && (
            <Button
              onClick={handleEnviarFormulario}
              variant="contained"
              disabled={sendingForm}
              startIcon={sendingForm ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {sendingForm ? 'Generando...' : 'Generar Formulario'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snackbar)} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {snackbar && (
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </DashboardTemplate>
  );
};

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