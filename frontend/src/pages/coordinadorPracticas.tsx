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

import DashboardTemplate from '../components/DashboardTemplate';
import { supabase } from '../services/supabaseClient';
import { practicaService } from '../services/practicaService';
import { sendBrevoEmail } from '../services/brevoEmailService';
import { getEmailTemplate } from '../services/emailTemplates';
import { useAuth } from '../hooks/useAuth';
import { evaluacionSupervisorService } from '../services/evaluacionSupervisorService';

import { enviarEmailEvaluacion } from '../services/enviarEmailEvaluacion';

import type { Practica } from '../types/database';
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

interface DecisionEmailResult {
  emailEnviado: boolean;
  notificacionRegistrada: boolean;
  errores: string[];
}

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
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; action: DecisionAction | null }>({ open: false, action: null });
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de diálogos
  const [dialogEvaluacion, setDialogEvaluacion] = useState(false);
  
  // Otros estados
  const [generandoEnlace, setGenerandoEnlace] = useState(false);
  
  // Estados de evaluación
  const [enlaceGenerado, setEnlaceGenerado] = useState<string | null>(null);
  const [evaluacionExistente, setEvaluacionExistente] = useState<any>(null);
  
  // Refs
  const verificacionEnCurso = useRef(false);
  const ultimaPracticaVerificada = useRef<string | null>(null);

  // Auth
  const { currentUser } = useAuth();

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
    if (!selectedPractice) {
      setSnackbar({ message: 'No hay práctica seleccionada para descargar.', severity: 'warning' });
      return;
    }
    
    setPdfLoading(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 16;
      const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const lineHeight = 7;
      let cursorY = 20;

      const ensureSpace = (needed = lineHeight) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (cursorY + needed > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
      };

      const writeText = (text: string, options?: { bold?: boolean }) => {
        const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string) => {
          ensureSpace();
          if (options?.bold) doc.setFont('helvetica', 'bold');
          else doc.setFont('helvetica', 'normal');
          doc.text(line, margin, cursorY);
          cursorY += lineHeight;
        });
      };

      const writeSection = (title: string, rows: Array<{ label: string; value: string | null | undefined }>) => {
        ensureSpace(lineHeight * 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(title, margin, cursorY);
        cursorY += lineHeight;
        doc.setFontSize(11);
        rows.forEach(({ label, value }) => {
          const display = value && value.toString().trim() !== '' ? value : '—';
          writeText(`${label}: ${display}`);
        });
        cursorY += 2;
      };

      const fullName = `${selectedPractice.estudiante?.nombre ?? ''} ${selectedPractice.estudiante?.apellido ?? ''}`.trim();
      const generatedAt = formatDateShort(new Date().toISOString());
      const statusLabel = estadoChips[selectedPractice.estado]?.label ?? selectedPractice.estado;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Ficha de práctica profesional', margin, cursorY);
      cursorY += lineHeight;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      writeText(`Generado el ${generatedAt}`);
      writeText(`Estado actual: ${statusLabel}`);
      cursorY += 4;

      writeSection('Datos del estudiante', [
        { label: 'Nombre completo', value: fullName || '—' },
        { label: 'Carrera', value: selectedPractice.estudiante?.carrera ?? '—' },
        { label: 'Correo', value: selectedPractice.estudiante?.email ?? '—' },
        { label: 'Teléfono', value: selectedPractice.estudiante?.telefono ?? '—' }
      ]);

      writeSection('Datos de la empresa', [
        { label: 'Razón social', value: selectedPractice.empresa?.razon_social ?? '—' },
        { label: 'Dirección', value: selectedPractice.empresa?.direccion ?? '—' },
        { label: 'Jefe directo', value: selectedPractice.empresa?.jefe_directo ?? '—' },
        { label: 'Cargo del jefe', value: selectedPractice.empresa?.cargo_jefe ?? '—' },
        { label: 'Teléfono empresa', value: selectedPractice.empresa?.telefono ?? '—' },
        { label: 'Correo empresa', value: selectedPractice.empresa?.email ?? '—' }
      ]);

      writeSection('Detalle de la práctica', [
        { label: 'Tipo de práctica', value: selectedPractice.tipo_practica },
        { label: 'Fecha de inicio', value: formatDate(selectedPractice.fecha_inicio) },
        { label: 'Fecha de término', value: formatDate(selectedPractice.fecha_termino) },
        { label: 'Horario', value: selectedPractice.horario_trabajo || '—' },
        { label: 'Colación', value: selectedPractice.colacion || '—' },
        { label: 'Departamento', value: selectedPractice.departamento || '—' },
        { label: 'Cargo a desarrollar', value: selectedPractice.cargo_por_desarrollar || '—' }
      ]);

      writeSection('Actividades declaradas', [
        { label: 'Descripción', value: selectedPractice.actividades || 'Sin actividades registradas.' }
      ]);

      writeSection('Firmas y documentación', [
        { label: 'Fecha de firma del alumno', value: formatDate(selectedPractice.fecha_firma ?? undefined) },
        { label: 'Firma del alumno', value: selectedPractice.firma_alumno ?? '—' }
      ]);

      const filename = `ficha-practica-${(fullName || selectedPractice.id).replace(/[^a-zA-Z0-9_-]+/g, '-')}.pdf`;
      doc.save(filename.toLowerCase());
      setSnackbar({ message: 'Ficha descargada correctamente.', severity: 'success' });
    } catch (error) {
      console.error('Error generando PDF', error);
      setSnackbar({ message: 'No se pudo generar el PDF. Inténtalo nuevamente.', severity: 'error' });
    } finally {
      setPdfLoading(false);
    }
  };

  // Generar enlace de evaluación
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

  // Copiar enlace (sin alert)
  const handleCopiarEnlace = async () => {
    if (!enlaceGenerado) return;

    try {
      await navigator.clipboard.writeText(enlaceGenerado);
      setSnackbar({ message: 'Enlace copiado al portapapeles', severity: 'success' });
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
      setSnackbar({ message: 'Enlace copiado al portapapeles', severity: 'success' });
    }
  };

  // Enviar email con enlace de evaluación
  const handleEnviarEnlacePorEmail = async () => {
    if (!selectedPractice?.empresa?.email || !enlaceGenerado) {
      setSnackbar({ 
        message: 'No se puede enviar: falta email o enlace',
        severity: 'error'
      });
      return;
    }
    
    try {
      // Obtener nombre del coordinador
      const metadataFullName = (currentUser?.user_metadata?.full_name as string | undefined)?.trim();
      const metadataNameParts = `${currentUser?.user_metadata?.name ?? ''} ${currentUser?.user_metadata?.last_name ?? ''}`.trim();
      const coordinatorName = metadataFullName || metadataNameParts || 'Coordinación de Prácticas';
      
      const estudianteNombre = selectedPractice.estudiante?.nombre ?? '';
      const estudianteApellido = selectedPractice.estudiante?.apellido ?? '';
      const nombreCompleto = `${estudianteNombre} ${estudianteApellido}`.trim() || 'Estudiante';
      
      // Preparar email con plantilla profesional
      const emailData = getEmailTemplate('generico', {
        subject: '📋 Solicitud de Evaluación de Práctica Profesional',
        mensaje_html: `
          <h2 style="color: #1976d2;">📋 Evaluación de Práctica Profesional</h2>
          
          <p style="font-size: 15px; line-height: 1.6;">
            Estimado/a Supervisor/a de <strong>${selectedPractice.empresa?.razon_social || 'la empresa'}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6;">
            Le solicitamos completar la evaluación de práctica profesional del estudiante <strong>${nombreCompleto}</strong> 
            de la Universidad Autónoma de Chile.
          </p>
          
          <table width="100%" cellpadding="15" style="background-color: #e3f2fd; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1976d2;">
            <tr>
              <td>
                <h3 style="margin: 0 0 15px 0; color: #0d47a1;">📋 Datos del Estudiante</h3>
                <table width="100%" cellpadding="6">
                  <tr>
                    <td style="color: #0d47a1; font-size: 14px;"><strong>Nombre:</strong></td>
                    <td style="color: #1565c0; font-size: 14px;">${nombreCompleto}</td>
                  </tr>
                  ${selectedPractice.estudiante?.carrera ? `
                  <tr>
                    <td style="color: #0d47a1; font-size: 14px;"><strong>Carrera:</strong></td>
                    <td style="color: #1565c0; font-size: 14px;">${selectedPractice.estudiante.carrera}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="color: #0d47a1; font-size: 14px;"><strong>Tipo de Práctica:</strong></td>
                    <td style="color: #1565c0; font-size: 14px;">${selectedPractice.tipo_practica}</td>
                  </tr>
                  <tr>
                    <td style="color: #0d47a1; font-size: 14px;"><strong>Cargo:</strong></td>
                    <td style="color: #1565c0; font-size: 14px;">${selectedPractice.cargo_por_desarrollar || 'No especificado'}</td>
                  </tr>
                  <tr>
                    <td style="color: #0d47a1; font-size: 14px;"><strong>Periodo:</strong></td>
                    <td style="color: #1565c0; font-size: 14px;">${formatDateShort(selectedPractice.fecha_inicio)} - ${formatDateShort(selectedPractice.fecha_termino)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <table width="100%" cellpadding="20" style="background-color: #fff3e0; border-radius: 6px; margin: 20px 0;">
            <tr>
              <td style="text-align: center;">
                <h3 style="margin: 0 0 15px 0; color: #e65100;">🔗 Enlace de Evaluación</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                  Por favor, haga clic en el siguiente botón para acceder al formulario de evaluación:
                </p>
                <a href="${enlaceGenerado}" 
                   style="display: inline-block; 
                          background-color: #1976d2; 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          font-size: 16px;">
                  Completar Evaluación
                </a>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                  O copie este enlace en su navegador:<br>
                  <span style="font-family: monospace; font-size: 11px; color: #666;">${enlaceGenerado}</span>
                </p>
              </td>
            </tr>
          </table>
          
          <table width="100%" cellpadding="15" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
            <tr>
              <td>
                <h4 style="margin: 0 0 10px 0; color: #333;">⏱️ Importante:</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                  <li>El formulario le tomará aproximadamente 5-10 minutos</li>
                  <li>La evaluación es fundamental para el proceso académico del estudiante</li>
                  <li>Sus respuestas son confidenciales</li>
                  <li>Si tiene alguna consulta, puede contactarnos</li>
                </ul>
              </td>
            </tr>
          </table>
          
          <p style="font-size: 15px; line-height  estado?: string;
: 1.6; margin-top: 20px;">
            Agradecemos su colaboración en la formación profesional de nuestros estudiantes.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Atentamente,<br>
            <strong>${coordinatorName}</strong><br>
            Coordinación de Prácticas Profesionales<br>
            Universidad Autónoma de Chile
          </p>
        `
      });
      
      // Enviar email
      await sendBrevoEmail({
        to: selectedPractice.empresa.email,
        subject: emailData.subject,
        mensaje_html: emailData.html
      });
      
      setSnackbar({ 
        message: `✅ Email enviado a: ${selectedPractice.empresa.email}`,
        severity: 'success'
      });
      setDialogEvaluacion(false);
      
    } catch (error) {
      console.error('Error enviando email:', error);
      setSnackbar({ 
        message: `❌ Error al enviar email: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        severity: 'error'
      });
    }
  };

  // Enviar email de decisión
  const sendDecisionEmail = async (practice: NormalizedPractice, action: DecisionAction): Promise<DecisionEmailResult> => {
    const destinatario = practice.estudiante?.email;
    if (!destinatario) {
      return { emailEnviado: false, notificacionRegistrada: false, errores: ['sin-correo'] };
    }

    const metadataFullName = (currentUser?.user_metadata?.full_name as string | undefined)?.trim();
    const metadataNameParts = `${currentUser?.user_metadata?.name ?? ''} ${currentUser?.user_metadata?.last_name ?? ''}`.trim();
    const coordinatorName = metadataFullName || metadataNameParts || 'Coordinación de Prácticas';

    const estudianteNombre = practice.estudiante?.nombre ?? '';
    const estudianteApellido = practice.estudiante?.apellido ?? '';
    const estadoLabel = action === 'aprobada' ? 'aprobada' : 'rechazada';

    // Usar plantilla profesional mejorada
    const emailData = getEmailTemplate('cambio_estado', {
      coordinator_name: coordinatorName,
      estudiante_nombre: estudianteNombre,
      estudiante_apellido: estudianteApellido,
      tipo_practica: practice.tipo_practica,
      practica_id: practice.id,
      empresa: practice.empresa?.razon_social ?? '',
      fecha_inicio: practice.fecha_inicio,
      fecha_termino: practice.fecha_termino,
      estado: estadoLabel,
    });

    const payload = {
      to: destinatario,
      subject: emailData.subject,
      coordinator_name: coordinatorName,
      estudiante_nombre: estudianteNombre,
      estudiante_apellido: estudianteApellido,
      tipo_practica: practice.tipo_practica,
      practica_id: practice.id,
      empresa: practice.empresa?.razon_social ?? '',
      fecha_inicio: practice.fecha_inicio,
      fecha_termino: practice.fecha_termino,
      estado: estadoLabel,
      mensaje_html: emailData.html
    };

    let enviado = false;
    const errores: string[] = [];
    let notificacionRegistrada = false;

    try {
      await sendBrevoEmail(payload);
      enviado = true;
    } catch (error) {
      console.warn('Fallo envío vía función', error);
      errores.push('function:' + (error instanceof Error ? error.message : String(error)));
    }

    if (!enviado) {
      try {
        const detallePrevio = errores.length > 0 ? errores.join('; ') : null;
        const { error: insercionError } = await supabase.from('notificaciones').insert([{
          practica_id: practice.id,
          destinatario,
          asunto: emailData.subject,
          cuerpo: payload,
          estado: 'pendiente',
          error: detallePrevio
        }]);

        if (insercionError) {
          errores.push('insert:' + insercionError.message);
          throw insercionError;
        }

        notificacionRegistrada = true;
      } catch (error) {
        console.warn('Fallo registro notificación', error);
        errores.push('insert:' + (error instanceof Error ? error.message : String(error)));
      }
    }

    return { emailEnviado: enviado, notificacionRegistrada, errores };
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

  const resultadoNotificacion = await sendDecisionEmail(updatedPractice, action);

      const baseMessage =
        action === 'aprobada'
          ? 'Ficha aprobada correctamente.'
          : 'Ficha rechazada correctamente.';

      let message = baseMessage;
      let severity: 'success' | 'warning' | 'error' = 'success';
  const detalleTecnico = (resultadoNotificacion?.errores ?? []).join(' | ');

      if (resultadoNotificacion.emailEnviado) {
        message += ' Se notificó al estudiante por correo electrónico.';
      } else if (resultadoNotificacion.notificacionRegistrada) {
        message +=
          ' No se pudo enviar el correo, pero se registró en la bandeja de notificaciones para seguimiento manual.';
        severity = 'warning';
        if (detalleTecnico) {
          message += ` Detalle técnico: ${detalleTecnico}.`;
        }
      } else {
        if (!resultadoNotificacion.errores.includes('sin-correo')) {
          message += ' No se logró notificar al estudiante. Por favor avisa manualmente.';
          severity = 'error';
          if (detalleTecnico) {
            message += ` Detalle técnico: ${detalleTecnico}.`;
          }
        } else {
          message += ' El estudiante no tiene correo registrado en la ficha.';
          severity = 'warning';
        }
      }

      setSnackbar({ message, severity });
    } catch (error) {
      console.error('Error actualizando estado de práctica', error);
      setSnackbar({ message: 'No se pudo actualizar el estado. Intenta nuevamente.', severity: 'error' });
    } finally {
      setDecisionLoading(false);
      setDialog({ open: false, action: null });
    }
  };

  // Cierre de snackbar
  const handleSnackbarClose = () => setSnackbar(null);

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
                border: (theme) => `2px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                backgroundColor: isActive ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
                '&:hover': {
                  backgroundColor: isActive ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  }
                }
              }}
            >
              <Stack sx={{ width: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight={600} 
                    sx={{ 
                      flex: 1,
                      color: isActive ? 'primary.main' : 'inherit'
                    }}
                  >
                    {`${practice.estudiante?.nombre ?? 'Estudiante'} ${practice.estudiante?.apellido ?? ''}`.trim() || 'Sin nombre'}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    <Chip
                      size="small"
                      color={chip.color}
                      label={chip.label}
                      sx={{
                        fontWeight: 600,
                        textTransform: 'uppercase'
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
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography 
                    variant="body2" 
                    component="span" 
                    sx={{ 
                      display: 'block',
                      color: 'text.secondary'
                    }}
                  >
                    {practice.tipo_practica}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="span" 
                    sx={{ 
                      display: 'block',
                      color: 'text.secondary'
                    }}
                  >
                    Enviada el {formatDateShort(practice.created_at)}
                  </Typography>
                </Stack>
              </Stack>
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
  <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
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
                  ✅ Evaluación completada
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  Respondida el {new Date(evaluacionExistente.fecha_respuesta).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
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
              <Stack spacing={1.5}>
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
                
                {evaluacionExistente?.email_enviado && evaluacionExistente?.fecha_envio_email && (
                  <Alert severity="info">
                    <Box>
                      <Typography variant="caption" fontWeight={600}>
                        Email enviado el {new Date(evaluacionExistente.fecha_envio_email).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        Destinatario: {evaluacionExistente.email_supervisor}
                      </Typography>
                    </Box>
                  </Alert>
                )}
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

      {snackbar && (
        <Snackbar open autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
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