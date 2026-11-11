export default function PacientesEstados({
    loading,
    error,
    pacientes,
    filtroTab,
    onReintentar
}) {
    if (loading) {
        return (
            <div className="pacientes-state-box">
                <div className="spinner"></div>
                <p>Cargando pacientes y citas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pacientes-state-box error">
                <p>{error}</p>

                <button
                    onClick={onReintentar}
                    className="btn-reintentar"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (pacientes.length === 0) {
        return (
            <div className="pacientes-empty-box">
                <p>
                    {filtroTab === 'mis-pacientes'
                        ? 'No tienes pacientes asignados actualmente.'
                        : 'No se encontraron pacientes que coincidan con la búsqueda.'}
                </p>
            </div>
        );
    }

    return null;
}
