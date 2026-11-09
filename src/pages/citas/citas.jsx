import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { db } from '../../lib/firebaseConfig.js';
import { doc, getDoc } from 'firebase/firestore';
import SideMenu from '../../components/side-menu/side-menu.jsx';
import { coincideProfesionCita } from '../../utils/filterServices.js'; // <--- IMPORTAMOS TU FILTRO
import './citas.css';

function CitasProfesional() {
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cargandoPerfil, setCargandoPerfil] = useState(false);
    const [error, setError] = useState(null);
    const [actualizandoId, setActualizandoId] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [profesionUsuario, setProfesionUsuario] = useState(localStorage.getItem("usuarioProfesion") || "");
    const nombreProfesional = localStorage.getItem("usuarioNombre") || "Profesional Asignado";
    const cedulaUsuario = localStorage.getItem("usuarioCedula") || "";
    const esAdmin = cedulaUsuario === "1028862517" || cedulaUsuario === "1073519428";

    useEffect(() => {
        const iniciarCarga = async () => {
            let prof = profesionUsuario;

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

            await obtenerPacientes();
        };

        iniciarCarga();
    }, [cedulaUsuario]);

    const obtenerPacientes = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: err } = await supabase
                .from('pacientes')
                .select('*')
                .order('created_at', { ascending: false });

            if (err) throw err;

            setPacientes(data || []);
        } catch (err) {
            console.error('Error al obtener los pacientes:', err.message);
            setError('No se pudieron cargar los pacientes. Verifica la conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleAsignarsePaciente = async (paciente) => {
        try {
            if (!paciente || !paciente.id) {
                alert("Error: No se pudo identificar al paciente.");
                return;
            }

            const profesionalAsignado = (paciente.profesional || '').trim();
            if (profesionalAsignado) {
                alert(esAdmin
                    ? 'Para reasignar este paciente, abre su ficha en el Directorio de Pacientes.'
                    : `Este paciente ya está asignado a ${profesionalAsignado}.`);
                return;
            }

            setActualizandoId(paciente.id);

            const { data: asignacionActual, error: errorConsulta } = await supabase
                .from('pacientes')
                .select('profesional')
                .eq('id', paciente.id)
                .single();

            if (errorConsulta) throw errorConsulta;

            const profesionalActual = asignacionActual.profesional;
            if (profesionalActual && profesionalActual.trim()) {
                setPacientes(prev =>
                    prev.map(p =>
                        p.id === paciente.id ? { ...p, profesional: profesionalActual } : p
                    )
                );
                alert(esAdmin
                    ? 'Este paciente ya está asignado. Para reasignarlo, abre su ficha en el Directorio de Pacientes.'
                    : `Este paciente ya está asignado a ${profesionalActual}.`);
                return;
            }

            let actualizacion = supabase
                .from('pacientes')
                .update({ profesional: nombreProfesional })
                .eq('id', paciente.id);
            actualizacion = profesionalActual == null
                ? actualizacion.is('profesional', null)
                : actualizacion.eq('profesional', profesionalActual);

            const { data: pacienteActualizado, error: errorActualizacion } = await actualizacion
                .select('id')
                .maybeSingle();

            if (errorActualizacion) throw errorActualizacion;
            if (!pacienteActualizado) {
                throw new Error('Otro usuario asignó este paciente primero. Actualiza la lista e inténtalo de nuevo.');
            }

            // Creamos la cita para que aparezca en "Mis Pacientes".
            const fechaHoy = new Date().toISOString().split('T')[0];
            const horaActual = new Date().toTimeString().split(' ')[0];

            const { error: citaError } = await supabase
                .from('citas')
                .insert([
                    {
                        nombre_paciente: paciente.nombre_completo,
                        identificacion: paciente.numero_identificacion,
                        telefono_contacto: paciente.telefono,
                        direccion_atencion: paciente.direccion,
                        municipio_ciudad: paciente.municipio_ciudad,
                        servicio: paciente.servicio_principal,
                        modalidad: paciente.modalidad_preferida || '30 minutos',
                        fecha: fechaHoy,
                        hora: horaActual,
                        estado: 'confirmada', // Nace confirmada para ti
                        profesional: nombreProfesional
                    }
                ]);

            if (citaError) throw citaError;

            setPacientes(prev =>
                prev.map(p =>
                    p.id === paciente.id ? { ...p, profesional: nombreProfesional } : p
                )
            );

            alert("¡Paciente asignado con éxito! Ya se encuentra disponible en 'Mis Pacientes'.");

        } catch (err) {
            console.error('Error al asignar paciente:', err.message);
            alert('Error al asignar paciente: ' + err.message);
        } finally {
            setActualizandoId(null);
        }
    };

    // FILTRADO USANDO TU UTILIDAD OFICIAL
    const pacientesFiltrados = useMemo(() => {
        if (!profesionUsuario) return [];
        return pacientes.filter(paciente => {
            // Creamos un objeto simulando la estructura que espera coincideProfesionCita
            const objetoParaFiltrar = {
                servicio: paciente.servicio_principal,
                especialidad: paciente.servicio_principal,
                profesion: paciente.servicio_principal
            };

            return coincideProfesionCita(objetoParaFiltrar, profesionUsuario);
        });
    }, [pacientes, profesionUsuario]);

    const isLoadingTotal = loading || cargandoPerfil;

    return (
        <section className="citas-section">
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
                {menuAbierto ? '✕' : '☰'}
            </button>

            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="citas-container">
                <h2>Pacientes de {profesionUsuario || 'Especialidad'}</h2>

                {isLoadingTotal && (
                    <div className="citas-state">
                        <div className="spinner"></div>
                        <p>Cargando pacientes...</p>
                    </div>
                )}

                {error && (
                    <div className="citas-state error">
                        <p>{error}</p>
                        <button onClick={obtenerPacientes} className="btn-reintentar">Reintentar</button>
                    </div>
                )}

                {!isLoadingTotal && !error && pacientesFiltrados.length === 0 && (
                    <div className="citas-empty">
                        <p>No hay pacientes registrados para {profesionUsuario || 'tu especialidad'} en este momento.</p>
                    </div>
                )}

                {!isLoadingTotal && !error && pacientesFiltrados.length > 0 && (
                    <div className="citas-grid">
                        {pacientesFiltrados.map((paciente) => {
                            const profesionalAsignado = (paciente.profesional || '').trim();
                            const asignadoAMi = profesionalAsignado.toLowerCase() === nombreProfesional.trim().toLowerCase();

                            return (
                            <div key={paciente.id} className="cita-card">
                                <div className="cita-header">
                                    <span className="cita-estado confirmada">
                                        Registrado
                                    </span>
                                </div>

                                <div className="cita-body">
                                    <h3>{paciente.nombre_completo || 'Sin nombre'}</h3>

                                    <p className="cita-identificacion">
                                        <strong>Documento:</strong> {paciente.tipo_identificacion || 'C.C'} {paciente.numero_identificacion}
                                    </p>

                                    {paciente.edad && (
                                        <p className="cita-edad">
                                            <strong>Edad:</strong> {paciente.edad} años
                                        </p>
                                    )}

                                    {paciente.telefono && (
                                        <p className="cita-telefono">
                                            <strong>Teléfono:</strong> {paciente.telefono}
                                        </p>
                                    )}

                                    {paciente.diagnostico && (
                                        <p className="cita-diagnostico">
                                            <strong>Diagnóstico:</strong> {paciente.diagnostico}
                                        </p>
                                    )}

                                    {paciente.servicio_principal && (
                                        <p className="cita-servicio">
                                            <strong>Servicio:</strong> {paciente.servicio_principal}
                                        </p>
                                    )}

                                    {paciente.modalidad_preferida && (
                                        <p className="cita-modalidad">
                                            <strong>Modalidad:</strong> {paciente.modalidad_preferida}
                                        </p>
                                    )}

                                    {paciente.profesional && (
                                        <p className="cita-profesional">
                                            <strong>Profesional Asignado:</strong> {paciente.profesional}
                                        </p>
                                    )}

                                    <hr className="divider" />

                                    <p className="cita-ubicacion-title"><strong>Ubicación:</strong></p>

                                    {paciente.municipio_ciudad && (
                                        <p className="cita-municipio">
                                            📍 {paciente.municipio_ciudad} {paciente.barrio_localidad ? `- ${paciente.barrio_localidad}` : ''}
                                        </p>
                                    )}

                                    {paciente.direccion && (
                                        <p className="cita-direccion">
                                            🏠 {paciente.direccion}
                                        </p>
                                    )}

                                    <div className="cita-acciones">
                                        <button
                                            className={`btn-seleccionar ${asignadoAMi ? 'btn-asignado-propio' : ''}`}
                                            disabled={actualizandoId === paciente.id || Boolean(profesionalAsignado)}
                                            onClick={() => handleAsignarsePaciente(paciente)}
                                        >
                                            {actualizandoId === paciente.id
                                                ? 'Actualizando...'
                                                : profesionalAsignado
                                                    ? esAdmin
                                                        ? `Asignado a ${profesionalAsignado} · Reasignar en Directorio`
                                                        : asignadoAMi
                                                            ? '✓ Asignado a Ti'
                                                            : `Asignado a ${profesionalAsignado}`
                                                    : 'Asignarme este Paciente'}
                                        </button>
                                    </div>

                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

export default CitasProfesional;