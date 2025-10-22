import React, { useState } from "react";
import {
    Box,
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../../consultoria_informatica/frontend/src/services/supabaseClient";


const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Ingresa tu email');
            return;
        }
        try {
            setLoading(true);
            setError('');

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                setError('Error al enviar email: ' + error.message);
                return;
            }
            setSuccess(true);
        } catch (error: unknown) {
            console.log('Error', error);
            setError('Error inesperado al enviar email');
        } finally {
            setLoading(false);
        }
    };
    const backgroundStyles = {
        minHeight: '100vh',
        background: (theme: any) => `linear-gradient(135deg, ${theme.palette.primary.light}1A, ${theme.palette.secondary.light}1A)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2
    } as const;

    const cardStyles = {
        p: { xs: 3, sm: 4 },
        borderRadius: 3,
        backgroundColor: 'background.paper',
        backdropFilter: 'blur(12px)',
        boxShadow: (theme: any) => `0 20px 45px ${theme.palette.primary.main}22`,
        animation: 'fadeInUp 400ms ease',
        '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
        }
    } as const;


    if (success) {
        return (
            <Box sx={backgroundStyles}>
                <Container maxWidth='sm'>
                    <Paper elevation={8} sx={{ ...cardStyles, textAlign: 'center' }}>
                        <EmailIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h4" component='h1' gutterBottom>
                            Email enviado
                        </Typography>
                        <Typography variant="body1" color="text.secondary" mb={2}>
                            Revisa tu bandeja de entrada y la carpeta de spam para continuar con el proceso.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                            Si no recibiste el correo, puedes solicitar uno nuevo a continuación.
                        </Typography>
                        <Box display='flex' flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => navigate('/login')}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2,
                                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    boxShadow: (theme) => `0 12px 24px ${theme.palette.primary.main}33`
                                }}
                            >
                                Volver al Login
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => {
                                    setSuccess(false);
                                    setEmail('');
                                }}
                                sx={{ py: 1.5, borderRadius: 2 }}
                            >
                                Enviar otro email
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        );
    }
    return (
        <Box sx={backgroundStyles}>
            <Container maxWidth='sm'>
                <Paper elevation={8} sx={cardStyles}>
                    <Box textAlign='center' mb={3}>
                        <EmailIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h4" component="h1" gutterBottom>
                            Recuperar Contraseña
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                        </Typography>
                    </Box>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}
                    <Box component='form' onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label='Email'
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                            autoFocus
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                borderRadius: 2,
                                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                boxShadow: (theme) => `0 12px 24px ${theme.palette.primary.main}33`,
                                transition: 'transform 150ms ease, box-shadow 150ms ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: (theme) => `0 16px 28px ${theme.palette.primary.main}44`
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} />
                            ) : (
                                'Enviar Enlace de recuperacion'
                            )}
                        </Button>
                        <Box textAlign='center'>
                            <Link to='/login' style={{ textDecoration: 'none' }}>
                                <Typography variant="body2" color="primary">
                                    ← Volver al Login
                                </Typography>
                            </Link>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};
export default ForgotPassword;