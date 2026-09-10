import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import logoImg from '../../assets/logo.jpeg';
import './carnet.css';

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z'/></svg>";

const CarnetDigital = () => {
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [profesion, setProfesion] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const nombreLocal = localStorage.getItem("usuarioNombre");
    const cedulaLocal = localStorage.getItem("usuarioCedula");
    const fotoLocal = localStorage.getItem("usuarioFoto");
    const profesionLocal = localStorage.getItem("usuarioProfesion");

    if (cedulaLocal) {
      setNombre(nombreLocal || 'Usuario');
      setDocumento(cedulaLocal);
      setProfesion(profesionLocal || '');
      setFotoUrl(fotoLocal || DEFAULT_AVATAR);
    }
    setCargando(false);
  }, []);

  if (cargando) return null; 
  if (!documento) return <Navigate to="/" replace />;

  return (
    <div className="badge-container">
      
      {/* Botón hamburguesa */}
      <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
        {menuAbierto ? '✕' : '☰'}
      </button>

      {/* Envoltorio del menú lateral con su capa oscura */}
      <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
        <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
        <SideMenu />
      </div>

      {/* Tarjeta de carnet */}
      <div className="badge-card">
        <div className="badge-header-gradient">
          <h2 className="badge-company-name">REHABILITAR-C</h2>
        </div>

        <div className="badge-avatar-container">
          <img src={fotoUrl} alt={nombre} className="badge-avatar" />
        </div>

        <div className="badge-main-content">
          <h3 className="badge-user-name">{nombre}</h3>
          {profesion && <p className="badge-profession">{profesion}</p>}
          <p className="badge-label-document">DOCUMENTO DE IDENTIDAD</p>
          <p className="badge-document-number">{documento}</p>
        </div>

        <div className="badge-divider"></div>

        <div className="badge-footer-content">
          <div className="badge-logo-container">
            <img src={logoImg} alt="Logo Rehabilitar-C" className="badge-logo" />
          </div>
          <p className="badge-footer-text">Válido para acceso administrativo</p>
        </div>
      </div>

    </div>
  );
};

export default CarnetDigital;