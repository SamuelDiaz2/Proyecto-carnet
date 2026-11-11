export default function CitasCompletadas({ citas }) {
    return (
        <div className="modal-section">

            <h3 className="section-title section-completed-title">
                ✅ Citas Agendadas Completadas ({citas.length})
            </h3>

            {citas.length === 0 ? (
                <p className="empty-subtext">
                    No hay citas agendadas que hayan sido completadas aún.
                </p>
            ) : (
                <div className="citas-sublist">

                    {citas.map((cita) => (
                        <div
                            key={cita.id}
                            className="cita-detail-item completed-item"
                        >
                            <div className="cita-detail-header">

                                <span className="cita-service-name">
                                    {cita.servicio || 'Consulta Médica'}
                                </span>

                                <span className="status-pill completada">
                                    ✓ Atendida
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
                                    {cita.profesional || 'Profesional Asignado'}
                                </p>

                            </div>

                        </div>
                    ))}

                </div>
            )}

        </div>
    );
}
