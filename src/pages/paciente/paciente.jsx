import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita } from '../../utils/filterServices.js';
import FormularioEvolucion from '../../components/FormularioEvolucion/FormularioEvolucion.jsx';
import './paciente.css';

function Pacientes() {
    const [citas, setCitas] = useState([]);
    const [profesionalesAsignados, setProfesionalesAsignados] = useState({});
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
    const [registroPaciente, setRegistroPaciente] = useState({
        pacienteId: null,
        profesional: '',
        servicio: '',
        cargando: false,
        error: null
    });
    const [profesionalesDisponibles, setProfesionalesDisponibles] = useState([]);
    const [cargandoProfesionales, setCargandoProfesionales] = useState(false);
    const [errorProfesionales, setErrorProfesionales] = useState(null);
    const [mostrarReasignacion, setMostrarReasignacion] = useState(false);
    const [profesionalDestino, setProfesionalDestino] = useState('');
    const [reassignando, setReassignando] = useState(false);
    const [reintentarProfesionales, setReintentarProfesionales] = useState(0);
    const [reintentarRegistro, setReintentarRegistro] = useState(0);

    const miNombre = localStorage.getItem("usuarioNombre") || "Profesional Asignado";
    const profesionUsuario = localStorage.getItem("usuarioProfesion") || "";
    const cedulaUsuario = localStorage.getItem("usuarioCedula") || "";
    const esAdmin = cedulaUsuario === "1028862517" || cedulaUsuario === "1073519428";

    useEffect(() => {
        cargarCitas();
    }, []);

    useEffect(() => {
        setMostrarReasignacion(false);
        setProfesionalDestino('');
    }, [pacienteSeleccionado?.id]);

    useEffect(() => {
        if (!esAdmin) return;

        let activo = true;
        const cargarProfesionales = async () => {
            try {
                setCargandoProfesionales(true);
                setErrorProfesionales(null);
                const resultado = await getDocs(
                    query(collection(db, 'autorizados'), where('rol', '==', 'profesional'))
                );
                const lista = resultado.docs.map(profesional => ({
                    id: profesional.id,
                    ...profesional.data()
                }));

                if (activo) setProfesionalesDisponibles(lista);
            } catch (err) {
                console.error('Error al cargar profesionales disponibles:', err);
                if (activo) setErrorProfesionales('No se pudieron cargar los profesionales. Intenta de nuevo.');
            } finally {
                if (activo) setCargandoProfesionales(false);
            }
        };

        cargarProfesionales();
        return () => {
            activo = false;
        };
    }, [esAdmin, reintentarProfesionales]);

    useEffect(() => {
        let activo = true;

        const verificarEvaluacionPrevia = async () => {
            if (!pacienteSeleccionado) {
                setEstadoEvaluacionPaciente(null);
                setRegistroPaciente({
                    pacienteId: null,
                    profesional: '',
                    servicio: '',
                    cargando: false,
                    error: null
                });
                return;
            }

            let registroCargado = false;
            setEstadoEvaluacionPaciente(null);
            setRegistroPaciente({
                pacienteId: null,
                profesional: '',
                servicio: '',
                cargando: true,
                error: null
            });

            try {
                const documentoBuscado = String(pacienteSeleccionado.identificacion || '').trim();
                const { data: pacienteDb, error: errPac } = await supabase
                    .from('pacientes')
                    .select('id, profesional, servicio_principal')
                    .eq('numero_identificacion', documentoBuscado)
                    .limit(1);

                if (errPac) throw errPac;
                if (!pacienteDb || pacienteDb.length === 0) throw new Error('No se encontró el registro del paciente.');

                const registro = pacienteDb[0];
                registroCargado = true;
                if (activo) {
                    setRegistroPaciente({
                        pacienteId: registro.id,
                        profesional: registro.profesional || '',
                        servicio: registro.servicio_principal || pacienteSeleccionado.citas.find(c => c.servicio)?.servicio || '',
                        cargando: false,
                        error: null
                    });
                }

                const { count, error: errEvo } = await supabase
                    .from('evoluciones_atencion')
                    .select('*', { count: 'exact', head: true })
                    .eq('paciente_id', registro.id);

                if (errEvo) throw errEvo;
                if (activo) setEstadoEvaluacionPaciente(count > 0);
            } catch (err) {
                console.error("Error verificando el registro clínico:", err);
                if (activo) {
                    setEstadoEvaluacionPaciente('error');
                    if (!registroCargado) {
                        setRegistroPaciente(prev => ({
                            ...prev,
                            cargando: false,
                            error: err.message || 'No se pudo consultar el registro del paciente.'
                        }));
                    }
                }
            }
        };

        verificarEvaluacionPrevia();
        return () => {
            activo = false;
        };
    }, [pacienteSeleccionado, reintentarRegistro]);

    // MODIFICADO: Ahora extrae el conteo real de evoluciones hechas a los pacientes
    const cargarCitas = async () => {
        try {
            setLoading(true);
            setError(null);

            // Hacemos las peticiones en paralelo para mayor rapidez
            const [citasRes, pacientesRes, evolucionesRes] = await Promise.all([
                supabase.from('citas').select('*').order('fecha', { ascending: true }),
                supabase.from('pacientes').select('id, numero_identificacion, profesional'),
                supabase.from('evoluciones_atencion').select('paciente_id')
            ]);

            if (citasRes.error) throw citasRes.error;
            if (pacientesRes.error) throw pacientesRes.error;

            // Mapeamos cuantas evoluciones reales tiene cada paciente por su número de identificación
            const mapaEvo = {};
            const mapaProfesionales = {};
            if (!pacientesRes.error && pacientesRes.data) {
                pacientesRes.data.forEach(paciente => {
                    if (paciente.numero_identificacion) {
                        mapaProfesionales[String(paciente.numero_identificacion).trim()] = paciente.profesional || '';
                    }
                });
            }
            if (!pacientesRes.error && !evolucionesRes.error && pacientesRes.data && evolucionesRes.data) {
                pacientesRes.data.forEach(p => {
                    if (p.numero_identificacion) {
                        const count = evolucionesRes.data.filter(e => e.paciente_id === p.id).length;
                        mapaEvo[p.numero_identificacion.trim()] = count;
                    }
                });
            }

            setConteoEvoluciones(mapaEvo);
            setProfesionalesAsignados(mapaProfesionales);
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
            const documento = String(cita.identificacion || '').trim();
            const profesionalAsignado = Object.prototype.hasOwnProperty.call(profesionalesAsignados, documento)
                ? profesionalesAsignados[documento]
                : cita.profesional || '';
            const nombreCitaNormalizado = profesionalAsignado.trim().toLowerCase();
            const miNombreNormalizado = (miNombre || '').trim().toLowerCase();

            const esMia = nombreCitaNormalizado === miNombreNormalizado;
            const correspondeEspecialidad = esAdmin || coincideProfesionCita(cita, profesionUsuario);

            if (!esMia && !correspondeEspecialidad) return;

            const key = documento
                ? documento
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
                    profesional: profesionalAsignado,
                    citas: []
                };
            }
            if (profesionalAsignado) grupos[key].profesional = profesionalAsignado;
            grupos[key].citas.push(cita);
        });

        return Object.values(grupos).map(paciente => {
            const citasPendientes = paciente.citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada');
            const citasAtendidas = paciente.citas.filter(c => c.estado === 'completada');

            const miNombreNormalizado = (miNombre || '').trim().toLowerCase();
            const asignadoAMi = paciente.profesional
                ? paciente.profesional.trim().toLowerCase() === miNombreNormalizado
                : paciente.citas.some(c => (c.profesional || '').trim().toLowerCase() === miNombreNormalizado);

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
    }, [citas, conteoEvoluciones, profesionalesAsignados, miNombre, profesionUsuario, esAdmin]);

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

    const profesionalesDestino = useMemo(() => {
        if (!registroPaciente.servicio) return [];

        const asignadoActual = registroPaciente.profesional.trim().toLowerCase();
        return profesionalesDisponibles
            .filter(profesional =>
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

    const handleReasignarPaciente = async () => {
        if (!esAdmin || !registroPaciente.pacienteId || !pacienteSeleccionado || reassignando) return;

        const destino = profesionalesDestino.find(profesional => profesional.id === profesionalDestino);
        if (!destino) {
            alert('Selecciona un profesional de la misma especialidad.');
            return;
        }

        try {
            setReassignando(true);
            const { data: asignacionActual, error: errorConsulta } = await supabase
                .from('pacientes')
                .select('profesional')
                .eq('id', registroPaciente.pacienteId)
                .single();

            if (errorConsulta) throw errorConsulta;

            const profesionalActual = asignacionActual.profesional;
            let actualizacion = supabase
                .from('pacientes')
                .update({ profesional: destino.nombre })
                .eq('id', registroPaciente.pacienteId);

            actualizacion = profesionalActual == null
                ? actualizacion.is('profesional', null)
                : actualizacion.eq('profesional', profesionalActual);

            const { data: pacienteActualizado, error: errorPaciente } = await actualizacion
                .select('id')
                .maybeSingle();

            if (errorPaciente) throw errorPaciente;
            if (!pacienteActualizado) {
                throw new Error('La asignación cambió mientras tenías abierta la ficha. Ciérrala y vuelve a intentarlo.');
            }

            const documento = String(pacienteSeleccionado.identificacion || '').trim();
            const { error: errorCitas } = await supabase
                .from('citas')
                .update({ profesional: destino.nombre })
                .eq('identificacion', documento)
                .in('estado', ['pendiente', 'confirmada']);

            if (errorCitas) {
                await cargarCitas();
                throw new Error('El profesional del paciente se actualizó, pero no se pudieron actualizar sus citas pendientes. Recarga e inténtalo de nuevo.');
            }

            setProfesionalesAsignados(prev => ({ ...prev, [documento]: destino.nombre }));
            setCitas(prev => prev.map(cita =>
                String(cita.identificacion || '').trim() === documento &&
                    (cita.estado === 'pendiente' || cita.estado === 'confirmada')
                    ? { ...cita, profesional: destino.nombre }
                    : cita
            ));
            setRegistroPaciente(prev => ({ ...prev, profesional: destino.nombre }));
            setPacienteSeleccionado(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    profesional: destino.nombre,
                    citas: prev.citas.map(cita =>
                        cita.estado === 'pendiente' || cita.estado === 'confirmada'
                            ? { ...cita, profesional: destino.nombre }
                            : cita
                    ),
                    citasPendientes: prev.citasPendientes.map(cita => ({
                        ...cita,
                        profesional: destino.nombre
                    }))
                };
            });
            setMostrarReasignacion(false);
            setProfesionalDestino('');
            alert(`Paciente reasignado a ${destino.nombre}.`);
        } catch (err) {
            console.error('Error al reasignar paciente:', err);
            alert(`No se pudo completar la reasignación: ${err.message}`);
        } finally {
            setReassignando(false);
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

                                {esAdmin && (
                                    <div className="reasignacion-paciente">
                                        <div>
                                            <strong>Profesional asignado:</strong>{' '}
                                            {registroPaciente.cargando
                                                ? 'Consultando...'
                                                : registroPaciente.profesional || 'Sin asignar'}
                                            {registroPaciente.error && (
                                                <div className="reasignacion-error">
                                                    <p>{registroPaciente.error}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReintentarRegistro(prev => prev + 1)}
                                                    >
                                                        Reintentar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-reasignar-paciente"
                                            disabled={registroPaciente.cargando || Boolean(registroPaciente.error) || !registroPaciente.pacienteId}
                                            onClick={() => {
                                                setProfesionalDestino('');
                                                setMostrarReasignacion(true);
                                            }}
                                        >
                                            {registroPaciente.profesional ? 'Reasignar profesional' : 'Asignar profesional'}
                                        </button>
                                    </div>
                                )}

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
                                    ) : estadoEvaluacionPaciente === 'error' ? (
                                        <div className="reasignacion-error">
                                            <p>No se pudo verificar el historial clínico.</p>
                                            <button
                                                type="button"
                                                onClick={() => setReintentarRegistro(prev => prev + 1)}
                                            >
                                                Reintentar
                                            </button>
                                        </div>
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

                    {mostrarReasignacion && esAdmin && (
                        <div
                            className="reasignacion-overlay"
                            onClick={event => {
                                event.stopPropagation();
                                setMostrarReasignacion(false);
                            }}
                        >
                            <section
                                className="reasignacion-modal"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="reasignacion-titulo"
                                onClick={event => event.stopPropagation()}
                            >
                                <header className="reasignacion-header">
                                    <div>
                                        <h2 id="reasignacion-titulo">
                                            {registroPaciente.profesional ? 'Reasignar paciente' : 'Asignar profesional'}
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
                                        Profesional de {registroPaciente.servicio || 'la misma especialidad'}
                                    </label>
                                    {cargandoProfesionales ? (
                                        <p>Cargando profesionales...</p>
                                    ) : errorProfesionales ? (
                                        <div className="reasignacion-error">
                                            <p>{errorProfesionales}</p>
                                            <button
                                                type="button"
                                                onClick={() => setReintentarProfesionales(prev => prev + 1)}
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    ) : profesionalesDestino.length === 0 ? (
                                        <p>No hay otros profesionales disponibles para esta especialidad.</p>
                                    ) : (
                                        <select
                                            id="profesional-destino"
                                            value={profesionalDestino}
                                            onChange={event => setProfesionalDestino(event.target.value)}
                                        >
                                            <option value="">Selecciona un profesional...</option>
                                            {profesionalesDestino.map(profesional => (
                                                <option key={profesional.id} value={profesional.id}>
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
                                        disabled={!profesionalDestino || cargandoProfesionales || Boolean(errorProfesionales) || reassignando}
                                        onClick={handleReasignarPaciente}
                                    >
                                        {reassignando
                                            ? 'Guardando...'
                                            : registroPaciente.profesional ? 'Reasignar' : 'Asignar'}
                                    </button>
                                </footer>
                            </section>
                        </div>
                    )}
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