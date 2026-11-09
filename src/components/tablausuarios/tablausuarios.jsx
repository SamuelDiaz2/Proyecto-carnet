import React from 'react';

// Fíjate que aquí también debes recibir la nueva función 'onGenerarCobro'
export function UserTable({ usuarios, onEliminarClick, confirmarEliminar, ejecutarEliminacion, setConfirmarEliminar, onGenerarCobro }) {
    return (
        <div className="table-section-container">
            {confirmarEliminar.visible && (
                <div className="confirm-delete-box">
                    <p>¿Confirmar eliminación de <strong>{confirmarEliminar.nombre}</strong>?</p>
                    <div className="confirm-actions">
                        <button onClick={ejecutarEliminacion} className="btn-yes">Sí, eliminar</button>
                        <button onClick={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })} className="btn-no">Cancelar</button>
                    </div>
                </div>
            )}

            <div className="table-vertical-scroll">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Documento</th>
                            <th>Nombre</th>
                            <th>Profesión</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map((usuario) => (
                            <tr key={usuario.id}>
                                <td className="table-doc" data-label="Documento">{usuario.id}</td>
                                <td className="table-name" data-label="Nombre">{usuario.nombre}</td>
                                <td className="table-profession" data-label="Profesión">
                                    <span className="profession-tag">{usuario.profesion || "No especificada"}</span>
                                </td>
                                <td className="acciones-celda" data-label="Acciones">
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                            className="btn-borrar-usuario"
                                            // Corrección: onEliminarClick directamente, sin 'props.'
                                            onClick={() => onEliminarClick(usuario.id, usuario.nombre)}
                                        >
                                            Borrar
                                        </button>

                                        <button
                                            className="btn-generar-pdf"
                                            // Corrección: onGenerarCobro directamente, sin 'props.'
                                            onClick={() => onGenerarCobro(usuario)}
                                        >
                                            📄 Cobro
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}