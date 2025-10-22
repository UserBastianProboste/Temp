import React, { useRef, useState } from "react";
import type { FC } from "react";
import { supabase } from "../../../../consultoria_informatica/frontend/src/services/supabaseClient";
import DownloadIcon from "@mui/icons-material/Download";
import DashboardTemplate from "../../../../consultoria_informatica/frontend/src/components/DashboardTemplate";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";

type DownloadItem = {
  label: string;
  bucket?: string;
  path: string;
  private?: boolean;
  expiresSec?: number;
};

type UploadCardProps = {
  title: string;
  bucket: string;
  tipo?: "avance" | "final" | string;
  allowedExtensions?: string[];
  maxSizeMB?: number;
  downloads?: DownloadItem[];
};

type ValidateResult = { ok: true } | { ok: false; msg: string };

// Componente para subir un archivo
const UploadCard: FC<UploadCardProps> = ({
  title,
  bucket,
  tipo: tipoProp,
  allowedExtensions = [".pdf", ".doc", ".docx"],
  maxSizeMB = 10,
  downloads = [],
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  const acceptAttr = allowedExtensions.join(",");
  // Validación básica del archivo
  const validateFile = (file: File | null): ValidateResult => {
    if (!file) return { ok: false, msg: "No se seleccionó archivo." };

    const name = file.name.toLowerCase();
    const extOk = allowedExtensions.some((ext) => name.endsWith(ext));
    if (!extOk)
      return {
        ok: false,
        msg: `Formato no permitido. Extensiones permitidas: ${allowedExtensions.join(
          ", "
        )}`,
      };

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB)
      return {
        ok: false,
        msg: `Archivo muy grande. Tamaño máximo ${maxSizeMB} MB.`,
      };

    return { ok: true };
  };

  // manejar selección de archivo
  const onButtonClick = () => inputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const file = e.target.files?.[0] ?? null;
    const v = validateFile(file);
    if (!v.ok) {
      setSelectedFile(null);
      setError(v.msg);
      return;
    }
    setSelectedFile(file);
  };

  // subir el archivo al bucket y registrar en la tabla "informes"
  const uploadFile = async () => {
    setError("");
    setSuccess("");
    if (!selectedFile) {
      setError("No hay archivo seleccionado para subir.");
      return;
    }

    try {
      setUploading(true);

      // 1) Obtener usuario autenticado (supabase-js v2)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("No autenticado. Inicia sesión antes de subir.");
      }
      const userId = user.id;

      // 1.1) Obtener (o crear) el registro de 'estudiantes' asociado a este user_id
      let estudianteId: string | null = null;
      const { data: estudianteRow, error: estudianteErr } = await supabase
        .from("estudiantes")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (estudianteErr) throw estudianteErr;

      if (estudianteRow && (estudianteRow as any).id) {
        estudianteId = (estudianteRow as any).id;
      } else {
        const defaultName =
          (user.user_metadata as any)?.full_name ?? user.email ?? "Alumno";
        const defaultApellido = "";
        const defaultEmail = user.email ?? "";

        const { data: newEst, error: insertEstErr } = await supabase
          .from("estudiantes")
          .insert({
            user_id: userId,
            nombre: defaultName,
            apellido: defaultApellido,
            email: defaultEmail,
          })
          .select("id")
          .single();

        if (insertEstErr) {
          throw new Error(
            "No existe perfil de estudiante y no se pudo crear automáticamente."
          );
        }
        estudianteId = (newEst as any).id;
      }

      // 2) Generar path unico para storage
      const safeName = selectedFile.name.replace(/\s+/g, "_");
      const filename = `${Date.now()}_${safeName}`;
      const path = `informes/${userId}/${filename}`;

      // 3) Subir al bucket pasado por prop
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, selectedFile as File, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) throw uploadError;

      // usar la path devuelta por el server
      const serverPath = (uploadData as any)?.path ?? path;

      let coordinatorId: string | null = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "obtener_coordinador_id"
        );
        if (rpcError) {
          console.warn("RPC obtener_coordinador_id error:", rpcError);
        } else if (rpcData == null) {
          coordinatorId = null;
        } else if (Array.isArray(rpcData) && rpcData.length > 0) {
          const first = (rpcData as any)[0];
          coordinatorId = first?.obtener_coordinador_id ?? (first as any);
        } else if (typeof rpcData === "object") {
          coordinatorId = (rpcData as any).obtener_coordinador_id ?? null;
        } else if (typeof rpcData === "string") {
          coordinatorId = rpcData;
        }
      } catch (rpcErr) {
        console.warn("Error llamando RPC obtener_coordinador_id:", rpcErr);
        coordinatorId = null;
      }

      // determinar tipo final (prop tiene prioridad)
      const tipoFinal =
        tipoProp && String(tipoProp).trim().length > 0
          ? String(tipoProp)
          : bucket.toLowerCase().includes("avance")
          ? "avance"
          : bucket.toLowerCase().includes("final")
          ? "final"
          : "otro";

      const { error: insertError } = await supabase
        .from("informes")
        .insert([
          {
            coordinador_id: coordinatorId,
            estudiante_id: estudianteId,
            nombre: selectedFile.name,
            ruta: serverPath,
            bucket,
            size: selectedFile.size,
            mime: selectedFile.type,
            public: false,
            tipo: tipoFinal,
          },
        ])
        .select("*");

      if (insertError) {
        try {
          await supabase.storage.from(bucket).remove([path]);
        } catch (remErr) {
          console.error(
            "No se pudo eliminar archivo tras fallo insert:",
            remErr
          );
        }
        throw insertError;
      }

      setSuccess("Archivo subido y registrado correctamente.");
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      setError(`Error al subir: ${err?.message ?? String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  //Descarga de archivos
  const handleDownload = async (item: DownloadItem, idx: number) => {
    setError("");
    setSuccess("");
    setDownloadingIdx(idx);
    try {
      const useBucket = item.bucket ?? bucket;

      if (item.private) {
        const expires = item.expiresSec ?? 60;
        const { data, error: signErr } = await supabase.storage
          .from(useBucket)
          .createSignedUrl(item.path, expires);
        if (signErr) throw signErr;
        const signedUrl =
          (data as any)?.signedUrl ||
          (data as any)?.signedURL ||
          (data as any)?.signed_url;
        if (!signedUrl) throw new Error("No se pudo generar la signed URL.");
        window.open(signedUrl, "_blank");
      } else {
        const { data } = supabase.storage.from(useBucket).getPublicUrl(item.path);
        const publicUrl = (data as any)?.publicUrl || (data as any)?.public_url;
        if (!publicUrl) throw new Error("No existe URL pública para este archivo.");
        const a = document.createElement("a");
        a.href = publicUrl;
        a.download = item.label || item.path.split("/").pop() || "archivo";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err: any) {
      console.error(err);
      setError(`Error al descargar: ${err?.message ?? String(err)}`);
    } finally {
      setDownloadingIdx(null);
    }
  };

  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: 900,
        mx: "auto",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        p: { xs: 2, md: 4 },
        borderRadius: 2,
        boxShadow: 2,
        mb: 3,
      }}
    >
      <CardContent sx={{ padding: 0, flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {selectedFile
            ? `Seleccionado: ${selectedFile.name}`
            : `Formatos permitidos: ${allowedExtensions.join(", ")}`}
        </Typography>

        {/* Botones de descarga */}
        {downloads.length > 0 && (
          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {downloads.map((d, i) => (
              <Button
                key={i}
                variant="outlined"
                startIcon={<DownloadIcon />}
                size="small"
                onClick={() => handleDownload(d, i)}
                disabled={downloadingIdx !== null}
                sx={{ textTransform: "none" }}
              >
                {downloadingIdx === i ? "Generando..." : d.label}
              </Button>
            ))}
          </Box>
        )}
      </CardContent>

      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={onFileChange}
        accept={acceptAttr}
      />

      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          mt: { xs: 2, md: 0 },
          ml: { xs: 0, md: 2 },
          flexDirection: { xs: "column", md: "row" },
          width: { xs: "100%", md: "auto" },
        }}
      >
        {/* seleccionar archivo */}
        <Button
          variant="contained"
          onClick={onButtonClick}
          sx={{
            bgcolor: "red",
            "&:hover": { bgcolor: "darkred" },
            borderRadius: 3,
            textTransform: "none",
            fontWeight: "bold",
            width: { xs: "100%", md: 250 },
            py: 1,
          }}
        >
          Seleccionar
        </Button>

        {/* subir archivo */}
        <Button
          variant="outlined"
          onClick={uploadFile}
          disabled={!selectedFile || uploading}
          sx={{
            textTransform: "none",
            width: { xs: "100%", md: "auto" },
            py: 1,
          }}
        >
          {uploading ? <CircularProgress size={20} /> : "Subir Archivo"}
        </Button>
      </Box>
      {/* mensajes de error/exito */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError("")}>
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={5000} onClose={() => setSuccess("")}>
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      </Snackbar>
    </Card>
  );
};

// Componente para listar recursos descargables
const ResourcesCard: FC<{ items: DownloadItem[]; title?: string }> = ({
  items,
  title = "Recursos",
}) => {
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // logica de descarga
  const handleDownload = async (item: DownloadItem, idx: number) => {
    setError("");
    setSuccess("");
    setDownloadingIdx(idx);
    try {
      const useBucket = item.bucket ?? "documentacion";
      if (item.private) {
        const expires = item.expiresSec ?? 60;
        const { data, error: signErr } = await supabase.storage
          .from(useBucket)
          .createSignedUrl(item.path, expires);
        if (signErr) throw signErr;
        const signedUrl =
          (data as any)?.signedUrl ||
          (data as any)?.signedURL ||
          (data as any)?.signed_url;
        if (!signedUrl) throw new Error("No se pudo generar la signed URL.");
        window.open(signedUrl, "_blank");
      } else {
        const { data } = supabase.storage.from(useBucket).getPublicUrl(item.path);
        const publicUrl = (data as any)?.publicUrl || (data as any)?.public_url;
        if (!publicUrl) throw new Error("No existe URL pública para este archivo.");
        const a = document.createElement("a");
        a.href = publicUrl;
        a.download = item.label || item.path.split("/").pop() || "archivo";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err: any) {
      console.error(err);
      setError(`Error al descargar: ${err?.message ?? String(err)}`);
    } finally {
      setDownloadingIdx(null);
    }
  };

  return (
    <Card sx={{ width: "100%", mt: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {items.map((it, i) => (
            <Button
              key={i}
              variant="outlined"
              startIcon={<DownloadIcon />}
              size="small"
              onClick={() => handleDownload(it, i)}
              disabled={downloadingIdx !== null}
              sx={{ textTransform: "none" }}
            >
              {downloadingIdx === i ? "Generando..." : it.label}
            </Button>
          ))}
        </Box>

        {/* snackbars para errores/éxitos */}
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError("")}>
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar open={!!success} autoHideDuration={5000} onClose={() => setSuccess("")}>
          <Alert severity="success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default function AdjuntarInformesEstudiantes(): React.ReactElement {
  return (
    <DashboardTemplate title="Adjuntar informes">
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: { xs: 2, md: 4 },
        }}
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
                Bienvenido a la Sección de Informes
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
                Aquí podrás subir los informes de avance como también el informe
                final de tu práctica profesional.
              </Typography>

              <Box
                sx={{
                  maxWidth: 600,
                  bgcolor: "#FFF9C4",
                  border: "1px solid #FBC02D",
                  borderRadius: 2,
                  p: 2,
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mx: "auto",
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: "bold", color: "#F57F17" }}>
                  IMPORTANTE:
                </Typography>
                <Typography variant="body2" sx={{ color: "#333" }}>
                  Asegúrate de indicar en el nombre del archivo a qué práctica corresponde,
                  por ejemplo: "Práctica I.pdf", "Práctica II.docx", etc.
                </Typography>
              </Box>

              <UploadCard
                title="Subir Informe de Avance de Práctica Profesional"
                bucket="informe_avance_practica"
                tipo="avance"
                allowedExtensions={[".pdf", ".docx"]}
                maxSizeMB={10}
              />

              <UploadCard
                title="Subir Informe Final de Práctica Profesional"
                bucket="informe_final_practica"
                tipo="final"
                allowedExtensions={[".pdf", ".docx"]}
                maxSizeMB={20}
              />

              <ResourcesCard
                title="Plantillas y Rúbricas"
                items={[
                  {
                    label: "Plantilla de Informe",
                    bucket: "documentacion",
                    path: "Planilla Informe de Practica Profesional.docx",
                    private: false,
                  },
                  {
                    label: "Rúbrica de Informe",
                    bucket: "documentacion",
                    path: "Rubrica para el informe.docx",
                    private: false,
                  },
                ]}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </DashboardTemplate>
  );
}
