import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Code Splitting / Carga Perezosa para optimizar el bundle del APK
const CarnetDigital = lazy(() => import('./pages/carnet/carnet.jsx'));
const Login = lazy(() => import('./pages/login/login.jsx'));
const Opciones = lazy(() => import('./pages/opciones/opciones.jsx'));
const Profesional = lazy(() => import('./pages/profesional/profesional.jsx'));
const Citas = lazy(() => import('./pages/citas/citas.jsx'));
const Paciente = lazy(() => import('./pages/paciente/paciente.jsx'));
const Registro = lazy(() => import('./pages/registro/registro.jsx'));

// Fallback de carga liviano
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
    <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #04b046', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const ProtectedRoute = ({ sessionActive, children }) => (
  sessionActive ? children : <Navigate to="/login" replace />
);

function App() {
  const [sesionActiva, setSesionActiva] = useState(() => localStorage.getItem('sesion') === 'true');

  useEffect(() => {
    const actualizarSesion = () => {
      setSesionActiva(localStorage.getItem('sesion') === 'true');
    };

    window.addEventListener('app-session-change', actualizarSesion);
    return () => window.removeEventListener('app-session-change', actualizarSesion);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <main className="main-content-area">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route
                path="/"
                element={sesionActiva ? <Navigate to="/carnet" replace /> : <Login />}
              />
              <Route
                path="/login"
                element={sesionActiva ? <Navigate to="/carnet" replace /> : <Login />}
              />
              <Route path="/opciones" element={<ProtectedRoute sessionActive={sesionActiva}><Opciones /></ProtectedRoute>} />
              <Route path="/citas" element={<ProtectedRoute sessionActive={sesionActiva}><Citas /></ProtectedRoute>} />
              <Route path="/carnet" element={<ProtectedRoute sessionActive={sesionActiva}><CarnetDigital /></ProtectedRoute>} />
              <Route path="/profesional" element={<Profesional />} />
              <Route path="/paciente" element={<ProtectedRoute sessionActive={sesionActiva}><Paciente /></ProtectedRoute>} />
              <Route path="/registro" element={<ProtectedRoute sessionActive={sesionActiva}><Registro /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;