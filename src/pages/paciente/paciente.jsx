import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita } from '../../utils/filterServices.js';
import FormularioEvolucion from '../../components/FormularioEvolucion/FormularioEvolucion.jsx';
import './paciente.css';

function Pacientes() {
    const [citas, setCitas] = useState([]);
    const [conteoEvoluciones, setConteoEvoluciones] = useState({}); // Nuevo estado para llevar el conteo real
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('mis-pacientes');
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [actualizandoCitaId, setActualizandoCitaId] = useState(null);

    const [citaAtendiendo, setCitaAtendiendo] = useState(null);
    const [estadoEvaluacionPaciente, setEstadoEvaluacionPaciente] = useState(null);

    const miNombre = localStorage.getItem("usuarioNombre") || "Profesional Asignado";
    const profesionUsuario = localStorage.getItem("usuarioProfesion") || "";
    const cedulaUsuario = localStorage.getItem("usuarioCedula") || "";
    const esAdmin = cedulaUsuario === "1028862517" || cedulaUsuario === "1073519428";

    useEffect(() => {
        cargarCitas();
    }, []);

    useEffect(() => {
        const verificarEvaluacionPrevia = async () => {
            if (!pacienteSeleccionado) {
                setEstadoEvaluacionPaciente(null);
                return;
            }
            try {
                const documentoBuscado = String(pacienteSeleccionado.identificacion || '').trim();
                const { data: pacienteDb, error: errPac } = await supabase
                    .from('pacientes')
                    .select('id')
                    .eq('numero_identificacion', documentoBuscado)
                    .limit(1);

                if (errPac || !pacienteDb || pacienteDb.length === 0) {
                    setEstadoEvaluacionPaciente(false);
                    return;
                }

                const { count, error: errEvo } = await supabase
                    .from('evoluciones_atencion')
                    .select('*', { count: 'exact', head: true })
                    .eq('paciente_id', pacienteDb[0].id);

                if (!errEvo && count > 0) {
                    setEstadoEvaluacionPaciente(true);
                } else {
                    setEstadoEvaluacionPaciente(false);
                }
            } catch (error) {
                console.error("Error verificando evaluación:", error);
                setEstadoEvaluacionPaciente(false);
            }
        };

        verificarEvaluacionPrevia();
    }, [pacienteSeleccionado]);

    // MODIFICADO: Ahora extrae el conteo real de evoluciones hechas a los pacientes
    const cargarCitas = async () => {
        try {
            setLoading(true);
            setError(null);

            // Hacemos las peticiones en paralelo para mayor rapidez
            const [citasRes, pacientesRes, evolucionesRes] = await Promise.all([
                supabase.from('citas').select('*').order('fecha', { ascending: true }),
                supabase.from('pacientes').select('id, numero_identificacion'),
                supabase.from('evoluciones_atencion').select('paciente_id')
            ]);

            if (citasRes.error) throw citasRes.error;

            // Mapeamos cuantas evoluciones reales tiene cada paciente por su número de identificación
            const mapaEvo = {};
            if (!pacientesRes.error && !evolucionesRes.error && pacientesRes.data && evolucionesRes.data) {
                pacientesRes.data.forEach(p => {
                    if (p.numero_identificacion) {
                        const count = evolucionesRes.data.filter(e => e.paciente_id === p.id).length;
                        mapaEvo[p.numero_identificacion.trim()] = count;
                    }
                });
            }

            setConteoEvoluciones(mapaEvo);
            setCitas(citasRes.data || []);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setError('No se pudieron cargar los pacientes. Verifica la conexión.');
        } finally {
            setLoading(false);
        }
    };

    const pacientesAgrupados = useMemo(() => {
        const grupos = {};

        citas.forEach(cita => {
            const nombreCitaNormalizado = (cita.profesional || '').trim().toLowerCase();
            const miNombreNormalizado = (miNombre || '').trim().toLowerCase();

            const esMia = nombreCitaNormalizado === miNombreNormalizado;
            const correspondeEspecialidad = esAdmin || coincideProfesionCita(cita, profesionUsuario);

            if (!esMia && !correspondeEspecialidad) return;

            const key = (cita.identificacion && cita.identificacion.trim())
                ? cita.identificacion.trim()
                : (cita.nombre_paciente ? cita.nombre_paciente.trim().toLowerCase() : 'desconocido');

            if (!grupos[key]) {
                grupos[key] = {
                    id: key,
                    nombre: cita.nombre_paciente || 'Paciente sin nombre',
                    identificacion: cita.identificacion || 'Sin documento',
                    telefono: cita.telefono_contacto || '',
                    municipio: cita.municipio_ciudad || '',
                    barrio: cita.barrio_localidad || '',
                    direccion: cita.direccion_atencion || '',
                    citas: []
                };
            }
            grupos[key].citas.push(cita);
        });

        return Object.values(grupos).map(paciente => {
            const citasPendientes = paciente.citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada');
            const citasAtendidas = paciente.citas.filter(c => c.estado === 'completada');

            const miNombreNormalizado = (miNombre || '').trim().toLowerCase();
            const asignadoAMi = paciente.citas.some(c => (c.profesional || '').trim().toLowerCase() === miNombreNormalizado);

            const sesionesTotales = 10;

            // MODIFICADO: Prioriza el conteo REAL en la base de datos de evoluciones/evaluaciones
            const sesionesRealizadas = conteoEvoluciones[paciente.identificacion] !== undefined
                ? conteoEvoluciones[paciente.identificacion]
                : citasAtendidas.length;

            const sesionesRestantes = Math.max(0, sesionesTotales - sesionesRealizadas);

            return {
                ...paciente,
                citasPendientes,
                citasAtendidas,
                asignadoAMi,
                sesionesTotales,
                sesionesRealizadas,
                sesionesRestantes
            };
        });
    }, [citas, conteoEvoluciones, miNombre, profesionUsuario, esAdmin]);

    const pacientesFiltrados = useMemo(() => {
        return pacientesAgrupados.filter(p => {
            const coincideBusqueda =
                p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                p.identificacion.toLowerCase().includes(busqueda.toLowerCase()) ||
                p.municipio.toLowerCase().includes(busqueda.toLowerCase());

            if (!coincideBusqueda) return false;
            if (filtroTab === 'mis-pacientes') return p.asignadoAMi;
            return true;
        });
    }, [pacientesAgrupados, busqueda, filtroTab]);

    const handleCancelarCita = async (citaId) => {
        if (!window.confirm("¿Estás seguro de que deseas cancelar esta cita médica?")) return;

        try {
            setActualizandoCitaId(citaId);
            const { error: err } = await supabase
                .from('citas')
                .update({ estado: 'cancelada' })
                .eq('id', citaId);

            if (err) throw err;

            setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado: 'cancelada' } : c));

            if (pacienteSeleccionado) {
                setPacienteSeleccionado(prev => {
                    if (!prev) return null;
                    const nuevasCitas = prev.citas.map(c => c.id === citaId ? { ...c, estado: 'cancelada' } : c);
                    return {
                        ...prev,
                        citas: nuevasCitas,
                        citasPendientes: nuevasCitas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada'),
                        citasAtendidas: nuevasCitas.filter(c => c.estado === 'completada')
                    };
                });
            }
            alert("¡Cita cancelada con éxito!");
        } catch (err) {
            console.error('Error al cancelar la cita:', err);
            alert('Error al cancelar: ' + err.message);
        } finally {
            setActualizandoCitaId(null);
        }
    };

    const handleAbrirEvaluacion = async (paciente, cita = null) => {
        try {
            if (cita) setActualizandoCitaId(cita.id);
            const documentoBuscado = String(paciente.identificacion || cita?.identificacion || '').trim();

            const { data: pacienteDb, error } = await supabase
                .from('pacientes')
                .select('id, numero_identificacion')
                .eq('numero_identificacion', documentoBuscado)
                .limit(1);

            if (error || !pacienteDb || pacienteDb.length === 0) {
                alert(`No se encontró el registro en la tabla 'pacientes' para la cédula: ${documentoBuscado}.`);
                return;
            }

            setCitaAtendiendo({
                citaId: cita ? cita.id : null,
                pacienteId: pacienteDb[0].id,
                servicio: cita ? cita.servicio : profesionUsuario
            });

        } catch (err) {
            alert('Hubo un error de conexión al verificar el paciente.');
        } finally {
            if (cita) setActualizandoCitaId(null);
        }
    };

    return (
        <div className="pacientes-page-container">
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)}>
                {menuAbierto ? '✕' : '☰'}
            </button>

            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="pacientes-main-layout">
                <header className="pacientes-header">
                    <h1>Pacientes</h1>
                    <p>Registro de pacientes, citas pendientes y atendidas</p>
                </header>

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
                            <button onClick={() => setBusqueda('')} className="clear-search-btn">✕</button>
                        )}
                    </div>

                    {esAdmin && (
                        <div className="tab-filters">
                            <button
                                className={`tab-btn ${filtroTab === 'mis-pacientes' ? 'active' : ''}`}
                                onClick={() => setFiltroTab('mis-pacientes')}
                            >
                                Mis Pacientes ({pacientesAgrupados.filter(p => p.asignadoAMi).length})
                            </button>
                            <button
                                className={`tab-btn ${filtroTab === 'todos' ? 'active' : ''}`}
                                onClick={() => setFiltroTab('todos')}
                            >
                                Todos los Pacientes ({pacientesAgrupados.length})
                            </button>
                        </div>
                    )}

                </div>

                {loading && (
                    <div className="pacientes-state-box">
                        <div className="spinner"></div>
                        <p>Cargando pacientes y citas...</p>
                    </div>
                )}

                {error && (
                    <div className="pacientes-state-box error">
                        <p>{error}</p>
                        <button onClick={cargarCitas} className="btn-reintentar">Reintentar</button>
                    </div>
                )}

                {!loading && !error && pacientesFiltrados.length === 0 && (
                    <div className="pacientes-empty-box">
                        <p>
                            {filtroTab === 'mis-pacientes'
                                ? 'No tienes pacientes asignados actualmente.'
                                : 'No se encontraron pacientes que coincidan con la búsqueda.'}
                        </p>
                    </div>
                )}

                {!loading && !error && pacientesFiltrados.length > 0 && (
                    <div className="pacientes-grid">
                        {pacientesFiltrados.map((paciente) => (
                            <div key={paciente.id} className="paciente-card-item" onClick={() => setPacienteSeleccionado(paciente)}>
                                <div className="paciente-card-header">
                                    <div className="paciente-avatar-initial">
                                        {paciente.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="paciente-info-summary">
                                        <h3>{paciente.nombre}</h3>
                                        <p className="paciente-doc-text">Doc: {paciente.identificacion}</p>
                                    </div>
                                </div>

                                {paciente.telefono && <p className="paciente-meta-item">📞 <span>{paciente.telefono}</span></p>}
                                {paciente.municipio && <p className="paciente-meta-item">📍 <span>{paciente.municipio} {paciente.barrio ? `- ${paciente.barrio}` : ''}</span></p>}

                                <div className="paciente-stats-row">
                                    <span className="stat-badge stat-pending">
                                        ⏳ {paciente.citasPendientes.length} restantes
                                    </span>
                                    <span className="stat-badge stat-completed">
                                        {/* MODIFICADO: Muestra las sesiones reales, no solo las citas */}
                                        ✓ {paciente.sesionesRealizadas} atendidas
                                    </span>
                                </div>

                                <button
                                    className="btn-ver-historial"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPacienteSeleccionado(paciente);
                                    }}
                                >
                                    Ver
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {pacienteSeleccionado && (
                <div className="modal-overlay" onClick={() => setPacienteSeleccionado(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <header className="modal-header">
                            <div className="modal-title-box">
                                <h2>{pacienteSeleccionado.nombre}</h2>
                                <p>Identificación: {pacienteSeleccionado.identificacion}</p>
                            </div>
                            <button className="btn-close-modal" onClick={() => setPacienteSeleccionado(null)}>✕</button>
                        </header>

                        <div className="modal-body-scroll">
                            <div className="modal-patient-info">
                                {pacienteSeleccionado.telefono && <p><strong>Teléfono:</strong> {pacienteSeleccionado.telefono}</p>}
                                {pacienteSeleccionado.direccion && <p><strong>Dirección:</strong> {pacienteSeleccionado.direccion}</p>}
                                {pacienteSeleccionado.municipio && <p><strong>Ciudad/Municipio:</strong> {pacienteSeleccionado.municipio}</p>}

                                <div className="sesiones-counter-box">
                                    <span>🎯 <strong>Totales:</strong> {pacienteSeleccionado.sesionesTotales || 10}</span>
                                    {/* Muestra las sesiones reales sacadas de la BD */}
                                    <span>✅ <strong>Atendidas:</strong> {pacienteSeleccionado.sesionesRealizadas}</span>
                                    <span className="sesiones-restantes">⏳ <strong>Restantes:</strong> {pacienteSeleccionado.sesionesRestantes}</span>
                                </div>

                                <div className="registro-espontaneo-container">
                                    <h4 className="registro-espontaneo-title">Registrar Atención</h4>

                                    {estadoEvaluacionPaciente === null ? (
                                        <p className="verificando-text">Verificando historial clínico...</p>
                                    ) : (
                                        <div className="botones-atencion-flex">
                                            <button
                                                disabled={estadoEvaluacionPaciente === true}
                                                onClick={() => handleAbrirEvaluacion(pacienteSeleccionado)}
                                                className={`btn-atencion ${estadoEvaluacionPaciente === true ? 'btn-atencion-disabled' : 'btn-evaluar'}`}
                                            >
                                                {estadoEvaluacionPaciente === true ? 'Evaluación' : 'Evaluación'}
                                            </button>

                                            <button
                                                disabled={estadoEvaluacionPaciente === false}
                                                onClick={() => handleAbrirEvaluacion(pacienteSeleccionado)}
                                                className={`btn-atencion ${estadoEvaluacionPaciente === false ? 'btn-atencion-disabled' : 'btn-evolucionar'}`}
                                            >
                                                Evolución
                                            </button>
                                        </div>
                                    )}
                                </div>

                            </div>

                            <div className="modal-section">
                                <h3 className="section-title section-pending-title">
                                    ⏳ Citas Pendientes Agendadas ({pacienteSeleccionado.citasPendientes.length})
                                </h3>

                                {pacienteSeleccionado.citasPendientes.length === 0 ? (
                                    <p className="empty-subtext">No hay citas pendientes agendadas en el sistema para este paciente.</p>
                                ) : (
                                    <div className="citas-sublist">
                                        {pacienteSeleccionado.citasPendientes.map((cita) => (
                                            <div key={cita.id} className="cita-detail-item pending-item">
                                                <div className="cita-detail-header">
                                                    <span className="cita-service-name">{cita.servicio || 'Consulta Médica'}</span>
                                                    <span className={`status-pill ${cita.estado}`}>
                                                        {cita.estado === 'confirmada' ? 'Asignada' : 'Pendiente'}
                                                    </span>
                                                </div>

                                                <div className="cita-detail-grid">
                                                    <p>📅 <strong>Fecha:</strong> {cita.fecha || 'Sin fecha'}</p>
                                                    {cita.hora && <p>⏰ <strong>Hora:</strong> {cita.hora}</p>}
                                                    <p>🧑‍⚕️ <strong>Profesional:</strong> {cita.profesional || 'Sin asignar'}</p>
                                                </div>

                                                <div className="cita-actions-row">
                                                    <button
                                                        disabled={actualizandoCitaId === cita.id}
                                                        onClick={() => handleCancelarCita(cita.id)}
                                                        className="btn-cancelar"
                                                    >
                                                        Cancelar Cita
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="modal-section">
                                {/* MODIFICADO: Aclaración de texto para no causar confusión visual si el número no cuadra con el de arriba */}
                                <h3 className="section-title section-completed-title">
                                    ✅ Citas Agendadas Completadas ({pacienteSeleccionado.citasAtendidas.length})
                                </h3>

                                {pacienteSeleccionado.citasAtendidas.length === 0 ? (
                                    <p className="empty-subtext">No hay citas agendadas que hayan sido completadas aún.</p>
                                ) : (
                                    <div className="citas-sublist">
                                        {pacienteSeleccionado.citasAtendidas.map((cita) => (
                                            <div key={cita.id} className="cita-detail-item completed-item">
                                                <div className="cita-detail-header">
                                                    <span className="cita-service-name">{cita.servicio || 'Consulta Médica'}</span>
                                                    <span className="status-pill completada">✓ Atendida</span>
                                                </div>

                                                <div className="cita-detail-grid">
                                                    <p>📅 <strong>Fecha:</strong> {cita.fecha || 'Sin fecha'}</p>
                                                    {cita.hora && <p>⏰ <strong>Hora:</strong> {cita.hora}</p>}
                                                    <p>🧑‍⚕️ <strong>Profesional:</strong> {cita.profesional || 'Profesional Asignado'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <footer className="modal-footer">
                            <button className="btn-close-modal-bottom" onClick={() => setPacienteSeleccionado(null)}>
                                Cerrar
                            </button>
                        </footer>
                    </div>
                </div>
            )}

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
    );
}

export default Pacientes;