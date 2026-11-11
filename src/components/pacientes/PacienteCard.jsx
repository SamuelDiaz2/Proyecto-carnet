export default function PacienteCard({
    paciente,
    onClick
}) {
    return (
        <div
            className="paciente-card-item"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="paciente-card-header">

                <div className="paciente-avatar-initial">
                    {paciente.nombre?.charAt(0).toUpperCase() || '?'}
                </div>

                <div className="paciente-info-summary">
                    <h3>{paciente.nombre}</h3>

                    <p className="paciente-doc-text">
                        Doc: {paciente.identificacion}
                    </p>
                </div>

            </div>

            {paciente.telefono && (
                <p className="paciente-meta-item">
                    📞 <span>{paciente.telefono}</span>
                </p>
            )}

            {paciente.municipio && (
                <p className="paciente-meta-item">
                    📍
                    <span>
                        {paciente.municipio}
                        {paciente.barrio ? ` - ${paciente.barrio}` : ''}
                    </span>
                </p>
            )}

            <div className="paciente-stats-row">

                <span className="stat-badge stat-pending">
                    ⏳ {paciente.citasPendientes.length} restantes
                </span>

                <span className="stat-badge stat-completed">
                    ✓ {paciente.sesionesRealizadas} atendidas
                </span>

            </div>

            <button
                className="btn-ver-historial"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
            >
                Ver historial
            </button>
        </div>
    );
}
