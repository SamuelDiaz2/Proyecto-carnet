import { useEffect, useMemo, useState } from "react";

import SideMenu from "../../components/side-menu/side-menu.jsx";
import FormularioEvolucion from "../../components/FormularioEvolucion/FormularioEvolucion.jsx";
import PacienteCard from "../../components/pacientes/PacienteCard";
import PacienteModal from "../../components/pacientes/PacienteModal";
import usePacientes from "../../hooks/usePacientes";
import { cancelarCita, actualizarCitasPendientes } from "../../services/citasService";
import { obtenerPacientePorIdentificacion, actualizarProfesionalPaciente } from "../../services/pacientesService";
import { obtenerProfesionales } from "../../services/profesionalesService";
import { contarEvolucionesPaciente } from "../../services/evolucionesService";
import { coincideProfesionCita } from "../../utils/filterServices.js";

// Ajusta esta ruta si paciente.css permanece en otra carpeta.
import "./paciente.css";

function Pacientes() {
    const {
        citas,
        setCitas,
        loading,
        error,
        busqueda,
        setBusqueda,
        filtroTab,
        setFiltroTab,
        pacienteSeleccionado,
        setPacienteSeleccionado,
        actualizandoCitaId,
        setActualizandoCitaId,
        miNombre,
        profesionUsuario,
        esAdmin,
        pacientesAgrupados,
        pacientesFiltrados,
        cargarCitas,
        setProfesionalesAsignados,
    } = usePacientes();

    const [menuAbierto, setMenuAbierto] = useState(false);

    const [citaAtendiendo, setCitaAtendiendo] = useState(null);

    const [estadoEvaluacionPaciente, setEstadoEvaluacionPaciente] =
        useState(null);

    const [registroPaciente, setRegistroPaciente] = useState({
        pacienteId: null,
        profesional: "",
        servicio: "",
        cargando: false,
        error: null,
    });

    const [profesionalesDisponibles, setProfesionalesDisponibles] =
        useState([]);

    const [cargandoProfesionales, setCargandoProfesionales] =
        useState(false);

    const [errorProfesionales, setErrorProfesionales] = useState(null);

    const [mostrarReasignacion, setMostrarReasignacion] =
        useState(false);

    const [profesionalDestino, setProfesionalDestino] = useState("");

    const [reassignando, setReassignando] = useState(false);

    const [reintentarProfesionales, setReintentarProfesionales] =
        useState(0);

    const [reintentarRegistro, setReintentarRegistro] = useState(0);


    // Reinicia el modal de reasignación cuando se cambia de paciente.
    useEffect(() => {
        setMostrarReasignacion(false);
        setProfesionalDestino("");
    }, [pacienteSeleccionado?.id]);

    // Carga los profesionales disponibles para los administradores.
    useEffect(() => {
        if (!esAdmin) return;

        let activo = true;

        const cargar = async () => {
            try {
                setCargandoProfesionales(true);
                setErrorProfesionales(null);

                const lista = await obtenerProfesionales();

                if (activo) {
                    setProfesionalesDisponibles(lista);
                }
            } catch (err) {
                console.error("Error al cargar profesionales:", err);

                if (activo) {
                    setErrorProfesionales(
                        "No se pudieron cargar los profesionales. Intenta de nuevo."
                    );
                }
            } finally {
                if (activo) {
                    setCargandoProfesionales(false);
                }
            }
        };

        cargar();

        return () => {
            activo = false;
        };
    }, [esAdmin, reintentarProfesionales]);

    // Consulta el registro del paciente y verifica si tiene evoluciones.
    useEffect(() => {
        let activo = true;

        const verificarRegistro = async () => {
            if (!pacienteSeleccionado) {
                setEstadoEvaluacionPaciente(null);

                setRegistroPaciente({
                    pacienteId: null,
                    profesional: "",
                    servicio: "",
                    cargando: false,
                    error: null,
                });

                return;
            }

            setEstadoEvaluacionPaciente(null);

            setRegistroPaciente({
                pacienteId: null,
                profesional: "",
                servicio: "",
                cargando: true,
                error: null,
            });

            try {
                const registro = await obtenerPacientePorIdentificacion(
                    pacienteSeleccionado.identificacion
                );

                if (!activo) return;

                setRegistroPaciente({
                    pacienteId: registro.id,
                    profesional: registro.profesional || "",
                    servicio:
                        registro.servicio_principal ||
                        pacienteSeleccionado.citas.find((cita) => cita.servicio)
                            ?.servicio ||
                        "",
                    cargando: false,
                    error: null,
                });

                const cantidad = await contarEvolucionesPaciente(registro.id);

                if (activo) {
                    setEstadoEvaluacionPaciente(cantidad > 0);
                }
            } catch (err) {
                console.error("Error verificando el registro clínico:", err);

                if (activo) {
                    setEstadoEvaluacionPaciente("error");

                    setRegistroPaciente((prev) => ({
                        ...prev,
                        cargando: false,
                        error:
                            err.message ||
                            "No se pudo consultar el registro del paciente.",
                    }));
                }
            }
        };

        verificarRegistro();

        return () => {
            activo = false;
        };
    }, [pacienteSeleccionado, reintentarRegistro]);

    // Profesionales que pertenecen a la misma especialidad.
    const profesionalesDestino = useMemo(() => {
        if (!registroPaciente.servicio) return [];

        const asignadoActual = registroPaciente.profesional
            .trim()
            .toLowerCase();

        return profesionalesDisponibles
            .filter(
                (profesional) =>
                    profesional.nombre &&
                    profesional.profesion &&
                    profesional.nombre.trim().toLowerCase() !== asignadoActual &&
                    coincideProfesionCita(
                        { servicio: registroPaciente.servicio },
                        profesional.profesion
                    )
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [profesionalesDisponibles, registroPaciente]);

    // Cancelar una cita.
    const handleCancelarCita = async (citaId) => {
        if (
            !window.confirm(
                "¿Estás seguro de que deseas cancelar esta cita médica?"
            )
        ) {
            return;
        }

        try {
            setActualizandoCitaId(citaId);

            await cancelarCita(citaId);

            setCitas((prev) =>
                prev.map((cita) =>
                    cita.id === citaId
                        ? { ...cita, estado: "cancelada" }
                        : cita
                )
            );

            setPacienteSeleccionado((prev) => {
                if (!prev) return null;

                const nuevasCitas = prev.citas.map((cita) =>
                    cita.id === citaId
                        ? { ...cita, estado: "cancelada" }
                        : cita
                );

                return {
                    ...prev,
                    citas: nuevasCitas,
                    citasPendientes: nuevasCitas.filter(
                        (cita) =>
                            cita.estado === "pendiente" ||
                            cita.estado === "confirmada"
                    ),
                    citasAtendidas: nuevasCitas.filter(
                        (cita) => cita.estado === "completada"
                    ),
                };
            });

            alert("¡Cita cancelada con éxito!");
        } catch (err) {
            console.error("Error al cancelar la cita:", err);
            alert(`Error al cancelar: ${err.message}`);
        } finally {
            setActualizandoCitaId(null);
        }
    };

    // Abrir el formulario de evaluación o evolución.
    const handleAbrirEvaluacion = async (paciente, cita = null) => {
        try {
            if (cita) {
                setActualizandoCitaId(cita.id);
            }

            const documentoBuscado = String(
                paciente.identificacion || cita?.identificacion || ""
            ).trim();

            const registro = await obtenerPacientePorIdentificacion(
                documentoBuscado
            );

            setCitaAtendiendo({
                citaId: cita ? cita.id : null,
                pacienteId: registro.id,
                servicio: cita ? cita.servicio : profesionUsuario,
            });
        } catch (err) {
            console.error("Error al verificar el paciente:", err);

            alert(
                `No se encontró el registro del paciente: ${err.message || "Error de conexión"
                }`
            );
        } finally {
            if (cita) {
                setActualizandoCitaId(null);
            }
        }
    };

    // Reasignar paciente.
    const handleReasignarPaciente = async () => {
        if (
            !esAdmin ||
            !registroPaciente.pacienteId ||
            !pacienteSeleccionado ||
            reassignando
        ) {
            return;
        }

        const destino = profesionalesDestino.find(
            (profesional) => profesional.id === profesionalDestino
        );

        if (!destino) {
            alert("Selecciona un profesional de la misma especialidad.");
            return;
        }

        try {
            setReassignando(true);

            await actualizarProfesionalPaciente(
                registroPaciente.pacienteId,
                registroPaciente.profesional || null,
                destino.nombre
            );

            const documento = String(
                pacienteSeleccionado.identificacion || ""
            ).trim();

            try {
                await actualizarCitasPendientes(
                    documento,
                    destino.nombre
                );
            } catch (errorCitas) {
                await cargarCitas();

                throw new Error(
                    "El profesional del paciente se actualizó, pero no se pudieron actualizar sus citas pendientes. Recarga e inténtalo de nuevo."
                );
            }

            setProfesionalesAsignados((prev) => ({
                ...prev,
                [documento]: destino.nombre,
            }));

            setCitas((prev) =>
                prev.map((cita) =>
                    String(cita.identificacion || "").trim() === documento &&
                        (cita.estado === "pendiente" ||
                            cita.estado === "confirmada")
                        ? { ...cita, profesional: destino.nombre }
                        : cita
                )
            );

            setRegistroPaciente((prev) => ({
                ...prev,
                profesional: destino.nombre,
            }));

            setPacienteSeleccionado((prev) => {
                if (!prev) return null;

                const nuevasCitas = prev.citas.map((cita) =>
                    cita.estado === "pendiente" ||
                        cita.estado === "confirmada"
                        ? { ...cita, profesional: destino.nombre }
                        : cita
                );

                return {
                    ...prev,
                    profesional: destino.nombre,
                    citas: nuevasCitas,
                    citasPendientes: nuevasCitas.filter(
                        (cita) =>
                            cita.estado === "pendiente" ||
                            cita.estado === "confirmada"
                    ),
                };
            });

            setMostrarReasignacion(false);
            setProfesionalDestino("");

            alert(`Paciente reasignado a ${destino.nombre}.`);
        } catch (err) {
            console.error("Error al reasignar paciente:", err);
            alert(`No se pudo completar la reasignación: ${err.message}`);
        } finally {
            setReassignando(false);
        }
    };

    return (
        <div className="pacientes-page-container">
            <button
                className="hamburger-btn"
                onClick={() => setMenuAbierto(!menuAbierto)}
            >
                {menuAbierto ? "✕" : "☰"}
            </button>

            <div
                className={`sidebar-wrapper ${menuAbierto ? "abierto" : ""
                    }`}
            >
                <div
                    className="sidebar-overlay"
                    onClick={() => setMenuAbierto(false)}
                />

                <SideMenu />
            </div>

            <div className="pacientes-main-layout">
                <header className="pacientes-header">
                    <h1>Pacientes</h1>
                    <p>
                        Registro de pacientes, citas pendientes y atendidas
                    </p>
                </header>

                <div className="pacientes-controls">
                    <div className="search-bar-wrapper">
                        <span className="search-icon">🔍</span>

                        <input
                            type="text"
                            placeholder="Nombre o documento..."
                            value={busqueda}
                            onChange={(event) =>
                                setBusqueda(event.target.value)
                            }
                            className="search-input"
                        />

                        {busqueda && (
                            <button
                                onClick={() => setBusqueda("")}
                                className="clear-search-btn"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {esAdmin && (
                        <div className="tab-filters">
                            <button
                                className={`tab-btn ${filtroTab === "mis-pacientes" ? "active" : ""
                                    }`}
                                onClick={() => setFiltroTab("mis-pacientes")}
                            >
                                Mis Pacientes (
                                {
                                    pacientesAgrupados.filter(
                                        (paciente) => paciente.asignadoAMi
                                    ).length
                                }
                                )
                            </button>

                            <button
                                className={`tab-btn ${filtroTab === "todos" ? "active" : ""
                                    }`}
                                onClick={() => setFiltroTab("todos")}
                            >
                                Todos los Pacientes ({pacientesAgrupados.length})
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="pacientes-state-box">
                        <div className="spinner" />
                        <p>Cargando pacientes...</p>
                    </div>
                ) : error ? (
                    <div className="pacientes-state-box">
                        <p>{error}</p>
                        <button
                            className="btn-reintentar"
                            onClick={cargarCitas}
                        >
                            Reintentar
                        </button>
                    </div>
                ) : pacientesFiltrados.length === 0 ? (
                    <div className="pacientes-empty-box">
                        <p>No se encontraron pacientes.</p>
                    </div>
                ) : (
                    <div className="pacientes-grid">
                        {pacientesFiltrados.map((paciente) => (
                            <PacienteCard
                                key={paciente.id}
                                paciente={paciente}
                                onClick={() => setPacienteSeleccionado(paciente)}
                            />
                        ))}
                    </div>
                )}

                <PacienteModal
                    pacienteSeleccionado={pacienteSeleccionado}
                    setPacienteSeleccionado={setPacienteSeleccionado}
                    esAdmin={esAdmin}
                    registroPaciente={registroPaciente}
                    setReintentarRegistro={setReintentarRegistro}
                    setMostrarReasignacion={setMostrarReasignacion}
                    setProfesionalDestino={setProfesionalDestino}
                    estadoEvaluacionPaciente={estadoEvaluacionPaciente}
                    handleAbrirEvaluacion={handleAbrirEvaluacion}
                    handleCancelarCita={handleCancelarCita}
                    actualizandoCitaId={actualizandoCitaId}
                    mostrarReasignacion={mostrarReasignacion}
                    profesionalesDestino={profesionalesDestino}
                    cargandoProfesionales={cargandoProfesionales}
                    errorProfesionales={errorProfesionales}
                    setReintentarProfesionales={setReintentarProfesionales}
                    profesionalDestino={profesionalDestino}
                    reassignando={reassignando}
                    handleReasignarPaciente={handleReasignarPaciente}
                />

                {citaAtendiendo && (
                    <FormularioEvolucion
                        citaId={citaAtendiendo.citaId}
                        pacienteId={citaAtendiendo.pacienteId}
                        profesion={citaAtendiendo.servicio}
                        onCerrar={() => setCitaAtendiendo(null)}
                        onGuardadoExitoso={() => {
                            setCitaAtendiendo(null);
                            setPacienteSeleccionado(null);
                            cargarCitas();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default Pacientes;
