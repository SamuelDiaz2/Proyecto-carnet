import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import datosEvaluacion from './evaluacion.json';
import datosEvolucion from './evolucion.json';
import './formularioEvolucion.css';

function FormularioEvolucion({ citaId, pacienteId, profesion, onCerrar, onGuardadoExitoso }) {
    const [formData, setFormData] = useState({});
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(true);
    const [esEvaluacionInicial, setEsEvaluacionInicial] = useState(true);

    useEffect(() => {
        const verificarHistorial = async () => {
            if (!pacienteId) {
                setVerificando(false);
                return;
            }

            try {
                setVerificando(true);

                const { count, error } = await supabase
                    .from('evoluciones_atencion')
                    .select('*', { count: 'exact', head: true })
                    .eq('paciente_id', pacienteId);

                if (error) throw error;

                setEsEvaluacionInicial(count === 0);

            } catch (err) {
                alert("❌ Error al verificar historial:");
            } finally {
                setVerificando(false);
            }
        };

        verificarHistorial();
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
                        tipo_registro: esEvaluacionInicial ? 'evaluacion_inicial' : 'evolucion_seguimiento', // <-- RESTAURADO
                        datos_formulario: formData
                    }
                ]);

            if (error) throw error;

            await supabase
                .from('citas')
                .update({ estado: 'completada' })
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

    const claveProfesion = profesion ? profesion.toLowerCase().replace(/á/g, 'a').replace(/í/g, 'i').replace(/\s+/g, '_') : 'fonoaudiologia';

    // Navegación segura usando opcional chaining (?.) para evitar crasheos si la profesión no existe en el JSON
    const seccionesActuales = esEvaluacionInicial
        ? (datosEvaluacion.servicio?.[claveProfesion] || datosEvaluacion.servicio?.fonoaudiologia || [])
        : (datosEvolucion.evoluciones?.[claveProfesion] || datosEvolucion.evoluciones?.observaciones_clinicas || []);

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <div>
                        <h3>{esEvaluacionInicial ? 'Evaluación Inicial' : 'Evolución de Seguimiento'}</h3>
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
                        <div className="contenedor-scroll-secciones">
                            {seccionesActuales.map((seccion, index) => (
                                <div key={index} className="seccion-bloque">
                                    <h4 className="titulo-seccion-json">{seccion.titulo}</h4>
                                    <div className="campos-grid">
                                        {seccion.campos.map((campo) => (
                                            <div key={campo.id} className="form-group">
                                                <label>{campo.label}</label>
                                                {campo.tipo === 'select' ? (
                                                    <select onChange={(e) => manejarCambio(campo.id, e.target.value)} defaultValue="">
                                                        <option value="" disabled>Seleccione...</option>
                                                        {campo.opciones.map((op, i) => (
                                                            <option key={i} value={op}>{op}</option>
                                                        ))}
                                                    </select>
                                                ) : campo.tipo === 'textarea' ? (
                                                    <textarea placeholder="Escribe aquí..." onChange={(e) => manejarCambio(campo.id, e.target.value)} />
                                                ) : (
                                                    <input type={campo.tipo} onChange={(e) => manejarCambio(campo.id, e.target.value)} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

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