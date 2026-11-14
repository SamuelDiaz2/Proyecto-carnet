import { useState } from 'react';
import HistorialRegistros from './HistorialRegistros';
import RegistroAtencion from "./RegistroAtencion";
import ReasignacionModal from "./ReasignacionModal";
import CitasPendientes from "./CitasPendientes";
import CitasCompletadas from "./CitasCompletadas";

export default function PacienteModal({
    pacienteSeleccionado,
    setPacienteSeleccionado,
    esAdmin,
    registroPaciente,
    setReintentarRegistro,
    setMostrarReasignacion,
    setProfesionalDestino,
    estadoEvaluacionPaciente,
    handleAbrirEvaluacion,
    handleCancelarCita,
    actualizandoCitaId,
    mostrarReasignacion,
    profesionalesDestino,
    cargandoProfesionales,
    errorProfesionales,
    setReintentarProfesionales,
    profesionalDestino,
    reassignando,
    handleReasignarPaciente,
}) {
    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    if (!pacienteSeleccionado) return null;

    return (
        <div
            className="modal-overlay"
            onClick={() => setPacienteSeleccionado(null)}
        >
            <div
                className="modal-content"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="modal-header">
                    <div className="modal-title-box">
                        <h2>{pacienteSeleccionado.nombre}</h2>

                        <p>
                            Identificación: {pacienteSeleccionado.identificacion}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-close-modal"
                        onClick={() => setPacienteSeleccionado(null)}
                    >
                        ✕
                    </button>
                </header>

                <div className="modal-body-scroll">
                    <div className="modal-patient-info">

                        {pacienteSeleccionado.telefono && (
                            <p>
                                <strong>Teléfono:</strong>{" "}
                                {pacienteSeleccionado.telefono}
                            </p>
                        )}

                        {pacienteSeleccionado.direccion && (
                            <p>
                                <strong>Dirección:</strong>{" "}
                                {pacienteSeleccionado.direccion}
                            </p>
                        )}

                        {pacienteSeleccionado.municipio && (
                            <p>
                                <strong>Ciudad/Municipio:</strong>{" "}
                                {pacienteSeleccionado.municipio}
                            </p>
                        )}

                        {esAdmin && (
                            <div className="reasignacion-paciente">
                                <div>
                                    <strong>Profesional asignado:</strong>{" "}

                                    {registroPaciente.cargando
                                        ? "Consultando..."
                                        : registroPaciente.profesional || "Sin asignar"}

                                    {registroPaciente.error && (
                                        <div className="reasignacion-error">
                                            <p>{registroPaciente.error}</p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReintentarRegistro(
                                                        (prev) => prev + 1
                                                    )
                                                }
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="btn-reasignar-paciente"
                                    disabled={
                                        registroPaciente.cargando ||
                                        Boolean(registroPaciente.error) ||
                                        !registroPaciente.pacienteId
                                    }
                                    onClick={() => {
                                        setProfesionalDestino("");
                                        setMostrarReasignacion(true);
                                    }}
                                >
                                    {registroPaciente.profesional
                                        ? "Reasignar"
                                        : "Asignar"}
                                </button>
                            </div>
                        )}


                        {esAdmin && (
                            <button
                                type="button"
                                className="btn-historial-clinico"
                                onClick={() => setMostrarHistorial(true)}
                            >
                                <span>📋</span>
                                <span>Historial clínico</span>
                            </button>
                        )}

                        <div className="sesiones-counter-box">
                            <span>
                                <strong>Sesiones Atendidas:</strong>{" "}
                                {pacienteSeleccionado.sesionesRealizadas || 0}
                            </span>
                        </div>

                        <RegistroAtencion
                            estadoEvaluacionPaciente={estadoEvaluacionPaciente}
                            setReintentarRegistro={setReintentarRegistro}
                            handleAbrirEvaluacion={handleAbrirEvaluacion}
                            pacienteSeleccionado={pacienteSeleccionado}
                        />
                    </div>

                    <CitasPendientes
                        citas={pacienteSeleccionado.citasPendientes || []}
                        actualizandoCitaId={actualizandoCitaId}
                        onCancelarCita={handleCancelarCita}
                    />

                    <CitasCompletadas
                        citas={pacienteSeleccionado.citasAtendidas || []}
                    />
                </div>

                <footer className="modal-footer">
                    <button
                        type="button"
                        className="btn-close-modal-bottom"
                        onClick={() => setPacienteSeleccionado(null)}
                    >
                        Cerrar
                    </button>
                </footer>
            </div>



            {esAdmin && (
                <ReasignacionModal
                    pacienteSeleccionado={pacienteSeleccionado}
                    registroPaciente={registroPaciente}
                    mostrarReasignacion={mostrarReasignacion}
                    setMostrarReasignacion={setMostrarReasignacion}
                    profesionalesDestino={profesionalesDestino}
                    cargandoProfesionales={cargandoProfesionales}
                    errorProfesionales={errorProfesionales}
                    setReintentarProfesionales={setReintentarProfesionales}
                    profesionalDestino={profesionalDestino}
                    setProfesionalDestino={setProfesionalDestino}
                    reassignando={reassignando}
                    handleReasignarPaciente={handleReasignarPaciente}
                />
            )}

            {esAdmin && mostrarHistorial && (
                <HistorialRegistros
                    pacienteId={registroPaciente.pacienteId}
                    paciente={pacienteSeleccionado}
                    onCerrar={() => setMostrarHistorial(false)}
                />
            )}
        </div>
    );
}
