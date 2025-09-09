import { useState } from "react";
import { Box,Button,TextField,Typography,Alert,CircularProgress,Grid} from "@mui/material"

import { useNavigate } from "react-router-dom";

export default function RegisterEstudiante(){
    const [firstName,setFirstName] = useState("")
    const [lastName,setLastName] = useState("")
    const[email,setEmail] = useState("");
    const[carrera,setCarrera] = useState("");
    const[password,setPassword] = useState("")
    const[rut,setRut] = useState("")
    const[telefono,setTelefono] = useState("")
    const[direccion,setDireccion] = useState("")
    const[error,setError] = useState("");
    const[success,setSuccess] = useState("");
    const[loading,setLoading] = useState(false);

    const navigate = useNavigate();
    const validateEmail = (email:string)=> /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    

    const handleSubmit = async (e:React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        if(!firstName.trim()){
            setError("El nombre es obligatorio")
            setLoading(false);
            return;
        }
        if(!lastName.trim()){
            setError("El Apellido es obligatorio")
            setLoading(false);
            return;
        }
        if(!validateEmail(email)){
            setError("El email no es valido")
            return;
        }
        if(!carrera.trim()){
            setError("El carrera es obligatorio")
            return;
        }
        if(!password.trim()){
            setError("El password es obligatorio")
            return;
        }
        try{
            const response = await fetch("http://127.0.0.1:8000/api/register/",{
                method: 'POST',
                headers: {
                    "Content-Type":"application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                    firstName: firstName,
                    lastName:lastName,
                    carrera,
                    rut,
                    telefono,
                    direccion,
                    
                    
                }),

            });

            const data = await response.json()
            if (response.ok){
                setSuccess("Estudiante Registrado correctamente");
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.detail || data.username || data.email || 'Error en el registro');
                        }
        }catch{
            console.error('error de registro:',error)
            setError("Error de conexion")
        } finally {
            setLoading(false);
        }
    };
    return(
        <Box sx={{maxWidth:400,mx:"auto",mt:4,p:4,boxShadow:2,borderRadius:2,bgcolor:"#fff"}}>
            <Typography variant="h5" align="center" gutterBottom color="secondary">
             Registro de estudiante
            </Typography>
            {success && (
                <Alert severity="success" sx={{my:2}}>
                    {success}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{my:2}}>
                    {error}
                </Alert>
            )}
            <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="Nombre"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
          </Grid>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="Apellido"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
          </Grid>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
          </Grid>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="Carrera"
              value={carrera}
              onChange={e => setCarrera(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
          </Grid>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="RUT"
              value={rut}
              onChange={e => setRut(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
          </Grid>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="Teléfono"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
          </Grid>
          <Grid size={{xs:12 ,md:6}}>
            <TextField
              label="Dirección"
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
          </Grid>
        </Grid>

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 2 }}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Registrarse'}
                </Button>

                <Box textAlign='center' mt={3}>
                    <Button
                        onClick={() => navigate('/login')}
                        color="secondary"
                    >
                        Ya tengo una cuenta
                    </Button>
                </Box>
            </form>
        </Box>
    );
}