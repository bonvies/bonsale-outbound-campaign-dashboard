import React, { useState, useImperativeHandle, forwardRef } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';

export interface GlobalSnackbarRef {
  showSnackbar: (message: string, severity?: AlertColor) => void;
}

const GlobalSnackbar = forwardRef<GlobalSnackbarRef>((props, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');

  useImperativeHandle(ref, () => ({
    showSnackbar: (msg: string, sev: AlertColor = 'info') => {
      setMessage(msg);
      setSeverity(sev);
      setOpen(true);
    },
  }));

  const handleClose = () => setOpen(false);

  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <MuiAlert onClose={handleClose} severity={severity} sx={{ width: '100%' }} elevation={6} variant="filled">
        {message}
      </MuiAlert>
    </Snackbar>
  );
});

export default GlobalSnackbar;