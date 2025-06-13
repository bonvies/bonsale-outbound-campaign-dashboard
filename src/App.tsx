import Router from "./router/Router.tsx";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import theme from './theme/theme.ts';
import custom from "./theme/custom.ts";

import { Box, Container } from '@mui/material';
import Navbar from './components/Navbar';

const muiTheme = createTheme(theme, custom);

const VITE_DOMAIN = import.meta.env.VITE_DOMAIN;
if (!localStorage.getItem('VITE_DOMAIN')) {
  localStorage.setItem('VITE_DOMAIN', VITE_DOMAIN);
}
console.log('VITE_DOMAIN:', localStorage.getItem('VITE_DOMAIN') || VITE_DOMAIN);

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: (theme) => theme.palette.background.default,
          color: (theme) => theme.palette.text.primary,
        }}
      >
        <Box sx={{ flex: 0, flexDirection: 'column' }}>
          <Navbar />
        </Box>
        <Container
          maxWidth={false}
          sx={{
            position:'relative',
            flex: 1,
            display:'flex',
            flexDirection: 'column',
            height:'100%',
            overflowY:'hidden', 
            maxWidth: (theme) => theme.breakpoints.values.laptop, width: '100%' 
          }}
        >
          <Router />
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
