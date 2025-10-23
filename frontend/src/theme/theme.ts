import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#da291c',
      light: '#f75b50ff',
      dark: '#4c0601ff',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      marginBottom: '1.5rem',
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
        margin: 'normal',
      },
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '12px',
          fontSize: '1rem',
        },
      },
    },
  },
});

export default theme;
export { theme };
