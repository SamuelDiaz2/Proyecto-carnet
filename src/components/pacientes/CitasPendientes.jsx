export default function CitasPendientes({
    citas,
    actualizandoCitaId,
    onCancelarCita
}) {
    return (
        <div className="modal-section">

            <h3 className="section-title section-pending-title">
                ⏳ Citas Pendientes Agendadas ({citas.length})
            </h3>

            {citas.length === 0 ? (
                <p className="empty-subtext">
                    No hay citas pendientes agendadas en el sistema para este paciente.
                </p>
            ) : (
                <div className="citas-sublist">

                    {citas.map((cita) => (
                        <div
                            key={cita.id}
                            className="cita-detail-item pending-item"
                        >
                            <div className="cita-detail-header">

                                <span className="cita-service-name">
                                    {cita.servicio || 'Consulta Médica'}
                                </span>

                                <span className={`status-pill ${cita.estado}`}>
                                    {cita.estado === 'confirmada'
                                        ? 'Asignada'
                                        : 'Pendiente'}
                                </span>

                            </div>

                            <div className="cita-detail-grid">

                                <p>
                                    📅 <strong>Fecha:</strong>{' '}
                                    {cita.fecha || 'Sin fecha'}
                                </p>

                                {cita.hora && (
                                    <p>
                                        ⏰ <strong>Hora:</strong> {cita.hora}
                                    </p>
                                )}

                                <p>
                                    🧑‍⚕️ <strong>Profesional:</strong>{' '}
                                    {cita.profesional || 'Sin asignar'}
                                </p>

                            </div>

                            <div className="cita-actions-row">

                                <button
                                    disabled={actualizandoCitaId === cita.id}
                                    onClick={() => onCancelarCita(cita.id)}
                                    className="btn-cancelar"
                                >
                                    {actualizandoCitaId === cita.id
                                        ? 'Cancelando...'
                                        : 'Cancelar Cita'}
                                </button>

                            </div>

                        </div>
                    ))}

                </div>
            )}

        </div>
    );
}
