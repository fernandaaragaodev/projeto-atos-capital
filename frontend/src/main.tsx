import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Toaster } from 'sonner';

import '@/i18n';
import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
import { AuthProvider } from '@/auth/AuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="pt-br"
      >
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>

          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeModeProvider>
  </React.StrictMode>,
);