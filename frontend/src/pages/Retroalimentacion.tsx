import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import DashboardTemplate from "../components/DashboardTemplate";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import { supabase } from "../services/supabaseClient";

type Archivo = {
  name: string;
  path: string;
  bucket: string;
  size?: number | null;
  uploaded_at?: string | null;
};

export default function Retroalimentacion(): React.ReactElement {
  const [alerta, setAlerta] = useState<{
    severidad: "success" | "error";
    mensaje: string;
  } | null>(null);

  const [archivosAvance, setArchivosAvance] = useState<Archivo[]>([]);
  const [archivosFinal, setArchivosFinal] = useState<Archivo[]>([]);
  const [notaAvance, setNotaAvance] = useState<number | null>(null);
  const [notaFinal, setNotaFinal] = useState<number | null>(null);
  const [aprobadoAvance, setAprobadoAvance] = useState<boolean | null>(null);
  const [aprobadoFinal, setAprobadoFinal] = useState<boolean | null>(null);

  const BUCKET_AVANCE = "informe_avance_practica";
  const BUCKET_FINAL = "informe_final_practica";

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const id = user?.id ?? null;
        if (!id) {
          console.warn("No se encontró usuario logueado.");
          return;
        }
        await cargarInformesYStorage(id);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  async function cargarInformesYStorage(estudianteId: string) {
    try {
      const { data: registros, error: regErr } = await supabase
        .from("informes")
        .select("id, nombre, ruta, bucket, size, mime, uploaded_at, tipo")
        .eq("estudiante_id", estudianteId)
        .order("uploaded_at", { ascending: false });

      if (regErr) {
        console.warn("Error consultando tabla informes:", regErr.message);
      } else if (Array.isArray(registros)) {
        const avanceFromDb: Archivo[] = [];
        const finalFromDb: Archivo[] = [];
        registros.forEach((r: any) => {
          const archivo: Archivo = {
            name: r.nombre ?? r.ruta?.split("/").pop() ?? "archivo",
            path: r.ruta ?? `informes/${estudianteId}/${r.nombre ?? ""}`,
            bucket:
              r.bucket ?? (r.tipo === "avance" ? BUCKET_AVANCE : BUCKET_FINAL),
            size: r.size ?? null,
            uploaded_at: r.uploaded_at ?? null,
          };
          if ((r.tipo ?? "").toString().toLowerCase().includes("avance")) {
            avanceFromDb.push(archivo);
          } else if (
            (r.tipo ?? "").toString().toLowerCase().includes("final")
          ) {
            finalFromDb.push(archivo);
          } else {
            if ((archivo.bucket ?? "").includes("avance"))
              avanceFromDb.push(archivo);
            else if ((archivo.bucket ?? "").includes("final"))
              finalFromDb.push(archivo);
            else avanceFromDb.push(archivo);
          }
        });

        setArchivosAvance(avanceFromDb);
        setArchivosFinal(finalFromDb);
      }

      try {
        const { data: evalRow, error: evalErr } = await supabase
          .from("informes")
          .select("nota_avance, nota_final, aprobado_avance, aprobado_final")
          .eq("estudiante_id", estudianteId)
          .limit(1)
          .single();
        if (!evalErr && evalRow) {
          setNotaAvance((evalRow as any).nota_avance ?? null);
          setNotaFinal((evalRow as any).nota_final ?? null);
          setAprobadoAvance(
            typeof (evalRow as any).aprobado_avance === "boolean"
              ? (evalRow as any).aprobado_avance
              : null
          );
          setAprobadoFinal(
            typeof (evalRow as any).aprobado_final === "boolean"
              ? (evalRow as any).aprobado_final
              : null
          );
        }
      } catch (e) {}

      const mergeFiles = (current: Archivo[], incoming: Archivo[]) => {
        const map = new Map<string, Archivo>();
        current.forEach((c) => map.set(`${c.bucket}::${c.path}`, c));
        incoming.forEach((inc) => {
          const key = `${inc.bucket}::${inc.path}`;
          if (!map.has(key)) map.set(key, inc);
        });
        return Array.from(map.values());
      };

      try {
        const carpetaAvance = `informes/${estudianteId}`;
        const { data: listA, error: errA } = await supabase.storage
          .from(BUCKET_AVANCE)
          .list(carpetaAvance, { limit: 200 });
        if (!errA && Array.isArray(listA) && listA.length > 0) {
          const incoming = listA.map((f: any) => ({
            name: f.name,
            path: `${carpetaAvance}/${f.name}`,
            bucket: BUCKET_AVANCE,
            size: f.size ?? null,
            uploaded_at: (f as any).created_at ?? null,
          }));
          setArchivosAvance((prev) => mergeFiles(prev, incoming));
        }
      } catch (e) {
        console.warn("No se pudo listar bucket avance:", e);
      }

      try {
        const carpetaFinal = `informes/${estudianteId}`;
        const { data: listF, error: errF } = await supabase.storage
          .from(BUCKET_FINAL)
          .list(carpetaFinal, { limit: 200 });
        if (!errF && Array.isArray(listF) && listF.length > 0) {
          const incoming = listF.map((f: any) => ({
            name: f.name,
            path: `${carpetaFinal}/${f.name}`,
            bucket: BUCKET_FINAL,
            size: f.size ?? null,
            uploaded_at: (f as any).created_at ?? null,
          }));
          setArchivosFinal((prev) => mergeFiles(prev, incoming));
        }
      } catch (e) {
        console.warn("No se pudo listar bucket final:", e);
      }
    } catch (err) {
      console.error("Error cargando informes y storage:", err);
      setAlerta({ severidad: "error", mensaje: "Error cargando archivos." });
    }
  }

  async function descargarArchivo(file: Archivo) {
    try {
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60);
      if (!error && (data as any)?.signedUrl) {
        const a = document.createElement("a");
        a.href = (data as any).signedUrl;
        a.download = file.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setAlerta({ severidad: "success", mensaje: "Descarga iniciada." });
        return;
      }

      const { data: blobData, error: dlError } = await supabase.storage
        .from(file.bucket)
        .download(file.path);
      if (dlError) throw dlError;
      const urlBlob = URL.createObjectURL(blobData as Blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
      setAlerta({ severidad: "success", mensaje: "Descarga iniciada." });
    } catch (err: any) {
      console.error(err);
      setAlerta({
        severidad: "error",
        mensaje: err.message ?? "Error al descargar.",
      });
    }
  }

  function renderMetaBox(nota: number | null, aprobado: boolean | null) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">Nota</Typography>
          <Typography variant="h6">{nota !== null ? nota : "—"}</Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 1 }}
        >
          <Typography variant="subtitle2">Estado</Typography>
          {aprobado === null ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HourglassEmptyIcon sx={{ color: "warning.main" }} />
              <Typography>PENDIENTE</Typography>
            </Box>
          ) : aprobado ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleOutlineIcon color="success" />
              <Typography>APROBADO</Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CancelIcon color="error" />
              <Typography>NO APROBADO</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    );
  }

  return (
    <DashboardTemplate title="Panel de estudiante">
      <Box
        sx={{ display: "flex", justifyContent: "center", p: { xs: 2, md: 4 } }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 1000,
            p: { xs: 2, md: 4 },
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                align="center"
                sx={{ fontSize: { xs: "1.5rem", md: "2.5rem" } }}
              >
                Bienvenido a la Sección de Retroalimentación
              </Typography>

              <Typography
                variant="body1"
                align="center"
                sx={{
                  maxWidth: 600,
                  fontSize: { xs: "0.95rem", md: "1.2rem" },
                  mb: 2,
                }}
              >
                Aquí puedes ver los archivos que subiste (informe de avance de
                práctica y Informe final de práctica). Usa el botón para
                descargar. También puedes ver la nota y su estado.
              </Typography>

              <Card sx={{ width: "100%" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    Acta de informe de avance
                  </Typography>

                  {renderMetaBox(notaAvance, aprobadoAvance)}

                  <Divider sx={{ my: 2 }} />

                  {archivosAvance.length === 0 ? (
                    <Typography variant="body2">
                      No hay archivos asociados al acta de avance.
                    </Typography>
                  ) : (
                    <List>
                      {archivosAvance.map((f, i) => (
                        <ListItem
                          key={i}
                          secondaryAction={
                            <Box>
                              <IconButton
                                edge="end"
                                aria-label="descargar"
                                onClick={() => descargarArchivo(f)}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={f.name}
                            secondary={
                              <>
                                {f.size
                                  ? `${Math.round((f.size ?? 0) / 1024)} KB`
                                  : null}
                                {f.uploaded_at
                                  ? ` — ${new Date(
                                      f.uploaded_at
                                    ).toLocaleString()}`
                                  : null}
                                {f.bucket ? ` — ${f.bucket}` : null}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ width: "100%" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    Acta final
                  </Typography>

                  {renderMetaBox(notaFinal, aprobadoFinal)}

                  <Divider sx={{ my: 2 }} />

                  {archivosFinal.length === 0 ? (
                    <Typography variant="body2">
                      No hay archivos asociados al acta final.
                    </Typography>
                  ) : (
                    <List>
                      {archivosFinal.map((f, i) => (
                        <ListItem
                          key={i}
                          secondaryAction={
                            <Box>
                              <IconButton
                                edge="end"
                                aria-label="descargar"
                                onClick={() => descargarArchivo(f)}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={f.name}
                            secondary={
                              <>
                                {f.size
                                  ? `${Math.round((f.size ?? 0) / 1024)} KB`
                                  : null}
                                {f.uploaded_at
                                  ? ` — ${new Date(
                                      f.uploaded_at
                                    ).toLocaleString()}`
                                  : null}
                                {f.bucket ? ` — ${f.bucket}` : null}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={Boolean(alerta)}
        onClose={() => setAlerta(null)}
        autoHideDuration={4000}
      >
        <Alert
          onClose={() => setAlerta(null)}
          severity={alerta?.severidad ?? "success"}
          sx={{ width: "100%" }}
        >
          {alerta?.mensaje ?? ""}
        </Alert>
      </Snackbar>
    </DashboardTemplate>
  );
}
