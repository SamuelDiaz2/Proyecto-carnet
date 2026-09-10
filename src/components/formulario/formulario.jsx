import React from 'react';

const PROFESIONES = [
    "Psicología",
    "Fonoaudiología",
    "Fisioterapia con terapia respiratoria",
    "Fisioterapia con terapia ocupacional",
    "Terapia ocupacional"
];

export function UserForm({ 
    cedula, setCedula, 
    nombre, setNombre, 
    pin, setPin,
    profesion, setProfesion,
    onFotoChange, onSubmit, mensaje 
}) {
    return (
        <form className="admin-form" onSubmit={onSubmit}>
            <div className="admin-form-group">
                <label>Documento de Identidad *</label>
                <input
                    type="text"
                    placeholder="Ej. 1234567890"
                    inputMode="numeric"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    required
                />
            </div>

            <div className="admin-form-group">
                <label>Nombre Completo *</label>
                <input
                    type="text"
                    placeholder="Ej. Pepito Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                />
            </div>

            <div className="admin-form-group">
                <label>PIN de Acceso (4-6 dígitos) *</label>
                <input
                    type="password"
                    maxLength={6}
                    placeholder="Ej. 1234"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                />
            </div>

            <div className="admin-form-group">
                <label>Profesión / Especialidad *</label>
                <select
                    value={profesion}
                    onChange={(e) => setProfesion(e.target.value)}
                    required
                    className="admin-select"
                >
                    <option value="">-- Seleccionar Profesión --</option>
                    {PROFESIONES.map((prof) => (
                        <option key={prof} value={prof}>
                            {prof}
                        </option>
                    ))}
                </select>
            </div>

            <div className="admin-form-group">
                <label>Foto del Profesional</label>
                <input
                    id="carnet-file"
                    type="file"
                    accept="image/*"
                    onChange={onFotoChange}
                />
            </div>

            {mensaje.texto && (
                <p className="form-message" style={{ color: mensaje.color }}>
                    {mensaje.texto}
                </p>
            )}

            <button type="submit" className="btn-admin-submit">Guardar Profesional</button>
        </form>
    );
}