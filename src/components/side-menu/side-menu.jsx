import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import UseAnimations from 'react-useanimations';
import bookmark from 'react-useanimations/lib/bookmark';
import calendar from 'react-useanimations/lib/calendar';
import activity from 'react-useanimations/lib/activity';
import settings from 'react-useanimations/lib/settings';
import arrowLeftCircle from 'react-useanimations/lib/arrowLeftCircle';
import './side-menu.css';

const SideMenu = () => {
    const navigate = useNavigate();

    const { admin, nombreUsuario, profesionUsuario } = useMemo(() => {
        const cedula = localStorage.getItem('usuarioCedula');
        return {
            admin: cedula === '1028862517' || cedula === '1073519428',
            nombreUsuario: localStorage.getItem('usuarioNombre') || 'Profesional',
            profesionUsuario: localStorage.getItem('usuarioProfesion') || 'Panel Profesional',
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('sesion');
        window.dispatchEvent(new Event('app-session-change'));
        navigate('/login', { replace: true });
    };

    const navItems = [
        { to: '/carnet', label: 'Carnet', icon: bookmark },
        { to: '/citas', label: 'Pacientes', icon: calendar },
        { to: '/paciente', label: 'Mis Pacientes', icon: activity },
        ...(admin ? [{ to: '/opciones', label: 'Panel de control', icon: settings }] : []),
    ];

    return (
        <aside className="sidebar-container">
            {/* Encabezado del Menú Lateral */}
            <div className="sidebar-brand">
                <div className="sidebar-logo-row">
                    <span className="sidebar-dot" />
                    <h2 className="sidebar-brand-title">REHABILITAR-C</h2>
                </div>
                <span className="sidebar-brand-tag">{profesionUsuario}</span>

                <div className="sidebar-user-card">
                    <div className="sidebar-avatar">
                        {nombreUsuario.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <strong className="sidebar-user-name">{nombreUsuario}</strong>
                        <small className="sidebar-user-role">
                            {admin ? 'Administrador' : 'Especialista'}
                        </small>
                    </div>
                </div>
            </div>

            {/* Enlaces de Navegación */}
            <nav className="sidebar-nav">
                <span className="sidebar-section-label">MENÚ PRINCIPAL</span>

                {navItems.map(({ to, label, icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            isActive ? 'nav-item active' : 'nav-item'
                        }
                    >
                        {({ isActive }) => (
                            <UseAnimations
                                animation={icon}
                                size={22}
                                strokeColor="currentColor"
                                autoplay={isActive}
                                render={(eventProps, animationProps) => (
                                    <div {...eventProps} className="nav-item-inner">
                                        <span className="nav-icon">
                                            <div {...animationProps} />
                                        </span>
                                        <span className="nav-text">{label}</span>
                                        {isActive && <span className="nav-active-pill" />}
                                    </div>
                                )}
                            />
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Botón Inferior de Cerrar Sesión */}
            <div className="sidebar-footer">
                <UseAnimations
                    animation={arrowLeftCircle}
                    size={22}
                    strokeColor="currentColor"
                    render={(eventProps, animationProps) => (
                        <button
                            {...eventProps}
                            type="button"
                            className="btn-logout"
                            onClick={(e) => {
                                eventProps.onClick?.(e);
                                handleLogout();
                            }}
                        >
                            <span className="logout-icon">
                                <div {...animationProps} />
                            </span>
                            <span className="logout-text">Cerrar Sesión</span>
                        </button>
                    )}
                />
            </div>
        </aside>
    );
};

export default SideMenu;