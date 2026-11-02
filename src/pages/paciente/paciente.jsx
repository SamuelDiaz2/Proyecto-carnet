import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita } from '../../utils/filterServices.js';
import FormularioEvolucion from '../../components/FormularioEvolucion/FormularioEvolucion.jsx';
import './paciente.css';

function Pacientes() {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('mis-pacientes'); // 'mis-pacientes' | 'todos'
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [actualizandoCitaId, setActualizandoCitaId] = useState(null);


    const [citaAtendiendo, setCitaAtendiendo] = useState(null);

    const miNombre = localStorage.getItem("usuarioNombre") || "Profesional Asignado";
    const profesionUsuario = localStorage.getItem("usuarioProfesion") || "";
    const cedulaUsuario = localStorage.getItem("usuarioCedula") || "";
    const esAdmin = cedulaUsuario === "1028862517" || cedulaUsuario === "1073519428";

    useEffect(() => {
        cargarCitas();
    }, []);

    const cargarCitas = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: err } = await supabase
                .from('citas')
                .select('*')
                .order('fecha', { ascending: true });

            if (err) throw err;
            setCitas(data || []);
        } catch (err) {
            console.error('Error al cargar datos de pacientes:', err);
            setError('No se pudieron cargar los pacientes. Verifica la conexión.');
        } finally {
            setLoading(false);
        }
    };

    // Agrupar citas por paciente utilizando la utilidad profesional coincideProfesionCita
    const pacientesAgrupados = useMemo(() => {
        const grupos = {};

        citas.forEach(cita => {
            // Normalizamos los nombres para evitar que espacios o mayúsculas rompan el match
            const nombreCitaNormalizado = (cita.profesional || '').trim().toLowerCase();
            const miNombreNormalizado = (miNombre || '').trim().toLowerCase();

            const esMia = nombreCitaNormalizado === miNombreNormalizado;
            const correspondeEspecialidad = esAdmin || coincideProfesionCita(cita, profesionUsuario);

            if (!esMia && !correspondeEspecialidad) {
                return;
            }

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

            // CÁLCULO SEGURO DE SESIONES
            const sesionesTotales = 10; // Puedes cambiar el estándar o traerlo de la BD si lo agregas luego
            const sesionesRealizadas = citasAtendidas.length;
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
    }, [citas, miNombre, profesionUsuario, esAdmin]);

    // Filtrar pacientes según tab y texto de búsqueda
    const pacientesFiltrados = useMemo(() => {
        return pacientesAgrupados.filter(p => {
            const coincideBusqueda =
                p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                p.identificacion.toLowerCase().includes(busqueda.toLowerCase()) ||
                p.municipio.toLowerCase().includes(busqueda.toLowerCase());

            if (!coincideBusqueda) return false;

            if (filtroTab === 'mis-pacientes') {
                return p.asignadoAMi;
            }
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

    const handleAbrirEvaluacion = async (cita, paciente) => {
        try {
            setActualizandoCitaId(cita.id);

            const documentoBuscado = String(paciente.identificacion || cita.identificacion || '').trim();

            const { data: pacienteDb, error } = await supabase
                .from('pacientes')
                .select('id, numero_identificacion')
                .eq('numero_identificacion', documentoBuscado)
                .limit(1);

            if (error) {
                alert(`Error al buscar paciente: ${error.message}`);
                return;
            }

            if (!pacienteDb || pacienteDb.length === 0) {
                alert(`No se encontró el registro en la tabla 'pacientes' para la cédula: ${documentoBuscado}.`);
                return;
            }

            setCitaAtendiendo({
                citaId: cita.id,
                pacienteId: pacienteDb[0].id,
                servicio: cita.servicio
            });

        } catch (err) {
            alert('Hubo un error de conexión al verificar el paciente.');
        } finally {
            setActualizandoCitaId(null);
        }
    };

    return (
        <div className="pacientes-page-container">
            {/* Botón hamburguesa */}
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
                {menuAbierto ? '✕' : '☰'}
            </button>

            {/* Menú lateral */}
            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="pacientes-main-layout">
                <header className="pacientes-header">
                    <h1>Directorio de Pacientes</h1>
                    <p>Registro de pacientes, citas pendientes y atendidas</p>
                </header>

                {/* Barra de Búsqueda y Pestañas */}
                <div className="pacientes-controls">
                    <div className="search-bar-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar paciente por nombre o documento..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="search-input"
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda('')} className="clear-search-btn">✕</button>
                        )}
                    </div>

                    <div className="tab-filters">
                        <button
                            className={`tab-btn ${filtroTab === 'mis-pacientes' ? 'active' : ''}`}
                            onClick={() => setFiltroTab('mis-pacientes')}
                        >
                            🧑‍⚕️ Mis Pacientes ({pacientesAgrupados.filter(p => p.asignadoAMi).length})
                        </button>
                        <button
                            className={`tab-btn ${filtroTab === 'todos' ? 'active' : ''}`}
                            onClick={() => setFiltroTab('todos')}
                        >
                            👥 Todos los Pacientes ({pacientesAgrupados.length})
                        </button>
                    </div>
                </div>

                {/* Estados de carga y error */}
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

                {/* Lista vacía */}
                {!loading && !error && pacientesFiltrados.length === 0 && (
                    <div className="pacientes-empty-box">
                        <p>
                            {filtroTab === 'mis-pacientes'
                                ? 'No tienes pacientes asignados actualmente. Ve a "Todos los Pacientes" para asignarte citas.'
                                : 'No se encontraron pacientes que coincidan con la búsqueda.'}
                        </p>
                    </div>
                )}

                {/* Grilla de Pacientes */}
                {!loading && !error && pacientesFiltrados.length > 0 && (
                    <div className="pacientes-grid">
                        {pacientesFiltrados.map((paciente) => (
                            <div
                                key={paciente.id}
                                className="paciente-card-item"
                                onClick={() => setPacienteSeleccionado(paciente)}
                            >
                                <div className="paciente-card-header">
                                    <div className="paciente-avatar-initial">
                                        {paciente.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="paciente-info-summary">
                                        <h3>{paciente.nombre}</h3>
                                        <p className="paciente-doc-text">Doc: {paciente.identificacion}</p>
                                    </div>
                                </div>

                                {paciente.telefono && (
                                    <p className="paciente-meta-item">
                                        📞 <span>{paciente.telefono}</span>
                                    </p>
                                )}

                                {paciente.municipio && (
                                    <p className="paciente-meta-item">
                                        📍 <span>{paciente.municipio} {paciente.barrio ? `- ${paciente.barrio}` : ''}</span>
                                    </p>
                                )}

                                <div className="paciente-stats-row">
                                    <span className="stat-badge stat-pending">
                                        ⏳ {paciente.citasPendientes.length} {paciente.citasPendientes.length === 1 ? 'restante' : 'restantes'}
                                    </span>
                                    <span className="stat-badge stat-completed">
                                        ✓ {paciente.citasAtendidas.length} {paciente.citasAtendidas.length === 1 ? 'atendida' : 'atendidas'}
                                    </span>
                                </div>

                                <button
                                    className="btn-ver-historial"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPacienteSeleccionado(paciente);
                                    }}
                                >
                                    Ver Citas e Historial →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Detalle de Citas del Paciente */}
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
                                {pacienteSeleccionado.telefono && (
                                    <p><strong>Teléfono:</strong> {pacienteSeleccionado.telefono}</p>
                                )}
                                {pacienteSeleccionado.direccion && (
                                    <p><strong>Dirección:</strong> {pacienteSeleccionado.direccion}</p>
                                )}
                                {pacienteSeleccionado.municipio && (
                                    <p><strong>Ciudad/Municipio:</strong> {pacienteSeleccionado.municipio}</p>
                                )}

                                {/* NUEVO BLOQUE DE SESIONES */}
                                <div className="sesiones-counter-box" style={{ marginTop: '10px', padding: '10px', background: '#f0f4f8', borderRadius: '8px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                    <span>🎯 <strong>Totales:</strong> {pacienteSeleccionado.sesionesTotales || 10}</span>
                                    <span>✅ <strong>Atendidas:</strong> {pacienteSeleccionado.sesionesRealizadas}</span>
                                    <span style={{ color: '#d97706' }}>⏳ <strong>Restantes:</strong> {pacienteSeleccionado.sesionesRestantes}</span>
                                </div>
                            </div>

                            <div className="modal-section">
                                <h3 className="section-title section-pending-title">
                                    ⏳ Citas Restantes ({pacienteSeleccionado.citasPendientes.length})
                                </h3>

                                {pacienteSeleccionado.citasPendientes.length === 0 ? (
                                    <p className="empty-subtext">No hay citas pendientes para este paciente.</p>
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
                                                    {cita.modalidad && <p>🏥 <strong>Modalidad:</strong> {cita.modalidad}</p>}
                                                    <p>🧑‍⚕️ <strong>Profesional:</strong> {cita.profesional || 'Sin asignar'}</p>
                                                </div>

                                                <div className="cita-detail-actions">

                                                    <button
                                                        className="btn-action-complete"
                                                        disabled={actualizandoCitaId === cita.id}
                                                        onClick={() => handleAbrirEvaluacion(cita, pacienteSeleccionado)}
                                                    >
                                                        📝 Realizar Evaluación y Atender
                                                    </button>

                                                    <button
                                                        className="btn-action-cancel"
                                                        disabled={actualizandoCitaId === cita.id}
                                                        onClick={() => handleCancelarCita(cita.id)}
                                                        style={{ backgroundColor: '#ff4d4f', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                                                    >
                                                        {actualizandoCitaId === cita.id ? 'Procesando...' : 'Cancelar Cita'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="modal-section">
                                <h3 className="section-title section-completed-title">
                                    ✅ Citas Atendidas ({pacienteSeleccionado.citasAtendidas.length})
                                </h3>

                                {pacienteSeleccionado.citasAtendidas.length === 0 ? (
                                    <p className="empty-subtext">No hay citas completadas aún.</p>
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