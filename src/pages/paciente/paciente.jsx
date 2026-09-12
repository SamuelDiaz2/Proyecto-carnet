import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita } from '../../utils/filterServices.js';
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

    // Agrupar citas por paciente (usando identificación o nombre)
    const pacientesAgrupados = useMemo(() => {
        const grupos = {};

        citas.forEach(cita => {
            // Filtrar si la cita no pertenece a la especialidad y no está asignada al profesional
            const esMia = cita.profesional === miNombre;
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

        // Convertir a lista y calcular métricas
        return Object.values(grupos).map(paciente => {
            const citasPendientes = paciente.citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada');
            const citasAtendidas = paciente.citas.filter(c => c.estado === 'completada');
            const asignadoAMi = paciente.citas.some(c => c.profesional === miNombre);

            return {
                ...paciente,
                citasPendientes,
                citasAtendidas,
                asignadoAMi
            };
        });
    }, [citas, miNombre]);

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

    // Marcar una cita específica como Atendida (completada)
    const handleMarcarAtendida = async (citaId) => {
        try {
            setActualizandoCitaId(citaId);
            const { error: err } = await supabase
                .from('citas')
                .update({ estado: 'completada' })
                .eq('id', citaId);

            if (err) throw err;

            // Actualizar estado local
            setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado: 'completada' } : c));

            // Si hay un modal abierto, actualizar la vista del paciente seleccionado
            if (pacienteSeleccionado) {
                setPacienteSeleccionado(prev => {
                    if (!prev) return null;
                    const nuevasCitas = prev.citas.map(c => c.id === citaId ? { ...c, estado: 'completada' } : c);
                    return {
                        ...prev,
                        citas: nuevasCitas,
                        citasPendientes: nuevasCitas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada'),
                        citasAtendidas: nuevasCitas.filter(c => c.estado === 'completada')
                    };
                });
            }
        } catch (err) {
            console.error('Error al completar cita:', err);
            alert('Error al marcar la cita: ' + err.message);
        } finally {
            setActualizandoCitaId(null);
        }
    };

    // Asignar cita al profesional logueado
    const handleAsignarCita = async (citaId) => {
        try {
            setActualizandoCitaId(citaId);
            const { error: err } = await supabase
                .from('citas')
                .update({ 
                    profesional: miNombre,
                    estado: 'confirmada'
                })
                .eq('id', citaId);

            if (err) throw err;

            setCitas(prev => prev.map(c => c.id === citaId ? { ...c, profesional: miNombre, estado: 'confirmada' } : c));

            if (pacienteSeleccionado) {
                setPacienteSeleccionado(prev => {
                    if (!prev) return null;
                    const nuevasCitas = prev.citas.map(c => c.id === citaId ? { ...c, profesional: miNombre, estado: 'confirmada' } : c);
                    return {
                        ...prev,
                        citas: nuevasCitas,
                        citasPendientes: nuevasCitas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada'),
                        citasAtendidas: nuevasCitas.filter(c => c.estado === 'completada'),
                        asignadoAMi: true
                    };
                });
            }
        } catch (err) {
            console.error('Error al asignar cita:', err);
            alert('Error al asignar: ' + err.message);
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
                                ? 'No tienes pacientes asignados actualmente. Ve a "Pacientes Pendientes" para asignarte citas.'
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
                            {/* Datos de contacto */}
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
                            </div>

                            {/* Sección 1: Citas Restantes / Pendientes */}
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
                                                    {cita.profesional !== miNombre && (
                                                        <button
                                                            className="btn-action-assign"
                                                            disabled={actualizandoCitaId === cita.id}
                                                            onClick={() => handleAsignarCita(cita.id)}
                                                        >
                                                            {actualizandoCitaId === cita.id ? 'Asignando...' : 'Asignarme esta cita'}
                                                        </button>
                                                    )}

                                                    <button
                                                        className="btn-action-complete"
                                                        disabled={actualizandoCitaId === cita.id}
                                                        onClick={() => handleMarcarAtendida(cita.id)}
                                                    >
                                                        {actualizandoCitaId === cita.id ? 'Guardando...' : '✓ Marcar como Atendida'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sección 2: Citas Atendidas */}
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
        </div>
    );
}

export default Pacientes;