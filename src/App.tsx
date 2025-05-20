import Router from "./router/Router.tsx";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import theme from './theme/theme.ts';
import custom from "./theme/custom.ts";

const muiTheme = createTheme(theme, custom);

function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <Router />
    </ThemeProvider>
  )
}

export default App
