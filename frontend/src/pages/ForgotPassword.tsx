import React,{useState} from "react";
import {
    Box,
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress
}   from '@mui/material';
import { Email as EmailIcon} from '@mui/icons-material';
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";


const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit =  async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()){
            setError('Ingresa tu email');
            return;
        }
        try {
            setLoading(true);
            setError('');

            const {error} = await authService.resetPassword(email);

            if (error){
                setError('Error al enviar email:' + error.message);
                return;
            }
            setSuccess(true);
        }catch (error:unknown) {
            console.log('Error',error);
            setError('Error inesperado al enviar email');
        }finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Box sx={{
                backgroundColor:'background.default',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                minHeight:'100vh'
            }}
            >
                <Container maxWidth='sm'>
                    <Paper elevation={3} sx={{p:4}}>
                        <Box textAlign='center' mb={3}>
                            <EmailIcon sx={{fontSize:64,color:'primary.main',mb:2}}/>
                            <Typography variant="h4" component='h1' gutterBottom>
                                Email Enviado
                            </Typography>
                            <Typography variant="body1" color="text.secondary" mb={3}>
                                Email Enviado
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Email Enviado
                            </Typography>
                            
                            <Box display='flex' gap={2} justifyContent='center'>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate('/login')}
                                    >
                                        Volver al Login
                                    </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setSuccess(false);
                                        setEmail('email');
                                    }}
                                    >
                                        Enviar Otro Email
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        );
    }
    return(
        <Box
            sx={{
                backgroundColor:'background.default',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                minHeight:'100vh'
            }}
        >
            <Container maxWidth='sm'>
                <Paper elevation={3} sx={{p:4}}>
                    <Box textAlign='center' mb={3}>
                        <EmailIcon sx={{ fontSize:64 , color:'primary.main',mb:2}}/>
                        <Typography variant="h4" component="h1" gutterBottom>
                        Recuperar Contraseña
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                        Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                        </Typography>
                    </Box>
                    {error && (
                        <Alert severity="error" sx={{mb:3}}>
                            {error}
                        </Alert>
                    )}
                    <Box component='form' onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label='Email'
                            type="email"
                            value={email}
                            onChange={(e)=> setEmail(e.target.value)}
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
                            sx={{mt:3,mb:2,py:1.5}}
                        >
                            {loading ? (
                                <CircularProgress size={24}/>
                            ) : (
                                'Enviar Enlace de recuperacion'
                            )}
                        </Button>
                        <Box textAlign='center'>
                            <Link to='/login'>
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

export default ForgotPassword