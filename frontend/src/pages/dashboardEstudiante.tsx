import { useEffect, useState } from "react";
import DashboardTemplate from "../components/DashboardTemplate";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  Grid,
  Chip,
  Divider,
} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { AssignmentLate } from "@mui/icons-material";
import { supabase } from "../services/supabaseClient";
import { getPracticasEstudiante } from "../services/autoevaluacion";

/** cálculo de avance por tiempo (igual que el tuyo) */
const calcularAvancePorTiempo = (fechaInicioStr: string, fechaTerminoStr: string) => {
  const hoy = new Date();
  const inicio = new Date(fechaInicioStr);
  const termino = new Date(fechaTerminoStr);

  const totalDias = Math.max((termino.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24), 1);
  const diasTranscurridos = Math.min(
    (hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
    totalDias
  );

  const avance = Math.round((diasTranscurridos / totalDias) * 100);
  return Math.min(Math.max(avance, 0), 100);
};


// Función para normalizar el nombre del archivo
const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "") 
    .toLowerCase();

export default function DashboardEstudiante() {
  const [avance, setAvance] = useState(0);
  const [practicaActual, setPracticaActual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState<string[]>([]);
  // const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const uid = user.id;

        const { data: estudianteRow } = await supabase
          .from("estudiantes")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        const estId = estudianteRow?.id ?? null;

        const practicas = await getPracticasEstudiante();
        

        // Filtrar Práctica I y II
        const nombresPracticas = ["Práctica I", "Práctica II"];
        let practicasCompletas = nombresPracticas.map((tipo) => {
          const encontrada = practicas?.find((p: any) => p.tipo_practica === tipo);
          return encontrada || {
            tipo_practica: tipo,
            departamento: "",
            cargo_por_desarrollar: "",
            fecha_inicio: "",
            fecha_termino: "",
            estado: "",
          };
        });

        // Ordenar prácticas según fecha de inicio
        practicasCompletas.sort((a, b) => {
          const fechaA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
          const fechaB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
          return fechaB - fechaA;
        });

        if (!mounted) return;

        setPracticaActual(practicasCompletas);

        // Calcular avance de cada práctica
        const avancesTemp = practicasCompletas.map((p) =>
          p.fecha_inicio && p.fecha_termino ? calcularAvancePorTiempo(p.fecha_inicio, p.fecha_termino) : 0
        );
        setAvance(avancesTemp);

        // Pendientes: crear array de arrays para cada práctica
        let pendientesTemp: string[][] = [];
        for (const p of practicasCompletas) {
          let temp: string[] = [];

          if (p.id && estId) {
            // Revisar autoevaluación
            const { data: autoevalData } = await supabase
              .from("autoevaluaciones")
              .select("id")
              .eq("practica_id", p.id)
              .maybeSingle();

            if (!autoevalData) temp.push("Autoevaluación");

            // Revisar informes
            const { data: informes } = await supabase
              .from("informes")
              .select("tipo, nombre")
              .eq("estudiante_id", estId)
              .in("tipo", ["avance", "final"]);

            if (informes) {
              const tipoPracticaNormalized = normalizeText(p.tipo_practica);

              const avanceExistente = informes.some((i: any) => {
                const nombreNormalized = normalizeText(i.nombre || "");
                return i.tipo === "avance" && nombreNormalized.includes(tipoPracticaNormalized);
              });

              if (!avanceExistente) temp.push("Informe de avance");

              const finalExistente = informes.some((i: any) => {
                const nombreNormalized = normalizeText(i.nombre || "");
                return i.tipo === "final" && nombreNormalized.includes(tipoPracticaNormalized);
              });

              if (!finalExistente) temp.push("Informe final");
            }
          } else {
            // Si no hay práctica real creada, todos los archivos están pendientes
            temp.push("Autoevaluación", "Informe de avance", "Informe final");
          }

          pendientesTemp.push(temp);
        }

        setPendientes(pendientesTemp);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <DashboardTemplate title="Panel de estudiante">
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        practicaActual?.map((practica: any, idx: number) => {
          const avanceActual = Array.isArray(avance) ? avance[idx] : 0;
          const pendientesActual = Array.isArray(pendientes) ? pendientes[idx] : [];

          const data = [
            { name: "Completado", value: avanceActual },
            { name: "Pendiente", value: 100 - avanceActual },
          ];

          const COLORS = ["#f75b50ff", "#f0f0f0"];

          return (
            <Card
              key={idx}
              sx={{
                borderRadius: 4,
                p: { xs: 3, md: 5 },
                maxWidth: 1000,
                mx: "auto",
                mt: 6,
                boxShadow: 6,
              }}
            >
              <Grid container spacing={4} alignItems="center">
                {/* PieChart */}
                <Grid size={{ xs:12, md:5}} sx={{ display: "flex", justifyContent: "center" }}>
                  <Box>
                    <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
                      {practica.tipo_practica}
                    </Typography>
                    <PieChart width={220} height={220}>
                      <Pie data={data} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={3}>
                        {data.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                    <Typography variant="h6" textAlign="center" mt={1}>
                      Completado: {avanceActual}%
                    </Typography>
                  </Box>
                </Grid>

                {/* Información y pendientes */}
                <Grid size={{xs:12, md:7}}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {/* Pendientes */}
                    <Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Archivos pendientes
                      </Typography>
                      {pendientesActual.length > 0 ? (
                        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                          {pendientesActual.map((item, i) => (
                            <Chip
                              key={i}
                              icon={<AssignmentLate />}
                              label={item}
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body1" color="textSecondary">
                          No hay archivos pendientes
                        </Typography>
                      )}
                    </Box>

                    <Divider />

                    {/* Información de la práctica */}
                    <Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Información de la práctica
                      </Typography>
                      <Grid container spacing={1.5}>
                        {[
                          { label: "Departamento", value: practica.departamento },
                          { label: "Cargo", value: practica.cargo_por_desarrollar },
                          { label: "Fecha inicio", value: practica.fecha_inicio },
                          { label: "Fecha término", value: practica.fecha_termino },
                          { label: "Estado", value: practica.estado },
                        ].map((item, i) => (
                          <Grid size={{xs:6}} key={i}>
                            <Typography variant="body2" color="textSecondary">
                              {item.label}
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {item.value || "No asignado"}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          );
        })
      )}

    </DashboardTemplate>
  );
}
