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
                const code = url.searchParams.get("code");
                if (!code) throw new Error("Enlace inválido o incompleto.");
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) throw error;
                // listo: sesión creada
                nav("/login", { replace: true }); // o "/dashboard"
            } catch (e: any) {
                setErr(e?.message || "No se pudo confirmar el correo.");
            }
        })();
    }, [nav]);

    return (
        <Box sx={{ minHeight:"100vh", display:"flex", alignItems:"center" }}>
            <Container maxWidth="sm">
                <Paper sx={{ p:4, textAlign:"center" }}>
                    <Typography variant="h6" sx={{ mb:2 }}>Confirmando tu cuenta…</Typography>
                    {!err ? <CircularProgress/> : <Alert severity="error">{err}</Alert>}
                </Paper>
            </Container>
        </Box>
    );
}
