export default function RegistroAtencion({
    estadoEvaluacionPaciente,
    setReintentarRegistro,
    handleAbrirEvaluacion,
    pacienteSeleccionado,
}) {
    return (
        <div className="registro-espontaneo-container">
            <h4 className="registro-espontaneo-title">
                Registrar Atención
            </h4>

            {estadoEvaluacionPaciente === null ? (
                <p className="verificando-text">
                    Verificando historial clínico...
                </p>
            ) : estadoEvaluacionPaciente === "error" ? (
                <div className="reasignacion-error">
                    <p>
                        No se pudo verificar el historial clínico.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setReintentarRegistro((prev) => prev + 1)
                        }
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <div className="botones-atencion-flex">
                    <button
                        type="button"
                        disabled={estadoEvaluacionPaciente === true}
                        onClick={() =>
                            handleAbrirEvaluacion(pacienteSeleccionado)
                        }
                        className={`btn-atencion ${estadoEvaluacionPaciente === true
                                ? "btn-atencion-disabled"
                                : "btn-evaluar"
                            }`}
                    >
                        Evaluación
                    </button>

                    <button
                        type="button"
                        disabled={estadoEvaluacionPaciente === false}
                        onClick={() =>
                            handleAbrirEvaluacion(pacienteSeleccionado)
                        }
                        className={`btn-atencion ${estadoEvaluacionPaciente === false
                                ? "btn-atencion-disabled"
                                : "btn-evolucionar"
                            }`}
                    >
                        Evolución
                    </button>
                </div>
            )}
        </div>
    );
}
