
export default function PacientesFiltros({
    busqueda,
    setBusqueda,
    filtroTab,
    setFiltroTab,
    esAdmin,
    pacientesAgrupados
}) {
    return (
        <div className="pacientes-controls">

            <div className="search-bar-wrapper">
                <span className="search-icon">🔍</span>

                <input
                    type="text"
                    placeholder="Nombre o documento..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="search-input"
                />

                {busqueda && (
                    <button
                        onClick={() => setBusqueda('')}
                        className="clear-search-btn"
                    >
                        ✕
                    </button>
                )}
            </div>

            {esAdmin && (
                <div className="tab-filters">

                    <button
                        className={`tab-btn ${filtroTab === 'mis-pacientes' ? 'active' : ''
                            }`}
                        onClick={() => setFiltroTab('mis-pacientes')}
                    >
                        Mis Pacientes (
                        {
                            pacientesAgrupados.filter(
                                (p) => p.asignadoAMi
                            ).length
                        }
                        )
                    </button>

                    <button
                        className={`tab-btn ${filtroTab === 'todos' ? 'active' : ''
                            }`}
                        onClick={() => setFiltroTab('todos')}
                    >
                        Todos los Pacientes ({pacientesAgrupados.length})
                    </button>

                </div>
            )}

        </div>
    );
}
