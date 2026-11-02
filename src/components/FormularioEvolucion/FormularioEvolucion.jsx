import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import formulariosData from './evaluacion.json'; // Asegúrate de ajustar la ruta de tu JSON
import './formularioEvolucion.css';

function FormularioEvolucion({ citaId, pacienteId, profesion, onCerrar, onGuardadoExitoso }) {
    const [formData, setFormData] = useState({});
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(true);
    const [esEvaluacionInicial, setEsEvaluacionInicial] = useState(true);

    // 1. Al abrir el modal, verificamos si es la primera cita del paciente
    useEffect(() => {
        const verificarHistorial = async () => {
            try {
                setVerificando(true);
                const { count, error } = await supabase
                    .from('evoluciones_atencion')
                    .select('*', { count: 'exact', head: true })
                    .eq('paciente_id', pacienteId);

                if (error) throw error;

                // Si count es 0, es la primera vez (Evaluación Inicial)
                // Si es mayor a 0, es una sesión de seguimiento (Evolución)
                setEsEvaluacionInicial(count === 0);

            } catch (err) {
                console.error("Error al verificar el historial del paciente:", err.message);
            } finally {
                setVerificando(false);
            }
        };

        if (pacienteId) {
            verificarHistorial();
        }
    }, [pacienteId]);

    const manejarCambio = (id, valor) => {
        setFormData(prev => ({ ...prev, [id]: valor }));
    };

    const guardarAtencion = async (e) => {
        e.preventDefault();
        try {
            setCargando(true);
            const cedulaProfesional = localStorage.getItem("usuarioCedula") || "";

            const { error } = await supabase
                .from('evoluciones_atencion')
                .insert([
                    {
                        cita_id: citaId,
                        paciente_id: pacienteId,
                        profesional_cedula: cedulaProfesional,
                        profesion_especialidad: profesion,
                        tipo_registro: esEvaluacionInicial ? 'evaluacion_inicial' : 'evolucion_seguimiento',
                        datos_formulario: formData
                    }
                ]);

            if (error) throw error;

            // Marcar la cita como atendida
            await supabase
                .from('citas')
                .update({ estado: 'atendida' })
                .eq('id', citaId);

            alert(esEvaluacionInicial ? "¡Evaluación inicial guardada con éxito!" : "¡Evolución guardada con éxito!");
            if (onGuardadoExitoso) onGuardadoExitoso();
            if (onCerrar) onCerrar();

        } catch (err) {
            console.error("Error al guardar:", err.message);
            alert("Error al guardar: " + err.message);
        } finally {
            setCargando(false);
        }
    };

    // Extraemos las secciones del JSON según la profesión que llega por props
    // Normalizamos la profesión para que coincida con las llaves del JSON (ej. "fonoaudiologia")
    const claveProfesion = profesion ? profesion.toLowerCase().replace(/á/g, 'a').replace(/í/g, 'i').replace(/\s+/g, '_') : 'fonoaudiologia';
    const seccionesEvaluacion = formulariosData.servicio[claveProfesion] || [];

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h3>{esEvaluacionInicial ? 'Evaluación Inicial' : 'Evolución de Control'}</h3>
                        <span className="subtitulo-profesion">{profesion}</span>
                    </div>
                    <button className="btn-cerrar" onClick={onCerrar}>✕</button>
                </div>

                {verificando ? (
                    <div className="cargando-container">
                        <p>Verificando historial del paciente...</p>
                    </div>
                ) : (
                    <form onSubmit={guardarAtencion} className="evolucion-form">

                        {esEvaluacionInicial ? (
                            /* ================= RENDERIZADO DE EVALUACIÓN INICIAL (DINÁMICO DESDE EL JSON) ================= */
                            <div className="contenedor-scroll-secciones">
                                {seccionesEvaluacion.map((seccion, index) => (
                                    <div key={index} className="seccion-bloque">
                                        <h4 className="titulo-seccion-json">{seccion.titulo}</h4>
                                        <div className="campos-grid">
                                            {seccion.campos.map((campo) => (
                                                <div key={campo.id} className="form-group">
                                                    <label>{campo.label}</label>
                                                    {campo.tipo === 'select' ? (
                                                        <select
                                                            onChange={(e) => manejarCambio(campo.id, e.target.value)}
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>Seleccione...</option>
                                                            {campo.opciones.map((op, i) => (
                                                                <option key={i} value={op}>{op}</option>
                                                            ))}
                                                        </select>
                                                    ) : campo.tipo === 'textarea' ? (
                                                        <textarea
                                                            placeholder="Escribe aquí..."
                                                            onChange={(e) => manejarCambio(campo.id, e.target.value)}
                                                        />
                                                    ) : (
                                                        <input
                                                            type={campo.tipo}
                                                            onChange={(e) => manejarCambio(campo.id, e.target.value)}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* ================= RENDERIZADO DE EVOLUCIÓN (PRÓXIMAMENTE SU JSON) ================= */
                            <div className="form-group">
                                <label>Evolución de la sesión de hoy</label>
                                <textarea
                                    required
                                    placeholder="Describe los avances, actividades realizadas y estado actual del paciente..."
                                    onChange={(e) => manejarCambio("observaciones_evolucion", e.target.value)}
                                />
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
                            <button type="submit" className="btn-guardar" disabled={cargando}>
                                {cargando ? 'Guardando...' : 'Guardar y Finalizar Cita'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default FormularioEvolucion;