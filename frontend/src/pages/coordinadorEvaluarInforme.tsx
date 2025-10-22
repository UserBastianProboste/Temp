import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient"; 
import DashboardTemplate from "../components/DashboardTemplate";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  TextField,
  Snackbar,
} from "@mui/material";

// Definición de los criterios de la rúbrica
const seccionesRubrica = [
  {
    titulo: "I. Contenido del documento",
    criterios: [
      { id: "c1_portada_indice", label: "Portada e índice de contenidos" },
      { id: "c2_introduccion", label: "Introducción" },
      { id: "c3_objetivo_general", label: "Objetivo general" },
      { id: "c4_objetivos_especificos", label: "Objetivos específicos" },
      { id: "c5_caracterizacion_empresa", label: "Caracterización de la empresa" },
      { id: "c6_datos_supervisor", label: "Datos del supervisor y organigrama" },
      { id: "c7_desarrollo_practica", label: "Desarrollo de la práctica" },
      { id: "c8_recomendaciones", label: "Recomendaciones" },
      { id: "c9_conclusiones", label: "Conclusiones" },
      { id: "c10_anexos", label: "Anexos" },
    ]
  },
  {
    titulo: "II. Forma del documento",
    criterios: [
      { id: "c11_formato", label: "Formato establecido" },
      { id: "c12_tercera_persona", label: "Uso de la tercera persona" },
      { id: "c13_citas_fuentes", label: "Citas y fuentes" },
      { id: "c14_extension", label: "Extensión" },
      { id: "c15_tablas_graficos", label: "Identificación de tablas y gráficos" },
      { id: "c16_ortografia", label: "Ortografía" },
    ]
  },
  {
    titulo: "III. Pertinencia del documento",
    criterios: [
      { id: "c17_cohesion_coherencia", label: "Cohesión y coherencia" },
      { id: "c18_desarrollo_ideas", label: "Desarrollo de ideas/profundización" },
      { id: "c19_identificacion_roles", label: "Identificación de roles e impacto" },
      { id: "c20_riqueza_linguistica", label: "Riqueza lingüística" },
    ]
  }
];

const todosCriterios = seccionesRubrica.flatMap(s => s.criterios);

// Opciones para la tabla
const criteriosLabels = ["Insatisfactorio", "Mejorable", "Efectivo", "Excelencia"];
const criteriosValues = [0, 1, 2, 3];

// Estado inicial para los 20 criterios, todos en 0
const initialState: Record<string, number> = todosCriterios.reduce(
  (acc, crit) => ({ ...acc, [crit.id]: 0 }),
  {}
);


// --- Componente Principal de la Página ---
const CoordinadorEvaluarInforme: React.FC = () => {
  const { informeId } = useParams<{ informeId: string }>();
  const [informe, setInforme] = useState<any>(null);
  const [estudiante, setEstudiante] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [coordinador, setCoordinador] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>(initialState);

  // Estados para alertas
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
  const [rubricaEnviada, setRubricaEnviada] = useState(false);

  // Función para mostrar alertas
  const mostrarAlerta = (
    mensaje: string,
    severity: "success" | "error" | "warning" | "info" = "info"
  ) => {
    setAlertMessage(mensaje);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  // Cargar datos del informe y verificar si ya fue evaluado
  useEffect(() => {
    const fetchData = async () => {
      if (!informeId) {
        mostrarAlerta("No se proporcionó ID de informe.", "error");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // 1. Obtener datos del informe
        const { data: informeData, error: informeErr } = await supabase
          .from("informes")
          .select("id, nombre, estudiante_id, coordinador_id, tipo_practica")
          .eq("id", informeId)
          .maybeSingle();

        if (informeErr) throw informeErr;
        if (!informeData) throw new Error("Informe no encontrado.");
        setInforme(informeData);

        // 1b. Obtener datos del estudiante
        if (informeData.estudiante_id) {
          const { data: studentData, error: studentErr } = await supabase
            .from("estudiantes")
            .select("nombre, apellido, email, carrera")
            .eq("id", informeData.estudiante_id)
            .maybeSingle();
        if (studentErr) console.warn("No se pudo cargar datos del estudiante:", studentErr);
                else setEstudiante(studentData);
        }

        // 1c. Obtener datos del coordinador
        if (informeData.coordinador_id) {
          const { data: coordData, error: coordErr } = await supabase
            .from("coordinadores")
            .select("nombre, apellido, email, carrera")
            .eq("id", informeData.coordinador_id)
            .maybeSingle();
          if (coordErr) console.warn("No se pudo cargar datos del coordinador:", coordErr);
          else setCoordinador(coordData);
        }

        // 1d. Obtener datos de la empresa
        if (informeData.estudiante_id && informeData.tipo_practica) {
          try {
            const { data: practicaData, error: practicaErr } = await supabase
              .from("practicas")
              .select("empresa_id") // 
              .eq("estudiante_id", informeData.estudiante_id)
              .eq("tipo_practica", informeData.tipo_practica)
              .maybeSingle();

            if (practicaErr) throw practicaErr;

            if (practicaData && practicaData.empresa_id) {
              const { data: empresaData, error: empresaErr } = await supabase
                .from("empresas")
                .select("razon_social, direccion, jefe_directo, cargo_jefe, telefono, email")
                .eq("id", practicaData.empresa_id)
                .maybeSingle();

              if (empresaErr) throw empresaErr;
              setEmpresa(empresaData);
            }
          } catch (err: any) {
            console.warn("Error al cargar datos de la empresa:", err.message);
          }
        }

        // 2. Verificar si ya existe una rúbrica
        const { data: rubricaData, error: rubricaErr } = await supabase
          .from("rubrica_informe_final")
          .select("*")
          .eq("informe_id", informeId)
          .maybeSingle();
        
        if (rubricaErr) throw rubricaErr;

        // Si ya existe, rellenar el formulario con los datos guardados
        if (rubricaData) {
          const loadedScores: Record<string, number> = {};
          todosCriterios.forEach(crit => {
            loadedScores[crit.id] = rubricaData[crit.id] ?? 0;
          });
          setScores(loadedScores);
          setRubricaEnviada(true);
        }

      } catch (err: any) {
        mostrarAlerta(err.message ?? "Error al cargar los datos.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [informeId]);

  // Manejar cambio en los puntajes
  const handleChange = (field: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calcular puntaje total
  const puntajeTotal = useMemo(() => {
    return Object.values(scores).reduce((sum, current) => sum + current, 0);
  }, [scores]);

  // Calcular nota final usando la fórmula: (puntaje + 10) / 10
  const notaFinal = useMemo(() => {
    const nota = (puntajeTotal + 10) / 10;
    // Asegurarse de que la nota esté entre 1.0 y 7.0
    if (nota < 1.0) return 1.0;
    if (nota > 7.0) return 7.0;
    return nota;
  }, [puntajeTotal]);

  const handleSubmit = async () => {
    if (!informeId) return;

    // Validación
    const camposEvaluados = Object.values(scores).length;
    if (camposEvaluados < todosCriterios.length) {
       mostrarAlerta("Debe evaluar todos los 20 criterios.", "warning");
       return;
    }

    setSaving(true);

    const dataToUpsert = {
      informe_id: informeId,
      ...scores,
      puntaje_total: puntajeTotal,
    };

    try {
      // 1. Guardar/Actualizar la rúbrica
      const { error: rubricaErr } = await supabase
        .from("rubrica_informe_final")
        .upsert(dataToUpsert, { onConflict: 'informe_id' });

      if (rubricaErr) throw rubricaErr;

      // 2. Actualizar la nota en la tabla 'informes'
      const { error: informeErr } = await supabase
        .from("informes")
        .update({ nota: notaFinal })
        .eq("id", informeId);
      
      if (informeErr) throw informeErr;

      mostrarAlerta("Evaluación guardada correctamente.", "success");
      setRubricaEnviada(true);
    } catch (err: any) {
      console.error("Error al guardar la evaluación:", err);
      mostrarAlerta("No se pudo guardar la evaluación.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardTemplate title="Cargando...">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate title="Evaluar Informe Final">
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 4, mb: 6 }}
      >
        {/* Card de Datos del Estudiante*/}
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, maxWidth: 900, mx: "auto", width: "100%" }}>
          <CardContent>
            <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: "1.5rem", sm: "2rem" }, fontWeight: 700 }}>
              Rúbrica de Evaluación
            </Typography>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              Datos del Estudiante
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Nombre Estudiante"
                value={estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Carrera"
                value={estudiante?.carrera || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Mail"
                value={estudiante?.email || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Informe a Evaluar"
                value={informe?.nombre || "..."}
                fullWidth
                disabled
              />
            </Box>
          </CardContent>
        </Card>

        {/* Card de Datos de la Empresa*/}
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, maxWidth: 900, mx: "auto", width: "100%" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              Datos de la Empresa
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
     
              <TextField
                label="Nombre de la Empresa"
                value={empresa?.razon_social || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Jefe de la Empresa"
                value={empresa?.jefe_directo || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Mail"
                value={empresa?.email || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Teléfono"
                value={empresa?.telefono || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Dirección"
                value={empresa?.direccion || "..."}
                fullWidth
                disabled
              />
            </Box>
          </CardContent>
        </Card>

        {/* Card de Datos del Coordinador de Práctica*/}
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: 2, maxWidth: 900, mx: "auto", width: "100%" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              Datos del Coordinador de Prácticas
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Nombre"
                value={coordinador ? `${coordinador.nombre} ${coordinador.apellido}` : "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Mail"
                value={coordinador?.email || "..."}
                fullWidth
                disabled
              />
              <TextField
                label="Carrera"
                value={coordinador?.carrera || "..."}
                fullWidth
                disabled
              />
            </Box>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card
            sx={{
                boxShadow: "none",
                width: "100%",
                maxWidth: { xs: "100%", sm: "900px" },
                mx: "auto",
                p: { xs: 2, sm: 3 },
            }}
            >
            <CardContent>
                <Typography
                    variant="h6"
                    sx={{
                        mb: 2,
                        fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                        textAlign: { xs: "center", sm: "left" },
                    }}
                > Instrucciones para llenar la encuesta:
                </Typography>
        
                <Typography
                    sx={{
                        fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                        textAlign: "justify",
                        lineHeight: { xs: 1.4, sm: 1.6 },
                    }}>
                        La siguiente rúbrica tiene como objetivo poder medir el desempeño del alumno en el informe final de la práctica 
                        profesional, con la finalidad de evaluar el desarrollo de la práctica profesional.
                </Typography>

                <Typography
                variant="h6"
                    sx={{
                        marginTop: 2,
                        fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                        textAlign: { xs: "center", sm: "left" },
                    }}
                > Escala de Notas:
                </Typography>

                <Typography
                    sx={{
                        marginTop: 2,
                        fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                        textAlign: "justify",
                        lineHeight: { xs: 1.4, sm: 1.6 },
                    }}>
                        La rúbrica posee veinte criterios, que serán evaluados con un puntaje de 0 a 3 puntos cada uno, de acuerdo con la 
                        siguiente escala. Asignados por el coordinador de prácticas según el nivel de desempeño del alumno, obteniendo una suma 
                        total del puntaje de 0 a 60 puntos:
                </Typography>
            </CardContent>
        </Card>

        {seccionesRubrica.map((seccion) => (
          // Card por cada sección (I. Gestión, II. Aspectos)
          <Card 
            key={seccion.titulo}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              boxShadow: 2,
              width: "100%",
              maxWidth: { xs: "100%", sm: "900px" },
              mx: "auto",
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}>
                {seccion.titulo}
              </Typography>
              
              {/* Tabla de Criterios*/}
              <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, fontWeight: 600 }}>
                        Criterio
                      </TableCell>
                      {criteriosLabels.map((label) => (
                        <TableCell key={label} align="center" sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" }, fontWeight: 600 }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {seccion.criterios.map((crit) => (
                      <TableRow key={crit.id} hover>
                        <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" } }}>
                          {crit.label}
                        </TableCell>
                        {criteriosValues.map((value) => (
                          <TableCell key={value} align="center">
                            <Radio
                              checked={scores[crit.id] === value}
                              onChange={() => handleChange(crit.id, value)}
                              sx={{ transform: { xs: "scale(0.8)", sm: "scale(1)" } }}
                              value={value}
                              name={crit.id}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ))}

        {/* Card de Resumen y Envío (Inspirado en Card de Nota)*/}
        <Card
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 2,
            width: "100%",
            maxWidth: { xs: "100%", sm: "900px" },
            mx: "auto",
          }}
        >
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" }, fontWeight: 600, textAlign: "center" }}>
              Resultado de la Evaluación
            </Typography>
            
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 3,
                alignItems: "center",
                justifyContent: "center",
                mt: 2,
                mb: 3,
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 2
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.9rem", sm: "1rem" }, fontWeight: 500 }}>
                  Puntaje Total
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: "primary.main", fontSize: { xs: "2rem", sm: "2.5rem" } }}>
                  {puntajeTotal} / 60
                </Typography>
              </Box>

              <Divider sx={{ width: { xs: "100%", sm: "2px" }, height: { xs: "2px", sm: "80px" } }} />

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.9rem", sm: "1rem" }, fontWeight: 500 }}>
                  Nota Final
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: "primary.main", fontSize: { xs: "2rem", sm: "2.5rem" } }}>
                  {notaFinal.toFixed(1)}
                </Typography>
              </Box>
            </Box>

            {!rubricaEnviada ? (
            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={saving}
                sx={{ py: 1.5, fontSize: { xs: "0.9rem", sm: "1rem" }, fontWeight: 600 }}
            >
                {saving ? <CircularProgress size={24} /> : "Guardar Evaluación"}
            </Button>
            ) : (
            <Typography
                sx={{
                color: "red",
                textAlign: "left",
                fontWeight: 600,
                fontSize: { xs: "1rem", sm: "1rem" },
                mt: 2,
                }}
            >
                Esta evaluación ya ha sido registrada.
            </Typography>
            )}
          </CardContent>
        </Card>

      </Box>

      {/* Alertas*/}
      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlertOpen(false)}
          severity={alertSeverity}
          sx={{ width: "100%", fontSize: { xs: "0.85rem", sm: "1rem" } }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </DashboardTemplate>
  );
};

export default CoordinadorEvaluarInforme;