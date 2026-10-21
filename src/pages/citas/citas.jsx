import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { db } from '../../lib/firebaseConfig.js';
import { doc, getDoc } from 'firebase/firestore';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita } from '../../utils/filterServices.js';
import './citas.css';

function CitasProfesional() {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cargandoPerfil, setCargandoPerfil] = useState(false);
    const [error, setError] = useState(null);
    const [actualizandoId, setActualizandoId] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [profesionUsuario, setProfesionUsuario] = useState(localStorage.getItem("usuarioProfesion") || "");
    const nombreProfesional = localStorage.getItem("usuarioNombre") || "Profesional Asignado";
    const cedulaUsuario = localStorage.getItem("usuarioCedula") || "";

    useEffect(() => {
        const iniciarCarga = async () => {
            let prof = profesionUsuario;

            // Si no está en localStorage, se consulta en Firestore
            if (!prof && cedulaUsuario) {
                try {
                    setCargandoPerfil(true);
                    const snap = await getDoc(doc(db, "autorizados", cedulaUsuario));
                    if (snap.exists() && snap.data().profesion) {
                        prof = snap.data().profesion;
                        setProfesionUsuario(prof);
                        localStorage.setItem("usuarioProfesion", prof);
                    }
                } catch (e) {
                    console.error("Error al cargar profesión desde Firestore:", e);
                } finally {
                    setCargandoPerfil(false);
                }
            }

            await obtenerCitas();
        };

        iniciarCarga();
    }, [cedulaUsuario]);

    const obtenerCitas = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, err } = await supabase
                .from('citas')
                .select('*')
                .order('fecha', { ascending: true });

            if (err) throw err;

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

            const { error: updateError } = await supabase
                .from('citas')
                .update({
                    profesional: nombreProfesional,
                    estado: 'confirmada'
                })
                .eq('id', citaId);

            if (updateError) throw updateError;

            // Actualización local en estado
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

    // Filtro estricto automático: solo pasan citas que coinciden con la profesión del usuario
    const citasEspecialidad = useMemo(() => {
        if (!profesionUsuario) return [];
        return citas.filter(cita => coincideProfesionCita(cita, profesionUsuario));
    }, [citas, profesionUsuario]);

    const isLoadingTotal = loading || cargandoPerfil;

    return (
        <section className="citas-section">
            {/* Botón menú hamburguesa */}
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
                {menuAbierto ? '✕' : '☰'}
            </button>

            {/* Menú lateral */}
            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="citas-container">
                <h2>Citas de {profesionUsuario || 'Especialidad'}</h2>

                {isLoadingTotal && (
                    <div className="citas-state">
                        <div className="spinner"></div>
                        <p>Cargando citas de {profesionUsuario || 'tu especialidad'}...</p>
                    </div>
                )}

                {error && (
                    <div className="citas-state error">
                        <p>{error}</p>
                        <button onClick={obtenerCitas} className="btn-reintentar">Reintentar</button>
                    </div>
                )}

                {!isLoadingTotal && !error && citasEspecialidad.length === 0 && (
                    <div className="citas-empty">
                        <p>No hay citas registradas para {profesionUsuario || 'tu especialidad'} en este momento.</p>
                    </div>
                )}

                {!isLoadingTotal && !error && citasEspecialidad.length > 0 && (
                    <div className="citas-grid">
                        {citasEspecialidad.map((cita) => (
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
                                            <strong>Profesional Asignado:</strong> {cita.profesional}
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
                                                        ? 'Reasignar Paciente'
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