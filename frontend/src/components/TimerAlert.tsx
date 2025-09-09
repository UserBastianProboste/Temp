import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Snackbar, Alert } from '@mui/material';

export default function TimerAlert() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let interval: number | undefined;
    if (running && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (running && timeLeft === 0) {
      setRunning(false);
      setOpen(true);
      notify();
    }
    return () => clearInterval(interval);
  }, [running, timeLeft]);

  const startTimer = () => {
    const total = hours * 3600 + minutes * 60 + seconds;
    if (total > 0) {
      setTimeLeft(total);
      setRunning(true);
    }
  };

  const notify = async () => {
    const email = localStorage.getItem('email');
    const token = localStorage.getItem('token');
    try {
      await fetch('http://127.0.0.1:8000/api/alert/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      console.error('No se pudo enviar la alerta', err);
    }
    alert('¡Tiempo terminado!');
  };

  const format = (t: number) => {
    const h = Math.floor(t / 3600).toString().padStart(2, '0');
    const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <Box textAlign="center" mt={4}>
      {!running && (
        <Box display="flex" justifyContent="center" gap={2} mb={2}>
          <TextField
            label="Horas"
            type="number"
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Minutos"
            type="number"
            value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Segundos"
            type="number"
            value={seconds}
            onChange={e => setSeconds(Number(e.target.value))}
            inputProps={{ min: 0 }}
          />
        </Box>
      )}
      {running && (
        <Typography variant="h3" mb={2}>{format(timeLeft)}</Typography>
      )}
      <Button variant="contained" onClick={startTimer} disabled={running}>
        Iniciar
      </Button>
      <Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)}>
        <Alert severity="warning" onClose={() => setOpen(false)} sx={{ width: '100%' }}>
          ¡Tiempo terminado!
        </Alert>
      </Snackbar>
    </Box>
  );
}