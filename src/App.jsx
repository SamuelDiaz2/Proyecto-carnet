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

// Fallback de carga liviano
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
    <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #04b046', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

function App() {
  const [sesionActiva, setSesionActiva] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const offline = localStorage.getItem('offline');
    if (offline) {
      setSesionActiva(true);
    } else {
      setSesionActiva(false)
    }
    setCargando(false);
  }, []);

  if (cargando) {
    return null;
  }

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
              <Route path="/opciones" element={<Opciones />} />
              <Route path="/citas" element={<Citas />} />
              <Route path="/carnet" element={<CarnetDigital />} />
              <Route path="/profesional" element={<Profesional />} />
              <Route path="/paciente" element={<Paciente />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;