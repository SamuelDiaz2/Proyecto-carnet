import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './side-menu.css';

const SideMenu = () => {
    const navigate = useNavigate();

    const admin = useMemo(() => {
        const cedula = localStorage.getItem("usuarioCedula");
        return cedula === "1028862517" || cedula === "1073519428";
    }, []);

    // Función para limpiar el localStorage y salir de la aplicación
    const handleLogout = () => {
        localStorage.clear();
        navigate('/', { replace: true });
        window.location.reload();
    };

    return (
        <aside className="sidebar-container">
            {/* Encabezado del Menú Lateral */}
            <div className="sidebar-brand">
                <h2 className="sidebar-brand-title">REHABILITAR-C</h2>
                <span className="sidebar-brand-tag">Panel Profesional</span>
            </div>

            {/* Enlaces de Navegación */}
            <nav className="sidebar-nav">
                <NavLink
                    to="/carnet"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    <span className="nav-text">Mi Carnet</span>
                    <span className="nav-icon">🪪</span>
                </NavLink>

                <NavLink
                    to="/citas"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    <span className="nav-text">Pacientes Pendientes</span>
                    <span className="nav-icon">📗</span>
                </NavLink>

                <NavLink
                    to="/paciente"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    <span className="nav-text">Mis Pacientes</span>
                    <span className="nav-icon">👥</span>
                </NavLink>

                {admin && (
                    <NavLink
                        to="/opciones"
                        className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                    >
                        <span className="nav-text">Panel de control</span>
                        <span className="nav-icon">⚙️</span>
                    </NavLink>
                )}
            </nav>

            {/* Botón Inferior de Cerrar Sesión */}
            <div className="sidebar-footer">
                <button className="btn-logout" onClick={handleLogout}>
                    <span className="logout-icon">🚪</span>
                    <span className="logout-text">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default SideMenu;