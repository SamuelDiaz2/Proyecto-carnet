import React from 'react';
import logoImg from '../../assets/logo.jpeg';

// Imagen por defecto del avatar en SVG Base64
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z'/></svg>";

export function BadgePreview({ nombre, cedula, profesion, fotoBase64 }) {
    return (
        <div className="exclusive-badge-card">
            <div className="exclusive-badge-gradient">
                <h2 className="exclusive-company-title">REHABILITAR-C</h2>
            </div>

            <div className="exclusive-avatar-frame">
                <img
                    src={fotoBase64 || DEFAULT_AVATAR}
                    alt="Avatar"
                    className="exclusive-avatar-img"
                />
            </div>

            <div className="exclusive-badge-details">
                <h3 className="exclusive-user-fullname">{nombre || "Nombre Completo"}</h3>
                {profesion && <p className="exclusive-user-profession">{profesion}</p>}
                <p className="exclusive-doc-label">DOCUMENTO DE IDENTIDAD</p>
                <p className="exclusive-doc-value">{cedula || "0000000000"}</p>
            </div>

            <div className="exclusive-badge-footer">
                <img src={logoImg} alt="Logo" className="exclusive-footer-logo" />
                <p className="exclusive-footer-text">Válido para acceso administrativo</p>
            </div>
        </div>
    );
}