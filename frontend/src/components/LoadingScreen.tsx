import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { styled } from '@mui/material/styles';

const spinMorph = keyframes`
  0% {
    transform: rotate(0deg);
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  20% {
    transform: rotate(270deg);
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  25% {
    transform: rotate(315deg);
    clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  }
  40% {
    transform: rotate(360deg);
    clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  }
  60% {
    transform: rotate(450deg);
    clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  }
  70% {
    transform: rotate(540deg);
    clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  }
  75% {
    transform: rotate(600deg);
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  90% {
    transform: rotate(720deg);
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  100% {
    transform: rotate(720deg);
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
`;

const MorphingShape = styled('div')(({ theme }) => ({
  width: 72,
  height: 72,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  borderRadius: 12,
  animation: `${spinMorph} 2.8s infinite`,
  animationTimingFunction: 'linear',
  transformOrigin: '50% 50%',
  willChange: 'transform, clip-path',
  boxShadow: `0 10px 30px ${theme.palette.primary.main}33`,
}));

export function LoadingScreen() {
  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        bgcolor: 'background.default',
        color: 'text.primary',
        transition: 'background-color 0.3s ease',
      }}
    >
      <MorphingShape />
      <Typography variant="h6" component="p" sx={{ fontWeight: 500, letterSpacing: 1 }}>
        Cargando experiencia...
      </Typography>
    </Box>
  );
}

export default LoadingScreen;
