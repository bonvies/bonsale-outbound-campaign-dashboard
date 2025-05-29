import Router from "./router/Router.tsx";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import theme from './theme/theme.ts';
import custom from "./theme/custom.ts";

import { Box, Container } from '@mui/material';
import Navbar from './components/Navbar';

const muiTheme = createTheme(theme, custom);

const { protocol, hostname } = window.location;
// 假設 API port 寫死 3020
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${protocol}//${hostname}:${port}`;
console.log('HTTP_HOST:', HTTP_HOST);

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
        <Container maxWidth='lg' sx={{ position:'relative', flex: 1, display:'flex', flexDirection: 'column', height:'100%', overflowY:'hidden' }}>
          <Router />
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
