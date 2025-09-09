import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Link, Alert ,CircularProgress} from "@mui/material";

export default function Login(){
    const [email,setEmail] = useState("")
    const [password,setPassword] = useState("")
    const [error,setError] = useState("")
    const [loading,setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e:React.FormEvent)=>{
        e.preventDefault();
        setError("")
        setLoading(true);
        try{
            const response = await fetch("http://127.0.0.1:8000/api/login/",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });
            const data = await response.json();
            console.log("Respuesta completa:", data);
            const rol = data.tipo_usuario?.toLowerCase()?.trim();
            console.log("Tipo de usuario:", rol);

            if (response.ok && data.access && rol) {
                localStorage.setItem("token", data.access);
                localStorage.setItem("refresh", data.refresh);
                localStorage.setItem("rol", rol);
                localStorage.setItem("username", data.username);
                localStorage.setItem("email", data.email);

                // Redirigir segun el rol
                if (rol === "coordinador") {
                  navigate("/dashboard-coordinador");
                } else if (rol === "estudiante") {
                  navigate("/dashboard-estudiante");
                } else {
                  setError("Rol no reconocido");
                }
            } else {
                setError(data.detail || data.error || 'credenciales incorrectas');
            }
        }catch{
            console.error('error de login:',error)
            setError('Error de conexion con el servidor')
        }finally{
            setLoading(false)
        }
    };
    return(
        <Box
            maxWidth={400}
            mx="auto"
            mt={8}
            p={4}
            borderRadius={2}
            boxShadow={2}
            bgcolor={"#fff"}>
            <Typography variant="h5" align="center" gutterBottom>
                Iniciar Sesion
            </Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    label='Email'
                    type="email"
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    required
                    fullWidth
                    disabled={loading}
                    margin="normal"
                    autoComplete="email"
                    />
                <TextField
                    label='Password'
                    type="password"
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                    disabled={loading}
                    autoComplete="current-password"
                    />
                    

                <Button 
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{mt:2}}
                    disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'entrar'}
                    </Button>
              
            </form>
            {error && 
                (<Alert severity="error" sx={{mt:2}}>
                    {error}
                </Alert>)}
            <Box textAlign={"center"} mt={3}>
                <Link href="/registro" underline="hover">
                    No tienes cuenta registrate aqui
                </Link>
            </Box>
        </Box>
    );

}
