// src/pages/PracticaProfesionalForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardTemplate from '../components/DashboardTemplate';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { supabase } from '../services/supabaseClient';

interface FormData {
  razon_social: string;
  direccion: string;
  jefe_directo: string;
  cargo_jefe: string;
  telefono_empresa: string;
  email_empresa: string;
  tipo_practica: string;
  fecha_inicio: string;
  fecha_termino: string;
  horario_trabajo: string;
  colacion: string;
  cargo_por_desarrollar: string;
  departamento: string;
  actividades: string;
  fecha_firma: string;
  firma_alumno: string;
}

// user shape comes from supabase User; we use currentUser from useAuth()

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  carrera: string;
}

const PracticaProfesionalForm: React.FC = () => {
  // get current authenticated user from the AuthProvider
  const { currentUser } = useAuth();
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [estudianteLoading, setEstudianteLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});
  // navigation is handled by the app root; not used here

  const [formData, setFormData] = useState<FormData>({
    razon_social: '',
    direccion: '',
    jefe_directo: '',
    cargo_jefe: '',
    telefono_empresa: '',
    email_empresa: '',
    tipo_practica: 'Práctica I',
    fecha_inicio: '',
    fecha_termino: '',
    horario_trabajo: '',
    colacion: '',
    cargo_por_desarrollar: '',
    departamento: '',
    actividades: '',
    fecha_firma: '',
    firma_alumno: ''
  });

  // Authentication is handled by the application root (App.tsx).
  // This page no longer tries to fetch auth info directly; App.tsx should
  // provide `user` / `estudiante` via context or populate the DB as needed.
  useEffect(() => {
    let mounted = true;
    const loadEstudiante = async () => {
      setEstudianteLoading(true);
      if (!currentUser) {
        if (mounted) setEstudiante(null);
        setEstudianteLoading(false);
        return;
      }

      try {
        const { data: estudianteData, error } = await supabase
          .from('estudiantes')
          .select('id, nombre, apellido, carrera')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (!error && estudianteData) {
          if (mounted) {
            setEstudiante(estudianteData as Estudiante);
          }
        } else if (!estudianteData) {
          // create a minimal estudiante row if not present
          const { data: newEstudiante, error: createError } = await supabase
            .from('estudiantes')
            .insert([{
              user_id: currentUser.id,
              nombre: currentUser.user_metadata?.name || '',
              apellido: currentUser.user_metadata?.last_name || '',
              email: currentUser.email,
              telefono: '',
              carrera: 'Ingeniería Civil Informática'
            }])
            .select('id, nombre, apellido, carrera')
            .single();
          if (!createError && newEstudiante) {
            if (mounted) {
              setEstudiante(newEstudiante as Estudiante);
            }
          }
        }
      } catch (e) {
        console.warn('Failed loading/creating estudiante', e);
      } finally {
        if (mounted) setEstudianteLoading(false);
      }
    };
    void loadEstudiante();
    return () => { mounted = false };
  }, [currentUser]);

  useEffect(() => {
    const nombre = estudiante?.nombre || currentUser?.user_metadata?.name || '';
    const apellido = estudiante?.apellido || currentUser?.user_metadata?.last_name || '';
    const fullName = `${nombre} ${apellido}`.trim();
    if (!fullName) return;
    setFormData(prev => {
      if (prev.firma_alumno && prev.firma_alumno.trim().length > 0) return prev;
      return { ...prev, firma_alumno: fullName };
    });
  }, [estudiante?.nombre, estudiante?.apellido, currentUser?.user_metadata?.name, currentUser?.user_metadata?.last_name]);

  const isValidHorario = (value: string) => {
    // Formato HH:MM - HH:MM (24h)
    return /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
  };

  // Parsea horario "HH:MM - HH:MM" y retorna minutos desde 00:00
  const parseHorario = (value: string): { inicio: number; fin: number } | null => {
    if (!isValidHorario(value)) return null;
    const [a, b] = value.split('-').map(p => p.trim());
    const [h1, m1] = a.split(':').map(Number);
    const [h2, m2] = b.split(':').map(Number);
    return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
  };

  const collapseSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();

  const onlyLettersRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'.\- ]+$/; // nombres / cargos

  const MAX = {
    razon_social: 100,
    direccion: 120,
    jefe_directo: 60,
    cargo_jefe: 60,
    telefono_empresa: 20,
    email_empresa: 120,
    cargo_por_desarrollar: 80,
    departamento: 80,
    actividades: 1000,
    firma_alumno: 120
  } as const;

  const alumnoNombre = estudiante?.nombre || currentUser?.user_metadata?.name || '';
  const alumnoApellido = estudiante?.apellido || currentUser?.user_metadata?.last_name || '';
  const alumnoCarrera = estudiante?.carrera || 'Ingeniería Civil Informática';
  const alumnoNombreCompleto = `${alumnoNombre} ${alumnoApellido}`.trim();

  const validateForm = (data: FormData) => {
    const newErrors: Record<string,string> = {};
    const allowedPracticas = ['Práctica I','Práctica II'];
    const requiredFields: (keyof FormData)[] = [
      'razon_social','direccion','jefe_directo','cargo_jefe','telefono_empresa',
      'email_empresa','tipo_practica','fecha_inicio','fecha_termino','horario_trabajo',
      'colacion','cargo_por_desarrollar','departamento','actividades','fecha_firma','firma_alumno'
    ];

    requiredFields.forEach(f => {
      if (!data[f] || data[f].toString().trim() === '') {
        newErrors[f] = 'Requerido';
      }
    });

    if (data.email_empresa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_empresa))
      newErrors.email_empresa = 'Email inválido';
    if (data.email_empresa && data.email_empresa.length > MAX.email_empresa)
      newErrors.email_empresa = 'Email demasiado largo';

    if (data.telefono_empresa && !/^[+]?[\d\s()-]{6,20}$/.test(data.telefono_empresa))
      newErrors.telefono_empresa = 'Teléfono inválido';
    if (data.telefono_empresa && data.telefono_empresa.replace(/\D/g,'').length < 6)
      newErrors.telefono_empresa = 'Teléfono muy corto';

    // Longitudes + mínimos
    const len = (k: keyof FormData) => data[k]?.trim().length || 0;
    if (len('razon_social') < 3) newErrors.razon_social = 'Mínimo 3 caracteres';
    else if (len('razon_social') > MAX.razon_social) newErrors.razon_social = 'Máximo ' + MAX.razon_social;
  if (len('direccion') < 5) newErrors.direccion = 'Mínimo 5 caracteres';
  else if (len('direccion') > MAX.direccion) newErrors.direccion = 'Máximo ' + MAX.direccion;
  // No se valida caracteres especiales en dirección, se permite cualquier texto
    if (len('jefe_directo') < 3) newErrors.jefe_directo = 'Mínimo 1';
    else if (len('jefe_directo') > MAX.jefe_directo) newErrors.jefe_directo = 'Máximo ' + MAX.jefe_directo;
    if (len('cargo_jefe') < 3) newErrors.cargo_jefe = 'Mínimo 1';
    else if (len('cargo_jefe') > MAX.cargo_jefe) newErrors.cargo_jefe = 'Máximo ' + MAX.cargo_jefe;
    if (len('cargo_por_desarrollar') < 3) newErrors.cargo_por_desarrollar = 'Mínimo 1';
    else if (len('cargo_por_desarrollar') > MAX.cargo_por_desarrollar) newErrors.cargo_por_desarrollar = 'Máximo ' + MAX.cargo_por_desarrollar;
    if (len('departamento') < 3) newErrors.departamento = 'Mínimo 1';
    else if (len('departamento') > MAX.departamento) newErrors.departamento = 'Máximo ' + MAX.departamento;
    if (len('actividades') > 0 && len('actividades') > MAX.actividades) newErrors.actividades = 'Máximo ' + MAX.actividades + ' caracteres';
    if (len('firma_alumno') > MAX.firma_alumno) newErrors.firma_alumno = 'Máximo ' + MAX.firma_alumno;

    // Solo letras para algunos campos
    ['jefe_directo','cargo_jefe','cargo_por_desarrollar','departamento','firma_alumno'].forEach(k => {
      const val = (data as any)[k];
      if (val && !onlyLettersRegex.test(val)) {
        newErrors[k] = 'Caracteres no permitidos';
      }
    });

    // Campos que deben representar SOLO UN valor (no listas)
    const singleValueFields: (keyof FormData)[] = ['jefe_directo','cargo_jefe','cargo_por_desarrollar','departamento'];
    singleValueFields.forEach(k => {
      const raw = (data as any)[k] as string | undefined;
      if (!raw) return;
      if (/[;,/\\&+]/.test(raw)) {
        if (!newErrors[k]) newErrors[k] = 'Ingrese solo un valor (sin separadores)';
        return;
      }
      // Evitar múltiples valores unidos por " y " o " e " de forma listada
      if (/\b(y|e)\b/i.test(raw) && raw.trim().split(/\s+/).length > 3) {
        if (!newErrors[k]) newErrors[k] = 'Solo un valor, no una lista';
        return;
      }
      const wordCount = raw.trim().split(/\s+/).length;
      if (wordCount > 4) { // margen para nombres compuestos
        if (!newErrors[k]) newErrors[k] = 'Demasiadas palabras';
      }
    });

    if (data.fecha_inicio && data.fecha_termino) {
      const start = new Date(data.fecha_inicio);
      const end = new Date(data.fecha_termino);
      if (end < start) newErrors.fecha_termino = 'Debe ser posterior a inicio';
      const diffDays = (end.getTime() - start.getTime()) / (1000*60*60*24) + 1;
      if (diffDays < 49) newErrors.fecha_termino = 'Duración mínima 7 semanas (≈49 días)';
    }

    if (data.fecha_firma) {
      const firma = new Date(data.fecha_firma);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (firma > new Date(data.fecha_inicio)) {
        newErrors.fecha_firma = 'No posterior al inicio';
      }
      if (firma > today) {
        newErrors.fecha_firma = 'No puede ser futura';
      }
    }

    if (data.horario_trabajo && !isValidHorario(data.horario_trabajo))
      newErrors.horario_trabajo = 'Formato HH:MM - HH:MM';

    if (data.colacion && !isValidHorario(data.colacion))
      newErrors.colacion = 'Formato HH:MM - HH:MM';

    // Validaciones de rangos horarios
    const ht = parseHorario(data.horario_trabajo);
    const hc = parseHorario(data.colacion);
    if (ht) {
      if (ht.fin <= ht.inicio) newErrors.horario_trabajo = 'Fin debe ser mayor que inicio';
      if (ht.fin - ht.inicio < 4 * 60) newErrors.horario_trabajo = 'Duración mínima 4h';
    }
    if (ht && hc) {
      if (hc.inicio < ht.inicio || hc.fin > ht.fin) newErrors.colacion = 'Colación fuera de horario';
      if (hc.fin - hc.inicio < 30) newErrors.colacion = 'Mínimo 30 min';
    }

    if (alumnoNombreCompleto) {
      if (data.firma_alumno.trim().toLowerCase() !== alumnoNombreCompleto.toLowerCase()) {
        newErrors.firma_alumno = 'Debe coincidir con su nombre y apellido';
      }
    }

    if (data.actividades && data.actividades.trim().length < 20)
      newErrors.actividades = 'Detalle mínimo 20 caracteres';

    // Evitar texto repetitivo simple (ej: "aaaaaa" o un solo término)
    if (data.actividades && /^(\w+)\s*$/i.test(data.actividades.trim()) && data.actividades.trim().length < 30) {
      newErrors.actividades = 'Amplíe la descripción';
    }

    // Validar tipo_practica permitido
    if (!allowedPracticas.includes(data.tipo_practica)) {
      newErrors.tipo_practica = 'Valor no permitido';
    }

    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (prev[name]) {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      }
      return prev;
    });
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (prev[name]) {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    // Normalizar todos los campos antes de validar
    const normalized: FormData = {
      ...formData,
      razon_social: collapseSpaces(formData.razon_social),
      direccion: collapseSpaces(formData.direccion),
      jefe_directo: collapseSpaces(formData.jefe_directo),
      cargo_jefe: collapseSpaces(formData.cargo_jefe),
      telefono_empresa: collapseSpaces(formData.telefono_empresa),
      email_empresa: formData.email_empresa.trim(),
      horario_trabajo: collapseSpaces(formData.horario_trabajo),
      colacion: collapseSpaces(formData.colacion),
      cargo_por_desarrollar: collapseSpaces(formData.cargo_por_desarrollar),
      departamento: collapseSpaces(formData.departamento),
      actividades: collapseSpaces(formData.actividades),
      firma_alumno: collapseSpaces(formData.firma_alumno)
    };
    setFormData(normalized);
    const valErrors = validateForm(normalized);
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      setMessage({ type: 'error', text: 'Corrija los errores del formulario.' });
      return;
    }

    setLoading(true);
    try {
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
  .eq('razon_social', normalized.razon_social)
  .eq('email', normalized.email_empresa)
        .single();

      let empresaId;
      if (empresaError || !empresaData) {
        const { data: newEmpresa, error: newEmpresaError } = await supabase
          .from('empresas')
          .insert([{
            razon_social: normalized.razon_social,
            direccion: normalized.direccion,
            jefe_directo: normalized.jefe_directo,
            cargo_jefe: normalized.cargo_jefe,
            telefono: normalized.telefono_empresa,
            email: normalized.email_empresa
          }])
          .select()
          .single();
        if (newEmpresaError) throw newEmpresaError;
        empresaId = newEmpresa.id;
      } else {
        empresaId = empresaData.id;
      }

      const { data: practicaInserted, error: practicaError } = await supabase
        .from('practicas')
        .insert([{
          estudiante_id: estudiante?.id,
            empresa_id: empresaId,
            tipo_practica: normalized.tipo_practica,
            fecha_inicio: normalized.fecha_inicio,
            fecha_termino: normalized.fecha_termino,
            horario_trabajo: normalized.horario_trabajo,
            colacion: normalized.colacion,
            cargo_por_desarrollar: normalized.cargo_por_desarrollar,
            departamento: normalized.departamento,
            actividades: normalized.actividades,
            fecha_firma: normalized.fecha_firma,
            firma_alumno: normalized.firma_alumno,
            estado: 'pendiente'
        }])
        .select('id')
        .single();

      if (practicaError) throw practicaError;

      // Send notification to all coordinators (synchronously) so the UI shows aggregated result
      try {
        const practiceId = (practicaInserted as any)?.id ?? null;

        // fetch all coordinators
        const { data: coords, error: coordsErr } = await supabase
          .from('coordinadores')
          .select('email, nombre, apellido');

        let recipients: Array<{ email: string; nombre?: string; apellido?: string }> = [];
        if (!coordsErr && Array.isArray(coords) && coords.length > 0) {
          recipients = coords.map((c: any) => ({ email: c.email, nombre: c.nombre, apellido: c.apellido })).filter(r => !!r.email);
        }

        // If no coordinators, fallback to the test recipient so we can validate delivery
        if (recipients.length === 0) {
          recipients = [{ email: 'niconicotu@gmail.com', nombre: undefined, apellido: undefined }];
        }

        const results: string[] = [];

        for (const r of recipients) {
          const payload = {
            to: r.email,
            coordinator_name: `${r.nombre ?? ''} ${r.apellido ?? ''}`.trim(),
            estudiante_nombre: estudiante?.nombre ?? '',
            estudiante_apellido: estudiante?.apellido ?? '',
            tipo_practica: normalized.tipo_practica,
            practica_id: practiceId,
            empresa: normalized.razon_social,
            fecha_inicio: normalized.fecha_inicio,
            fecha_termino: normalized.fecha_termino
          };

          let sent = false;
          let errors: string[] = [];

          // 1) Try Supabase Edge Function (use deployed name)
          if ((supabase as any).functions && typeof (supabase as any).functions.invoke === 'function') {
            try {
              // add timeout so invocation doesn't hang forever
              const invokePromise = (supabase as any).functions.invoke('send-email-brevo', { body: JSON.stringify(payload) });
              await Promise.race([invokePromise, new Promise((_, reject) => setTimeout(() => reject(new Error('invoke timeout')), 10000))]);
              sent = true;
            } catch (fnErr) {
              console.warn('Supabase function invocation failed for', r.email, fnErr);
              errors.push('function:' + String(fnErr));
            }
          }

          // 2) Fallback to external mailer
          if (!sent) {
            const mailerUrl = (import.meta as any).env?.VITE_MAILER_URL as string | undefined;
            if (mailerUrl) {
              try {
                // fetch with timeout
                const fetchPromise = fetch(mailerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) });
                const resp = await Promise.race([fetchPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('fetch timeout')), 10000))]);
                if ((resp as Response).ok) sent = true;
                else {
                  const txt = await (resp as Response).text();
                  errors.push('mailer:' + txt);
                }
              } catch (mailErr) {
                console.warn('External mailer failed for', r.email, mailErr);
                errors.push('mailerErr:' + String(mailErr));
              }
            }
          }

          // 3) DB fallback
          if (!sent) {
            try {
              await supabase.from('notificaciones').insert([{ to: r.email, subject: `Nueva inscripción - ${formData.tipo_practica}`, body: JSON.stringify(payload), created_at: new Date() }]);
              errors.push('notificacion_inserted');
            } catch (insertErr) {
              console.warn('Failed to insert notification record for', r.email, insertErr);
              errors.push('insertErr:' + String(insertErr));
            }
          }

          if (sent) results.push(`${r.email}:ok`);
          else results.push(`${r.email}:fail(${errors.join('|')})`);
        }

        // Summarize results
        const okCount = results.filter(s => s.includes(':ok')).length;
        const failCount = results.length - okCount;
        if (failCount === 0) {
          setMessage({ type: 'success', text: `Formulario enviado correctamente. Notificación enviada a ${okCount} coordinador(es).` });
        } else {
          setMessage({ type: 'error', text: `Formulario enviado. Éxitos: ${okCount}, Fallos: ${failCount}. Detalles: ${results.join('; ')}` });
        }
      } catch (notifyErr) {
        console.warn('Unexpected error notifying coordinators:', notifyErr);
        setMessage({ type: 'error', text: 'Formulario enviado, pero ocurrió un error al notificar a los coordinadores.' });
      }

    // notification handled above (synchronous test flow)

      setFormData({
        razon_social: '',
        direccion: '',
        jefe_directo: '',
        cargo_jefe: '',
        telefono_empresa: '',
        email_empresa: '',
        tipo_practica: 'Práctica I',
        fecha_inicio: '',
        fecha_termino: '',
        horario_trabajo: '',
        colacion: '',
        cargo_por_desarrollar: '',
        departamento: '',
        actividades: '',
        fecha_firma: '',
        firma_alumno: ''
      });
      setErrors({});
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error al enviar el formulario: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Render even if auth info isn't present here; App.tsx will manage authentication.
  // Disable submit if we don't have the necessary user/estudiante to create records.

  return (
    <DashboardTemplate>
      <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography
          component="h1"
          variant="h4"
          align="center"
          gutterBottom
          sx={{ backgroundColor: '#fff', color: '#000', p: 2, borderRadius: 1 }}
        >
          Ficha de inscripción de práctica profesional
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        {currentUser && estudianteLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Cargando datos del alumno...
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Datos del alumno:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField fullWidth label="Nombre" value={alumnoNombre} disabled />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField fullWidth label="Apellido" value={alumnoApellido} disabled />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField fullWidth label="Email" value={currentUser?.email ?? ''} disabled />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField fullWidth label="Carrera" value={alumnoCarrera} disabled />
            </Box>
          </Box>

            <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Datos de la empresa/institución:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                label="Razón social"
                name="razon_social"
                value={formData.razon_social}
                onChange={handleChange}
                error={!!errors.razon_social}
                helperText={errors.razon_social}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                label="Dirección"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                error={!!errors.direccion}
                helperText={errors.direccion}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Jefe directo"
                name="jefe_directo"
                value={formData.jefe_directo}
                onChange={handleChange}
                error={!!errors.jefe_directo}
                helperText={errors.jefe_directo}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Cargo del jefe"
                name="cargo_jefe"
                value={formData.cargo_jefe}
                onChange={handleChange}
                error={!!errors.cargo_jefe}
                helperText={errors.cargo_jefe}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Teléfono"
                name="telefono_empresa"
                value={formData.telefono_empresa}
                onChange={handleChange}
                error={!!errors.telefono_empresa}
                helperText={errors.telefono_empresa}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Email"
                name="email_empresa"
                type="email"
                value={formData.email_empresa}
                onChange={handleChange}
                error={!!errors.email_empresa}
                helperText={errors.email_empresa}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Datos de la práctica:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <FormControl fullWidth error={!!errors.tipo_practica}>
                <InputLabel>Tipo de práctica</InputLabel>
                <Select
                  name="tipo_practica"
                  value={formData.tipo_practica}
                  label="Tipo de práctica"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="Práctica I">Práctica I</MenuItem>
                  <MenuItem value="Práctica II">Práctica II</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Fecha de inicio"
                name="fecha_inicio"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.fecha_inicio}
                onChange={handleChange}
                error={!!errors.fecha_inicio}
                helperText={errors.fecha_inicio}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Fecha de término"
                name="fecha_termino"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.fecha_termino}
                onChange={handleChange}
                error={!!errors.fecha_termino}
                helperText={errors.fecha_termino}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                *Considerar 7 semanas de práctica aproximadamente con jornada de 45 hrs (315 horas)
              </Typography>
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Horario Trabajo"
                name="horario_trabajo"
                placeholder="Ej: 09:00 - 18:00"
                value={formData.horario_trabajo}
                onChange={handleChange}
                error={!!errors.horario_trabajo}
                helperText={errors.horario_trabajo || 'Formato HH:MM - HH:MM'}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Horario Colación"
                name="colacion"
                placeholder="Ej: 13:00 - 14:00"
                value={formData.colacion}
                onChange={handleChange}
                error={!!errors.colacion}
                helperText={errors.colacion || 'Formato HH:MM - HH:MM'}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                label="Cargo por desarrollar"
                name="cargo_por_desarrollar"
                value={formData.cargo_por_desarrollar}
                onChange={handleChange}
                error={!!errors.cargo_por_desarrollar}
                helperText={errors.cargo_por_desarrollar}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                label="Departamento en que trabajará"
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                error={!!errors.departamento}
                helperText={errors.departamento}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                label="Actividades por realizar"
                name="actividades"
                multiline
                rows={4}
                value={formData.actividades}
                onChange={handleChange}
                error={!!errors.actividades}
                helperText={errors.actividades || 'Describa con detalle (mínimo 20 caracteres)'}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Fecha de firma"
                name="fecha_firma"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.fecha_firma}
                onChange={handleChange}
                error={!!errors.fecha_firma}
                helperText={errors.fecha_firma}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                required
                fullWidth
                label="Firma Alumno (nombre completo)"
                name="firma_alumno"
                placeholder="Ingrese su nombre completo como firma"
                value={formData.firma_alumno}
                onChange={handleChange}
                error={!!errors.firma_alumno}
                helperText={errors.firma_alumno || alumnoNombreCompleto}
              />
            </Box>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !currentUser || estudianteLoading}
          >
            {loading ? 'Enviando...' : 'Enviar Formulario'}
          </Button>
        </Box>
      </Paper>
    </Container>
    </DashboardTemplate>
  );
};

export default PracticaProfesionalForm;