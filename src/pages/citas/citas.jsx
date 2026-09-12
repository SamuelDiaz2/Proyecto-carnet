import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { db } from '../../lib/firebaseConfig.js';
import { doc, getDoc } from 'firebase/firestore';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita, LISTA_PROFESIONES } from '../../utils/filterServices.js';
import './citas.css';

function CitasProfesional() {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actualizandoId, setActualizandoId] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [profesionUsuario, setProfesionUsuario] = useState(localStorage.getItem("usuarioProfesion") || "");
    const nombreProfesional = localStorage.getItem("usuarioNombre") || "Profesional Asignado";
    const cedulaUsuario = localStorage.getItem("usuarioCedula") || "";
    const esAdmin = cedulaUsuario === "1028862517" || cedulaUsuario === "1073519428";

    const [filtroAdmin, setFiltroAdmin] = useState('todos');

    useEffect(() => {
        // En caso de que la profesión no estuviera en localStorage, intentar cargarla desde Firestore
        const cargarProfesion = async () => {
            if (!profesionUsuario && cedulaUsuario) {
                try {
                    const snap = await getDoc(doc(db, "autorizados", cedulaUsuario));
                    if (snap.exists() && snap.data().profesion) {
                        const prof = snap.data().profesion;
                        setProfesionUsuario(prof);
                        localStorage.setItem("usuarioProfesion", prof);
                    }
                } catch (e) {
                    console.error("Error al cargar profesión desde Firestore:", e);
                }
            }
        };

        cargarProfesion();
        obtenerCitasProfesional();
    }, [cedulaUsuario, profesionUsuario]);

    const obtenerCitasProfesional = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: err } = await supabase
                .from('citas')
                .select('*')
                .order('fecha', { ascending: true });

            if (err) {
                throw err;
            }

            setCitas(data || []);
        } catch (err) {
            console.error('Error al obtener las citas:', err.message);
            setError('No se pudieron cargar las citas. Verifica la conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleSeleccionarPaciente = async (citaId) => {
        try {
            setActualizandoId(citaId);

            // Actualizar la columna 'profesional' en la tabla 'citas' de Supabase
            const { error: updateError } = await supabase
                .from('citas')
                .update({
                    profesional: nombreProfesional,
                    estado: 'confirmada'
                })
                .eq('id', citaId);

            if (updateError) throw updateError;

            // Actualizamos el estado local para mostrar el cambio en la pantalla sin recargar
            setCitas(prevCitas =>
                prevCitas.map(cita =>
                    cita.id === citaId ? { ...cita, profesional: nombreProfesional, estado: 'confirmada' } : cita
                )
            );
        } catch (err) {
            console.error('Error al asignar profesional:', err.message);
            alert('Error al asignar profesional: ' + err.message);
        } finally {
            setActualizandoId(null);
        }
    };

    // Filtrar citas según la profesión del profesional o el filtro de administrador
    const citasFiltradas = useMemo(() => {
        return citas.filter(cita => {
            // Citas ya asignadas a este profesional siempre se muestran
            if (nombreProfesional && cita.profesional === nombreProfesional) {
                return true;
            }

            // Administrador: puede ver todas o filtrar por especialidad
            if (esAdmin) {
                if (filtroAdmin === 'todos') return true;
                return coincideProfesionCita(cita, filtroAdmin);
            }

            // Profesional: solo ve citas de su especialidad
            return coincideProfesionCita(cita, profesionUsuario);
        });
    }, [citas, nombreProfesional, esAdmin, filtroAdmin, profesionUsuario]);

    return (
        <section className="citas-section">
            {/* Botón hamburguesa */}
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
                {menuAbierto ? '✕' : '☰'}
            </button>

            {/* Menú lateral */}
            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="citas-container">
                <h2>Citas Asignadas / Agendadas</h2>

                {/* Filtro / Indicador de Especialidad */}
                <div className="filtro-profesion-wrapper">
                    {esAdmin ? (
                        <div className="filtro-profesion-admin">
                            <label htmlFor="filtro-admin">Filtrar por Especialidad:</label>
                            <select
                                id="filtro-admin"
                                value={filtroAdmin}
                                onChange={(e) => setFiltroAdmin(e.target.value)}
                            >
                                <option value="todos">Todas las Especialidades ({citas.length})</option>
                                {LISTA_PROFESIONES.map((prof) => (
                                    <option key={prof} value={prof}>{prof}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="filtro-profesion-pill">
                            <span className="filtro-icon">🩺</span>
                            <span className="filtro-label">Especialidad:</span>
                            <span className="filtro-valor">{profesionUsuario || 'General'}</span>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="citas-state">
                        <div className="spinner"></div>
                        <p>Cargando lista de citas...</p>
                    </div>
                )}

                {error && (
                    <div className="citas-state error">
                        <p>{error}</p>
                        <button onClick={obtenerCitasProfesional} className="btn-reintentar">Reintentar</button>
                    </div>
                )}

                {!loading && !error && citasFiltradas.length === 0 && (
                    <div className="citas-empty">
                        <p>
                            {esAdmin && filtroAdmin !== 'todos'
                                ? `No hay citas para la especialidad "${filtroAdmin}".`
                                : profesionUsuario
                                ? `No hay citas disponibles para tu especialidad (${profesionUsuario}) en este momento.`
                                : 'No hay citas programadas en este momento.'}
                        </p>
                    </div>
                )}

                {!loading && !error && citasFiltradas.length > 0 && (
                    <div className="citas-grid">
                        {citasFiltradas.map((cita) => (
                            <div key={cita.id} className="cita-card">
                                <div className="cita-header">
                                    <span className={`cita-estado ${cita.estado?.toLowerCase() || 'pendiente'}`}>
                                        {cita.estado || 'Pendiente'}
                                    </span>
                                    {cita.hora && (
                                        <span className="cita-hora">
                                            ⏰ {cita.hora}
                                        </span>
                                    )}
                                </div>

                                <div className="cita-body">
                                    <h3>{cita.servicio || 'Consulta Médica'}</h3>

                                    {cita.nombre_paciente && (
                                        <p className="cita-paciente">
                                            <strong>Paciente:</strong> {cita.nombre_paciente}
                                        </p>
                                    )}

                                    {cita.identificacion && (
                                        <p className="cita-identificacion">
                                            <strong>Documento:</strong> {cita.identificacion}
                                        </p>
                                    )}

                                    {cita.telefono_contacto && (
                                        <p className="cita-telefono">
                                            <strong>Teléfono:</strong> {cita.telefono_contacto}
                                        </p>
                                    )}

                                    {cita.fecha && (
                                        <p className="cita-fecha">
                                            <strong>Fecha:</strong> {cita.fecha}
                                        </p>
                                    )}

                                    {cita.modalidad && (
                                        <p className="cita-modalidad">
                                            <strong>Modalidad:</strong> {cita.modalidad}
                                        </p>
                                    )}

                                    {cita.profesional && (
                                        <p className="cita-profesional">
                                            <strong>Profesional:</strong> {cita.profesional}
                                        </p>
                                    )}

                                    <hr className="divider" />

                                    <p className="cita-ubicacion-title"><strong>Ubicación de Atención:</strong></p>

                                    {cita.municipio_ciudad && (
                                        <p className="cita-municipio">
                                            📍 {cita.municipio_ciudad} {cita.barrio_localidad ? `- ${cita.barrio_localidad}` : ''}
                                        </p>
                                    )}

                                    {cita.direccion_atencion && (
                                        <p className="cita-direccion">
                                            🏠 {cita.direccion_atencion}
                                        </p>
                                    )}

                                    <div className="cita-acciones">
                                        <button
                                            className={`btn-seleccionar ${cita.profesional === nombreProfesional ? 'btn-asignado-propio' : ''}`}
                                            disabled={actualizandoId === cita.id}
                                            onClick={() => handleSeleccionarPaciente(cita.id)}
                                        >
                                            {actualizandoId === cita.id
                                                ? 'Asignando...'
                                                : cita.profesional === nombreProfesional
                                                    ? '✓ Asignado a Ti'
                                                    : cita.profesional
                                                        ? 'Asignar Paciente (Reasignar)'
                                                        : 'Asignar Paciente'
                                            }
                                        </button>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default CitasProfesional;