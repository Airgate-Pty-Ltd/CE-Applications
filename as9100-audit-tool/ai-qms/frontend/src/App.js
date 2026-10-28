import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import DocumentUpload from './pages/DocumentUpload';
import ReviewResults from './pages/ReviewResults';
import Subscription from './pages/Subscription';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<DocumentUpload />} />
        <Route path="/review/:documentId" element={<ReviewResults />} />
        <Route path="/subscription" element={<Subscription />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App; 