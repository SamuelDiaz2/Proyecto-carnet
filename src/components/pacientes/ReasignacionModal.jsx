
export default function ReasignacionModal({
    pacienteSeleccionado,
    registroPaciente,
    mostrarReasignacion,
    setMostrarReasignacion,
    profesionalesDestino = [],
    cargandoProfesionales,
    errorProfesionales,
    setReintentarProfesionales,
    profesionalDestino,
    setProfesionalDestino,
    reassignando,
    handleReasignarPaciente,
}) {
    if (!mostrarReasignacion) return null;

    return (
        <div
            className="reasignacion-overlay"
            onClick={(event) => {
                event.stopPropagation();
                setMostrarReasignacion(false);
            }}
        >
            <section
                className="reasignacion-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reasignacion-titulo"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="reasignacion-header">
                    <div>
                        <h2 id="reasignacion-titulo">
                            {registroPaciente.profesional
                                ? "Reasignar paciente"
                                : "Asignar profesional"}
                        </h2>

                        <p>{pacienteSeleccionado.nombre}</p>
                    </div>

                    <button
                        type="button"
                        className="reasignacion-cerrar"
                        aria-label="Cerrar"
                        onClick={() => setMostrarReasignacion(false)}
                    >
                        ✕
                    </button>
                </header>

                <div className="reasignacion-contenido">
                    <label htmlFor="profesional-destino">
                        Profesional de{" "}
                        {registroPaciente.servicio || "la misma especialidad"}
                    </label>

                    {cargandoProfesionales ? (
                        <p>Cargando profesionales...</p>
                    ) : errorProfesionales ? (
                        <div className="reasignacion-error">
                            <p>{errorProfesionales}</p>

                            <button
                                type="button"
                                onClick={() =>
                                    setReintentarProfesionales(
                                        (prev) => prev + 1
                                    )
                                }
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : profesionalesDestino.length === 0 ? (
                        <p>
                            No hay otros profesionales disponibles para esta
                            especialidad.
                        </p>
                    ) : (
                        <select
                            id="profesional-destino"
                            value={profesionalDestino}
                            onChange={(event) =>
                                setProfesionalDestino(event.target.value)
                            }
                        >
                            <option value="">
                                Selecciona un profesional...
                            </option>

                            {profesionalesDestino.map((profesional) => (
                                <option
                                    key={profesional.id}
                                    value={profesional.id}
                                >
                                    {profesional.nombre} — {profesional.profesion}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <footer className="reasignacion-acciones">
                    <button
                        type="button"
                        className="reasignacion-cancelar"
                        onClick={() => setMostrarReasignacion(false)}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="reasignacion-confirmar"
                        disabled={
                            !profesionalDestino ||
                            cargandoProfesionales ||
                            Boolean(errorProfesionales) ||
                            reassignando
                        }
                        onClick={handleReasignarPaciente}
                    >
                        {reassignando
                            ? "Guardando..."
                            : registroPaciente.profesional
                                ? "Reasignar"
                                : "Asignar"}
                    </button>
                </footer>
            </section>
        </div>
    );
}
