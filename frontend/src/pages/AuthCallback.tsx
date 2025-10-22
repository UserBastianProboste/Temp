import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { Box, CircularProgress, Alert, Paper, Container, Typography } from "@mui/material";

export default function AuthCallback() {
    const nav = useNavigate();
    const [err, setErr] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                const url = new URL(window.location.href);
                const type = url.searchParams.get("type");              // 'signup' | 'recovery' | 'magiclink' | etc.
                const code = url.searchParams.get("code");              // PKCE
                const token_hash = url.searchParams.get("token_hash");  // OTP

                // 1) Confirmar sesión (PKCE primero, luego OTP)
                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                } else if (token_hash && type) {
                    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
                    if (error) throw error;
                } else {
                    throw new Error("Enlace inválido o incompleto.");
                }

                // 2) Con sesión válida, crear perfil de estudiante si no existe (RLS: auth.uid())
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Sesión no encontrada tras confirmar.");

                // idempotente: si ya existe, no inserta
                const { data: exists, error: selErr } = await supabase
                    .from("estudiantes")
                    .select("id")
                    .eq("user_id", user.id)
                    .maybeSingle();
                if (selErr) throw selErr;

                if (!exists) {
                    // intenta partir nombre/apellido desde user_metadata.full_name
                    const full = (user.user_metadata?.full_name as string | undefined)?.trim() ?? "";
                    const nombre = full.split(" ")[0] ?? "";
                    const apellido = full.split(" ").slice(1).join(" ") ?? "";

                    const { error: insErr } = await supabase.from("estudiantes").insert({
                        nombre,
                        apellido,
                        email: user.email ?? "",
                        telefono: "",
                        carrera: null,
                        sede: null,
                    });
                    if (insErr) throw insErr;
                }

                // 3) Redirige donde quieras
                nav("/login", { replace: true });
            } catch (e: any) {
                setErr(e?.message ?? "No se pudo procesar el enlace.");
            }
        })();
    }, [nav]);

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <Container maxWidth="sm">
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Procesando…</Typography>
                    {!err ? <CircularProgress /> : <Alert severity="error">{err}</Alert>}
                </Paper>
            </Container>
        </Box>
    );
}
