import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  TextField,
  InputAdornment,
  Paper,
  ListItemButton,
  Stack,
  Skeleton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Button as MuiButton,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import DashboardTemplate from "../components/DashboardTemplate";
import { supabase } from "../services/supabaseClient";

const ITEMS_PER_PAGE = 10;

const CoordinadorInformesEstudiantes: React.FC<{ coordinatorId?: string }> = ({
  coordinatorId: coordinatorIdProp,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );

  const [coordinator, setCoordinator] = useState<{
    id: string;
    carrera?: string;
  } | null>(null);
  const [informesMap, setInformesMap] = useState<Record<string, any[]>>({});
  const [practicasMap, setPracticasMap] = useState<Record<string, any[]>>({});
  const [empresasMap, setEmpresasMap] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [studentsWithReports, setStudentsWithReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInforme, setModalInforme] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState<string>("");
  const [snackSeverity, setSnackSeverity] = useState<
    "success" | "info" | "warning" | "error"
  >("info");

  const showSnackbar = (
    message: string,
    severity: "success" | "info" | "warning" | "error" = "info"
  ) => {
    setSnackMessage(message);
    setSnackSeverity(severity);
    setSnackOpen(true);
  };

  const handleSnackClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    setSnackOpen(false);
  };

  const openModal = (inf: any) => {
    setModalInforme(inf);
    if (inf?.estudiante_id) setSelectedStudentId(inf.estudiante_id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalInforme(null);
    setSelectedFile(null);
    setGrade(null);
  };

  const downloadFile = async (
    inf: { bucket: string; ruta: string; nombre?: string } | null
  ) => {
    if (!inf) return;
    try {
      setDownloading(true);
      const { data: signedData, error: signedErr } = await supabase.storage
        .from(inf.bucket)
        .createSignedUrl(inf.ruta, 60);
      if (signedErr) throw signedErr;
      const url = signedData?.signedUrl;
      if (!url) throw new Error("No se obtuvo la URL firmada.");

      const a = document.createElement("a");
      a.href = url;
      a.download = inf.nombre ?? "";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      showSnackbar(
        "No se pudo descargar el archivo. Revisa la consola para más detalles.",
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
  };

  // obtener objeto estudiante seleccionado
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  // subir archivo
  const uploadNewFile = async () => {
    if (!selectedFile) {
      showSnackbar("Selecciona un archivo primero.", "warning");
      return;
    }
    if (!selectedStudentId) {
      showSnackbar("No hay estudiante seleccionado.", "warning");
      return;
    }

    const tipoInformeActual = classifyInformeTipo(modalInforme);
    if (tipoInformeActual !== "avance") {
      showSnackbar(
        "Solo se puede subir retroalimentación para informes de avance.",
        "warning"
      );
      return;
    }

    if (grade !== null) {
      if (isNaN(grade) || grade < 1.0 || grade > 7.0) {
        showSnackbar("La calificación debe estar entre 1.0 y 7.0", "warning");
        return;
      }
    }

    try {
      setUploading(true);
      const bucket = "informe_avance_practica";

      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/\s+/g, "_");
      const studentUserId =
        (selectedStudent && selectedStudent.user_id) || selectedStudentId;
      const path = `informes/${studentUserId}/${timestamp}_${safeName}`;

      // subir a Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, selectedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: selectedFile.type,
        });

      if (uploadErr) throw uploadErr;

      const serverPath = (uploadData as any)?.path ?? path;

      // construir objeto a insertar
      const baseInsertObj: any = {
        estudiante_id: selectedStudentId,
        coordinador_id: coordinator?.id ?? null,
        nombre: selectedFile.name,
        ruta: serverPath,
        bucket,
        size: selectedFile.size ?? null,
        mime: selectedFile.type ?? null,
        public: false,
        tipo: modalInforme?.tipo ? `${modalInforme.tipo}` : "avance",
        tipo_practica: modalInforme?.tipo_practica ?? undefined,
      };
      if (grade !== null) baseInsertObj.nota = Number(grade.toFixed(1));
      const insertObj = Object.fromEntries(
        Object.entries(baseInsertObj).filter(([, v]) => v !== undefined)
      );

      const { data: insertData, error: insertErr } = await supabase
        .from("informes")
        .insert(insertObj);

      if (insertErr) {
        try {
          await supabase.storage.from(bucket).remove([serverPath]);
        } catch (remErr) {}
        throw insertErr;
      }

      const newInformeFromDb = insertData?.[0] ?? {
        id: `local-${Date.now()}`,
        ...insertObj,
      };

      // actualizar estado local
      setInformesMap((prev) => {
        const cur = prev[selectedStudentId] ?? [];
        return {
          ...prev,
          [selectedStudentId]: [...cur, newInformeFromDb],
        };
      });

      setSelectedFile(null);
      setGrade(null);
      setModalOpen(false);
      showSnackbar(
        "Retroalimentación subida y registrada correctamente.",
        "success"
      );
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      showSnackbar(`Error al subir/registrar: ${msg}`, "error");
      console.error("uploadNewFile error:", err);
    } finally {
      setUploading(false);
    }
  };

  const normalizeText = (s?: string | null) => {
    if (!s) return "";
    return s
      .toString()
      .replace(/[_\-]+/g, " ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const isPractica = (s?: string | null) => {
    const t = normalizeText(s);
    return /practica\s*(i{1,2}|1|2)\b/.test(t);
  };

  const classifyInformeTipo = (inf: any): "avance" | "final" | "otro" => {
    const tipo = (inf?.tipo ?? "").toString().toLowerCase();
    if (tipo.includes("avance")) return "avance";
    if (tipo.includes("final")) return "final";
    const bucket = (inf?.bucket ?? "").toString().toLowerCase();
    if (bucket.includes("avance")) return "avance";
    if (bucket.includes("final")) return "final";
    const ruta = (inf?.ruta ?? "").toString().toLowerCase();
    if (ruta.includes("informe_avance")) return "avance";
    if (ruta.includes("informe_final")) return "final";
    return "otro";
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        let coordId = coordinatorIdProp ?? null;
        let coordData: { id: string; carrera?: string } | null = null;

        if (!coordId) {
          const {
            data: { user },
            error: authErr,
          } = await supabase.auth.getUser();
          if (authErr || !user)
            throw new Error("No se pudo obtener el usuario autenticado.");

          const { data: coordRow, error: coordErr } = await supabase
            .from("coordinadores")
            .select("id, carrera")
            .eq("user_id", user.id)
            .maybeSingle();
          if (coordErr) throw coordErr;
          if (!coordRow)
            throw new Error(
              "No se encontró el coordinador para el usuario logueado."
            );
          coordId = coordRow.id;
          coordData = { id: coordRow.id, carrera: coordRow.carrera };
        } else {
          const { data: coordRow, error: coordErr } = await supabase
            .from("coordinadores")
            .select("id, carrera")
            .eq("id", coordId)
            .maybeSingle();
          if (coordErr) throw coordErr;
          if (!coordRow)
            throw new Error(
              "No se encontró el coordinador con la id proporcionada."
            );
          coordData = { id: coordRow.id, carrera: coordRow.carrera };
        }

        if (!mounted) return;
        setCoordinator(coordData);

        const { data: practicasData, error: practicasErr } = await supabase
          .from("practicas")
          .select(
            "id, estudiante_id, empresa_id, tipo_practica, fecha_inicio, fecha_termino, estado"
          )
          .eq("coordinador_id", coordData!.id);
        if (practicasErr) throw practicasErr;

        const practicas = practicasData ?? [];
        const practMap: Record<string, any[]> = {};
        practicas.forEach((p: any) => {
          if (!practMap[p.estudiante_id]) practMap[p.estudiante_id] = [];
          practMap[p.estudiante_id].push(p);
        });
        if (mounted) setPracticasMap(practMap);

        const empresaIds = Array.from(
          new Set(practicas.map((p: any) => p.empresa_id).filter(Boolean))
        );
        if (empresaIds.length > 0) {
          const { data: empresasData, error: empresasErr } = await supabase
            .from("empresas")
            .select("id, razon_social")
            .in("id", empresaIds);
          if (!empresasErr && empresasData) {
            const eMap: Record<string, string> = {};
            empresasData.forEach((e: any) => (eMap[e.id] = e.razon_social));
            if (mounted) setEmpresasMap(eMap);
          }
        }

        const studentIds = Array.from(
          new Set(practicas.map((p: any) => p.estudiante_id))
        );
        if (studentIds.length === 0) {
          setStudents([]);
          setInformesMap({});
          if (mounted) setLoading(false);
          return;
        }

        const { data: studentsData, error: studentsErr } = await supabase
          .from("estudiantes")
          .select("id, user_id, nombre, apellido, email, carrera, semestre")
          .in("id", studentIds);
        if (studentsErr) throw studentsErr;
        if (mounted) setStudents(studentsData ?? []);

        const { data: informesData, error: informesErr } = await supabase
          .from("informes")
          .select(
            "id, estudiante_id, nombre, ruta, bucket, tipo, tipo_practica, coordinador_id, nota"
          )
          .eq("coordinador_id", coordData!.id)
          .in("estudiante_id", studentIds);
        if (informesErr) throw informesErr;

        const acceptedBuckets = [
          "informe_avance_practica",
          "informe_final_practica",
        ];
        const informesFiltered = (informesData ?? []).filter((inf: any) => {
          const bucketMatch =
            inf.bucket && acceptedBuckets.includes(inf.bucket);
          const rutaMatch =
            typeof inf.ruta === "string" &&
            (inf.ruta.includes("informe_avance_practica") ||
              inf.ruta.includes("informe_final_practica"));
          const tienePractica = isPractica(inf.nombre) || isPractica(inf.ruta);
          return (bucketMatch || rutaMatch) && tienePractica;
        });

        const map: Record<string, any[]> = {};
        informesFiltered.forEach((inf: any) => {
          if (!map[inf.estudiante_id]) map[inf.estudiante_id] = [];
          map[inf.estudiante_id].push(inf);
        });
        if (mounted) setInformesMap(map);
      } catch (err: any) {
        if (mounted) setError(err.message ?? "Error desconocido");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [coordinatorIdProp]);

  useEffect(() => {
    const filtered = students.filter(
      (student) => informesMap[student.id] && informesMap[student.id].length > 0
    );
    setStudentsWithReports(filtered);
  }, [students, informesMap]);

  const filteredStudents = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return studentsWithReports;
    return studentsWithReports.filter((s) => {
      const hay = `${s.nombre ?? ""} ${s.apellido ?? ""} ${s.carrera ?? ""}`;
      return normalizeText(hay).includes(q);
    });
  }, [studentsWithReports, searchQuery]);

  const totalPages = useMemo(
    () => Math.ceil(filteredStudents.length / ITEMS_PER_PAGE),
    [filteredStudents]
  );

  const paginatedStudents = useMemo(() => {
    if (filteredStudents.length === 0) return [];
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, page]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }

    const currentSelectionVisible = paginatedStudents.some(
      (s) => s.id === selectedStudentId
    );

    if (paginatedStudents.length > 0 && !currentSelectionVisible) {
      setSelectedStudentId(paginatedStudents[0].id);
    } else if (filteredStudents.length === 0) {
      setSelectedStudentId(null);
    }
  }, [
    page,
    totalPages,
    paginatedStudents,
    selectedStudentId,
    filteredStudents,
  ]);

  const renderListSkeleton = () => (
    <Stack spacing={2}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Paper variant="outlined" key={index} sx={{ p: 2 }}>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </Paper>
      ))}
    </Stack>
  );

  const renderDetailSkeleton = () => (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <Skeleton variant="text" width="60%" height={40} />
      <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
      <Divider sx={{ my: 3 }} />
      <Skeleton variant="rectangular" height={200} />
    </Paper>
  );

  const renderStudentList = () => (
    <Stack spacing={2}>
      <TextField
        fullWidth
        size="small"
        placeholder="Buscar estudiante"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <List disablePadding>
        {filteredStudents.length > 0 ? (
          paginatedStudents.map((s) => {
            const isActive = selectedStudentId === s.id;
            return (
              <ListItem key={s.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => setSelectedStudentId(s.id)}
                  sx={{
                    alignItems: "flex-start",
                    borderRadius: 2,
                    border: (theme) =>
                      `1px solid ${
                        isActive
                          ? theme.palette.primary.main
                          : theme.palette.divider
                      }`,
                    backgroundColor: isActive
                      ? "primary.main"
                      : "background.paper",
                    color: isActive ? "primary.contrastText" : "inherit",
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          sx={{ flex: 1 }}
                        >
                          {`${s.nombre} ${s.apellido}`}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.85,
                          mt: 0.5,
                          color: isActive
                            ? "primary.contrastText"
                            : "text.secondary",
                        }}
                      >
                        {s.email}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {searchQuery
                ? "No se encontraron estudiantes"
                : "Ningún estudiante ha subido informes"}
            </Typography>
          </Paper>
        )}
      </List>
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
          shape="rounded"
          sx={{ display: "flex", justifyContent: "center" }}
        />
      )}
    </Stack>
  );

  const renderStudentDetail = () => {
    if (!selectedStudent) {
      return (
        <Paper
          variant="outlined"
          sx={{ p: 4, textAlign: "center", height: "100%" }}
        >
          <Typography variant="h6" gutterBottom>
            Selecciona un estudiante
          </Typography>
          <Typography color="text.secondary">
            Haz clic en un estudiante de la lista para ver sus detalles.
          </Typography>
        </Paper>
      );
    }

    const informes = informesMap[selectedStudent.id] ?? [];
    const practicas = practicasMap[selectedStudent.id] ?? [];
    const informesAvance = informes.filter(
      (inf) => classifyInformeTipo(inf) === "avance"
    );
    const informesFinal = informes.filter(
      (inf) => classifyInformeTipo(inf) === "final"
    );
    const empresaName =
      practicas.length > 0
        ? empresasMap[practicas[0].empresa_id] ?? "Empresa desconocida"
        : "—";
    const periodoPractica =
      practicas.length > 0 && practicas[0].fecha_inicio
        ? `${new Date(practicas[0].fecha_inicio).toLocaleDateString()} - ${
            practicas[0].fecha_termino
              ? new Date(practicas[0].fecha_termino).toLocaleDateString()
              : "Actualidad"
          }`
        : "—";

    const renderInforme = (inf: any) => {
      const tipo = classifyInformeTipo(inf);
      return (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-start"
          key={inf.id}
        >
          <Button size="small" variant="text" onClick={() => openModal(inf)}>
            {inf.nombre ??
              (tipo === "avance" ? "Ver Informe" : "Ver Informe Final")}
          </Button>

          {inf.nota !== undefined && inf.nota !== null && (
            <Typography
              variant="caption"
              sx={{ ml: 2, color: "text.secondary" }}
            >
              Nota: {Number(inf.nota).toFixed(1)}
            </Typography>
          )}
        </Stack>
      );
    };

    return (
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box>
            <Typography variant="h5" component="h2" fontWeight={700}>
              {`${selectedStudent.nombre} ${selectedStudent.apellido}`}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {selectedStudent.email}
            </Typography>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Section
                title="Datos del estudiante"
                items={[
                  {
                    label: "Nombre completo",
                    value:
                      `${selectedStudent.nombre ?? ""} ${
                        selectedStudent.apellido ?? ""
                      }`.trim() || "—",
                  },
                  { label: "Correo", value: selectedStudent.email ?? "—" },
                  { label: "teléfono", value: selectedStudent.telefono ?? "—" },
                  { label: "Carrera", value: selectedStudent.carrera ?? "—" },
                ]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Section
                title="Información de la Práctica"
                items={[
                  {
                    label: "Tipo",
                    value:
                      practicas.length > 0 ? practicas[0].tipo_practica : "—",
                  },
                  { label: "Empresa", value: empresaName },
                  { label: "Periodo", value: periodoPractica },
                ]}
              />
            </Grid>
          </Grid>

          {/* INFORMATIVE BOX */}
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "rgba(250,170,30,0.25)",
                backgroundColor: "#fff8e6",
                p: 2,
              }}
            >
              <Box
                sx={{
                  minWidth: 110,
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 1,
                  bgcolor: "#fff3cd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#c76a00", fontWeight: 800 }}
                >
                  IMPORTANTE:
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary",
                    maxWidth: "300px",
                    width: "100%",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  Asegúrate de indicar en el nombre del archivo a qué práctica
                  corresponde, por ejemplo: <em>"Practica I.pdf"</em>,{" "}
                  <em>"Practica II.docx"</em>, etc. Esto facilita la
                  identificación y el seguimiento.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid item xs={12} sx={{ mt: 3 }}>
            <Section
              title="Documentos"
              items={[
                {
                  label: "Informes de Avance",
                  value:
                    informesAvance.length > 0 ? (
                      <Stack spacing={1}>
                        {informesAvance.map(renderInforme)}
                      </Stack>
                    ) : (
                      "-"
                    ),
                },
                {
                  label: "Informes Finales",
                  value:
                    informesFinal.length > 0 ? (
                      <Stack spacing={1}>
                        {informesFinal.map(renderInforme)}
                      </Stack>
                    ) : (
                      "-"
                    ),
                },
              ]}
            />
          </Grid>
        </Paper>
      </Stack>
    );
  };

  const renderContent = () => {
    if (error) {
      return (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        </Grid>
      );
    }

    if (!loading && students.length === 0) {
      return (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6">
              No hay estudiantes con práctica asignada a este coordinador.
            </Typography>
          </Paper>
        </Grid>
      );
    }

    return (
      <>
        <Grid item xs={12} sm={4}>
          {loading ? renderListSkeleton() : renderStudentList()}
        </Grid>
        <Grid item xs={12} sm={8}>
          {loading ? renderDetailSkeleton() : renderStudentDetail()}
        </Grid>
      </>
    );
  };

  return (
    <DashboardTemplate title="Seguimiento de estudiantes">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Informes de Estudiantes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aquí podrás revisar los informes de avance y finales subidos por los
          estudiantes de la carrera de{" "}
          <strong>{coordinator?.carrera ?? "..."}</strong>.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {renderContent()}
      </Grid>

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        fullWidth
        maxWidth="sm"
        aria-labelledby="dialog-documento-title"
      >
        <DialogTitle id="dialog-documento-title">Documento</DialogTitle>

        <DialogContent dividers>
          {modalInforme ? (
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                {modalInforme.nombre ?? "Documento"}
              </Typography>

              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box sx={{ flex: 1, wordBreak: "break-word" }}>
                  <Typography variant="body2" color="text.secondary">
                    {modalInforme.ruta}
                  </Typography>
                </Box>

                <Tooltip title={downloading ? "Descargando..." : "Descargar"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => downloadFile(modalInforme)}
                      disabled={!modalInforme || downloading}
                      aria-label="Descargar documento"
                      color="primary"
                    >
                      {downloading ? (
                        <CircularProgress size={18} />
                      ) : (
                        <DownloadIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <Typography variant="caption" color="text.secondary">
                Tipo: {modalInforme.tipo ?? "—"}
              </Typography>

              <Divider sx={{ my: 1 }} />

              {(() => {
                const tipoInforme = classifyInformeTipo(modalInforme);

                if (tipoInforme === "avance") {
                  return (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={triggerFileSelect}
                          disabled={uploading}
                        >
                          Seleccionar archivo de retroalimentación
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                          {selectedFile
                            ? selectedFile.name
                            : "Ningún archivo seleccionado"}
                        </Typography>
                      </Stack>
                    </>
                  );
                } else if (tipoInforme === "final") {
                  return (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", my: 2 }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          navigate(
                            `/coordinador/evaluar-informe/${modalInforme.id}`
                          );
                          closeModal();
                        }}
                      >
                        Evaluar
                      </Button>
                    </Box>
                  );
                } else {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      La calificación y retroalimentación solo están disponibles
                      para informes de avance o finales.
                    </Typography>
                  );
                }
              })()}
            </Stack>
          ) : (
            <Typography>Sin información.</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {modalInforme && classifyInformeTipo(modalInforme) === "avance" && (
            <MuiButton
              onClick={uploadNewFile}
              disabled={uploading || !selectedFile}
              variant="outlined"
            >
              {uploading ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={16} />
                  <span>Subiendo...</span>
                </Stack>
              ) : (
                "Subir archivo"
              )}
            </MuiButton>
          )}
          <Button onClick={closeModal} disabled={uploading}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackClose}
          severity={snackSeverity}
          sx={{ width: "100%" }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </DashboardTemplate>
  );
};

interface SectionProps {
  title: string;
  items: Array<{ label: string; value: React.ReactNode }>;
}

const Section = ({ title, items }: SectionProps) => (
  <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
      {title}
    </Typography>
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        <Box key={`${item.label}-${index}`}>
          {item.label && (
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                fontWeight: 600,
                opacity: 0.7,
              }}
            >
              {item.label}
            </Typography>
          )}
          <Typography
            variant="body1"
            component="div"
            sx={{ wordBreak: "break-word" }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  </Paper>
);

export default CoordinadorInformesEstudiantes;
