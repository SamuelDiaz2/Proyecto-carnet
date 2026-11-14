import React from 'react';
import UseAnimations from 'react-useanimations';
import trash2 from 'react-useanimations/lib/trash2';
import download from 'react-useanimations/lib/download';

export function UserTable({
    usuarios,
    onEliminarClick,
    confirmarEliminar,
    ejecutarEliminacion,
    setConfirmarEliminar,
    onGenerarCobro
}) {
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
                                        {/* 1. Se anima al tocar CUALQUIER parte del botón (ideal para móvil) */}
                                        <UseAnimations
                                            animation={trash2}
                                            size={20}
                                            strokeColor="currentColor"
                                            render={(eventProps, animationProps) => (
                                                <button
                                                    {...eventProps}
                                                    className="btn-table-delete"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    onClick={(e) => {
                                                        eventProps.onClick?.(e);
                                                        onEliminarClick(usuario.id, usuario.nombre);
                                                    }}
                                                >
                                                    <div {...animationProps} />
                                                    <span>Borrar</span>
                                                </button>
                                            )}
                                        />

                                        <UseAnimations
                                            animation={download}
                                            size={20}
                                            strokeColor="currentColor"
                                            render={(eventProps, animationProps) => (
                                                <button
                                                    {...eventProps}
                                                    className="btn-generar-pdf"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    onClick={(e) => {
                                                        eventProps.onClick?.(e);
                                                        onGenerarCobro(usuario.id);
                                                    }}
                                                >
                                                    <div {...animationProps} />
                                                    <span>Cobro</span>
                                                </button>
                                            )}
                                        />
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