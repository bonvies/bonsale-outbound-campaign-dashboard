const theme = {
  mode: 'light',
  typography: {
    fontFamily: ['Roboto', 'Noto Sans TC', 'sans-serif'].join(','),
  },
  palette: {
    primary: {
      main: '#7BA9C6',
      light: '#9FC1D6',
      dark: '#4B7A95',
    },
    secondary: {
      main: '#89D0DF',
      light: '#BCFFFF',
      dark: '#579FAD',
    },
    error: {
      main: '#FF4D4D',
      light: '#FF8279',
      dark: '#C50024',
    },
    warning: {
      main: '#F2C055',
      light: '#FFF285',
      dark: '#BC9024',
    },
    info: {
      main: '#6CC0C0',
      light: '#90D0D0',
      dark: '#4BAFAF',
    },
    success: {
      main: '#70DCAD',
      light: '#A4FFDF',
      dark: '#3BA97D',
    },
    text: {
      primary: 'rgba(0,0,0,0.8)',
      secondary: 'rgba(0,0,0,0.6)',
      disabled: 'rgba(0,0,0,0.38)',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
}

export default theme
