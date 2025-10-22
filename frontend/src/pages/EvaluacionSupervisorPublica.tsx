import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { evaluacionSupervisorService } from '../../../../consultoria_informatica/frontend/src/services/evaluacionSupervisorService';
import type { EvaluacionData } from '../../../../consultoria_informatica/frontend/src/services/evaluacionSupervisorService';

const EvaluacionSupervisorPublica = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValido, setTokenValido] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [evaluacionData, setEvaluacionData] = useState<any>(null);
  const [completado, setCompletado] = useState(false);
  
  const [formData, setFormData] = useState({
    // Aspectos técnicos
    calidad_trabajo: 0,
    efectividad_trabajo: 0,
    conocimientos_profesionales: 0,
    adaptabilidad_cambios: 0,
    organizacion_trabajo: 0,
    observaciones_tecnicas: '',
    
    // Aspectos personales
    interes_trabajo: 0,
    responsabilidad: 0,
    cooperacion: 0,
    creatividad: 0,
    iniciativa: 0,
    integracion_grupo: 0,
    
    // Preguntas finales
    considera_positivo_recibir_alumnos: '' as 'SI' | 'NO' | '',
    especialidad_requerida: '',
    comentarios_adicionales: ''
  });
  
  useEffect(() => {
    validarToken();
  }, [token]);
  
  const validarToken = async () => {
    if (!token) {
      setErrorMessage('Token no proporcionado');
      setLoading(false);
      return;
    }
    
    const result = await evaluacionSupervisorService.validarToken(token);
    
    if (result.success && result.data) {
      setTokenValido(true);
      setEvaluacionData(result.data);
    } else {
      setErrorMessage(result.error || 'Token inválido o expirado');
    }
    
    setLoading(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que todos los campos numéricos estén completos
    const camposNumericos = [
      'calidad_trabajo', 'efectividad_trabajo', 'conocimientos_profesionales',
      'adaptabilidad_cambios', 'organizacion_trabajo', 'interes_trabajo',
      'responsabilidad', 'cooperacion', 'creatividad', 'iniciativa', 'integracion_grupo'
    ];
    
    for (const campo of camposNumericos) {
      if (formData[campo as keyof typeof formData] === 0) {
        setErrorMessage(`Por favor completa todos los campos de evaluación`);
        return;
      }
    }
    
    if (!formData.considera_positivo_recibir_alumnos) {
      setErrorMessage('Por favor responde si considera positivo recibir alumnos en práctica');
      return;
    }
    
    setSubmitting(true);
    setErrorMessage(null);
     const evaluacionPayload: EvaluacionData = {
      nombre_supervisor: evaluacionData.nombre_supervisor,
      cargo_supervisor: evaluacionData.cargo_supervisor,
      email_supervisor: evaluacionData.email_supervisor,
      telefono_supervisor: evaluacionData.telefono_supervisor,
      calidad_trabajo: formData.calidad_trabajo,
      efectividad_trabajo: formData.efectividad_trabajo,
      conocimientos_profesionales: formData.conocimientos_profesionales,
      adaptabilidad_cambios: formData.adaptabilidad_cambios,
      organizacion_trabajo: formData.organizacion_trabajo,
      observaciones_tecnicas: formData.observaciones_tecnicas,
      interes_trabajo: formData.interes_trabajo,
      responsabilidad: formData.responsabilidad,
      cooperacion: formData.cooperacion,
      creatividad: formData.creatividad,
      iniciativa: formData.iniciativa,
      integracion_grupo: formData.integracion_grupo,
      considera_positivo_recibir_alumnos: formData.considera_positivo_recibir_alumnos as 'SI' | 'NO', // ✅ Type assertion seguro
      especialidad_requerida: formData.especialidad_requerida,
      comentarios_adicionales: formData.comentarios_adicionales
    };
    const result = await evaluacionSupervisorService.enviarEvaluacion(token!, evaluacionPayload);
    
    if (result.success) {
      setCompletado(true);
    } else {
      setErrorMessage(result.error || 'Error al enviar la evaluación');
    }
    
    setSubmitting(false);
  };
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Validando formulario...
        </Typography>
      </Container>
    );
  }
  
  if (completado) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 3 }} />
            <Typography variant="h4" gutterBottom fontWeight={700}>
              ¡Evaluación enviada!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Muchas gracias por completar la evaluación. Su opinión es muy valiosa para nosotros.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Universidad Autónoma de Chile
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }
  
  if (!tokenValido) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ErrorIcon color="error" sx={{ fontSize: 80, mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight={700}>
              Formulario no disponible
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {errorMessage || 'El enlace es inválido o ha expirado.'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Si necesita ayuda, contacte al coordinador de prácticas.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }
  
  const estudiante = evaluacionData?.estudiantes;
  const empresa = evaluacionData?.empresas;
  const practica = evaluacionData?.practicas;
  
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Evaluación de Práctica Profesional
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Universidad Autónoma de Chile
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Stack spacing={2} sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Estudiante:</strong> {estudiante?.nombre} {estudiante?.apellido}
            </Typography>
            <Typography variant="body2">
              <strong>Carrera:</strong> {estudiante?.carrera}
            </Typography>
            <Typography variant="body2">
              <strong>Empresa:</strong> {empresa?.razon_social}
            </Typography>
            <Typography variant="body2">
              <strong>Cargo:</strong> {practica?.cargo_por_desarrollar}
            </Typography>
          </Stack>
          
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {/* ASPECTOS TÉCNICOS */}
              <Box>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  I. ASPECTOS TÉCNICOS
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  Escala: 1 (Insuficiente) - 5 (Excelente)
                </Typography>
                
                {[
                  { key: 'calidad_trabajo', label: '1. Calidad de trabajo' },
                  { key: 'efectividad_trabajo', label: '2. Efectividad en el trabajo' },
                  { key: 'conocimientos_profesionales', label: '3. Conocimientos profesionales' },
                  { key: 'adaptabilidad_cambios', label: '4. Adaptabilidad a los cambios' },
                  { key: 'organizacion_trabajo', label: '5. Organización del trabajo' }
                ].map((item) => (
                  <FormControl key={item.key} fullWidth sx={{ mb: 3 }}>
                    <FormLabel>{item.label}</FormLabel>
                    <RadioGroup
                      row
                      value={formData[item.key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [item.key]: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <FormControlLabel key={val} value={val} control={<Radio />} label={val} />
                      ))}
                    </RadioGroup>
                  </FormControl>
                ))}
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Observaciones generales de aspectos técnicos"
                  value={formData.observaciones_tecnicas}
                  onChange={(e) => setFormData({ ...formData, observaciones_tecnicas: e.target.value })}
                />
              </Box>
              
              {/* ASPECTOS PERSONALES */}
              <Box>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  II. ASPECTOS PERSONALES
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  Escala: 1 (Insuficiente) - 5 (Excelente)
                </Typography>
                
                {[
                  { key: 'interes_trabajo', label: '1. Interés por el trabajo' },
                  { key: 'responsabilidad', label: '2. Responsabilidad' },
                  { key: 'cooperacion', label: '3. Cooperación en el trabajo' },
                  { key: 'creatividad', label: '4. Creatividad' },
                  { key: 'iniciativa', label: '5. Iniciativa' },
                  { key: 'integracion_grupo', label: '6. Integración al grupo' }
                ].map((item) => (
                  <FormControl key={item.key} fullWidth sx={{ mb: 3 }}>
                    <FormLabel>{item.label}</FormLabel>
                    <RadioGroup
                      row
                      value={formData[item.key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [item.key]: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <FormControlLabel key={val} value={val} control={<Radio />} label={val} />
                      ))}
                    </RadioGroup>
                  </FormControl>
                ))}
              </Box>
              
              {/* PREGUNTAS FINALES */}
              <Box>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  III. PREGUNTAS FINALES
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <FormLabel>
                    ¿Considera positivo recibir alumnos en práctica de la Universidad Autónoma de Chile?
                  </FormLabel>
                  <RadioGroup
                    value={formData.considera_positivo_recibir_alumnos}
                    onChange={(e) => setFormData({ ...formData, considera_positivo_recibir_alumnos: e.target.value as 'SI' | 'NO' })}
                  >
                    <FormControlLabel value="SI" control={<Radio />} label="Sí" />
                    <FormControlLabel value="NO" control={<Radio />} label="No" />
                  </RadioGroup>
                </FormControl>
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="¿Qué tipo de especialidad requiere su empresa de los alumnos en práctica?"
                  value={formData.especialidad_requerida}
                  onChange={(e) => setFormData({ ...formData, especialidad_requerida: e.target.value })}
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Comentarios adicionales"
                  value={formData.comentarios_adicionales}
                  onChange={(e) => setFormData({ ...formData, comentarios_adicionales: e.target.value })}
                />
              </Box>
              
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Enviar Evaluación'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EvaluacionSupervisorPublica;