import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import SideMenu from "../../components/side-menu/side-menu.jsx";
import './opciones.css';

function Opciones() {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <div className="opciones-container">
            {/* Botón hamburguesa */}
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
                {menuAbierto ? '✕' : '☰'}
            </button>

            {/* Menú lateral */}
            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="opciones-content">
                <h1 className="opciones-title">Panel de Registro</h1>
                <p className="opciones-subtitle">Selecciona la categoría a gestionar</p>

                <div className="opciones-grid">
                    <NavLink to="/profesional" className="btn-opcion">
                        <div className="icon-wrapper">
                            <svg className="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h2>Profesionales</h2>
                        <span className="opcion-desc">Registro y credenciales</span>
                    </NavLink>

                    <NavLink to="/paciente" className="btn-opcion">
                        <div className="icon-wrapper">
                            <svg className="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                                <path d="M12 11v6" />
                                <path d="M9 14h6" />
                            </svg>
                        </div>
                        <h2>Pacientes</h2>
                        <span className="opcion-desc">Gestión y atención</span>
                    </NavLink>
                </div>
            </div>
        </div>
    );
}

export default Opciones;