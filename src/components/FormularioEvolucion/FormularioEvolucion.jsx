import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { db } from '../../lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import SignatureCanvas from 'react-signature-canvas';
import datosEvaluacion from './evaluacion.json';
import datosEvolucion from './evolucion.json';
import './formularioEvolucion.css';

function FormularioEvolucion({ citaId, pacienteId, profesion, onCerrar, onGuardadoExitoso }) {
    const [formData, setFormData] = useState({});
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(true);
    const [esEvaluacionInicial, setEsEvaluacionInicial] = useState(true);
    const [firmaConfirmada, setFirmaConfirmada] = useState(false);

    const firmaRef = useRef({});

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

    const limpiarFirma = () => {
        firmaRef.current.clear();
        setFirmaConfirmada(false);
        const nuevoFormData = { ...formData };
        delete nuevoFormData.firma_paciente;
        setFormData(nuevoFormData);
    };

    const confirmarFirma = () => {
        if (!firmaRef.current || firmaRef.current.isEmpty()) {
            alert("El lienzo de firma está vacío. Por favor, pida al paciente que firme.");
            return;
        }

        // Obtenemos directamente el lienzo, sin utilizar trim-canvas.
        const canvas = firmaRef.current.getCanvas();

        // Convertimos la firma en una imagen PNG Base64.
        const urlFirma = canvas.toDataURL('image/png');

        // Guardamos la firma dentro de formData.
        manejarCambio('firma_paciente', urlFirma);

        setFirmaConfirmada(true);
    };

    const guardarAtencion = async (e) => {
        e.preventDefault();

        if (!firmaConfirmada) {
            alert("Debe confirmar la firma del paciente antes de guardar el registro.");
            return;
        }

        try {
            setCargando(true);
            const cedulaProfesional = localStorage.getItem("usuarioCedula") || "";

            if (!cedulaProfesional) {
                throw new Error("No se encontró la cédula del profesional.");
            }

            // Consultar los datos del profesional en Firebase.
            const profesionalRef = doc(db, "autorizados", cedulaProfesional);
            const profesionalSnap = await getDoc(profesionalRef);

            if (!profesionalSnap.exists()) {
                throw new Error("No se encontró el profesional en Firebase.");
            }

            const datosProfesional = profesionalSnap.data();
            const nombreProfesional = datosProfesional.nombre || "";

            if (!nombreProfesional) {
                throw new Error("El profesional no tiene un nombre registrado.");
            }

            const { error } = await supabase
                .from('evoluciones_atencion')
                .insert([
                    {
                        cita_id: citaId,
                        paciente_id: pacienteId,
                        profesional_cedula: cedulaProfesional,
                        profesional_nombre: nombreProfesional,
                        profesion_especialidad: profesion,
                        tipo_registro: esEvaluacionInicial ? 'evaluacion_inicial' : 'evolucion_seguimiento',
                        datos_formulario: formData
                    }
                ]);

            if (error) throw error;

            if (citaId) {
                await supabase
                    .from('citas')
                    .update({ estado: 'completada' })
                    .eq('id', citaId);
            }

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

                            <div className="firma-seccion-bloque">
                                <h4 className="titulo-seccion-json">Firma del Paciente</h4>
                                <div className={`firma-canvas-container ${firmaConfirmada ? 'firma-bloqueada' : ''}`}>
                                    <SignatureCanvas
                                        ref={firmaRef}
                                        canvasProps={{ className: 'firma-canvas' }}
                                    />
                                    {firmaConfirmada && (
                                        <div className="firma-overlay-confirmada">
                                            <span>✓ Firma capturada</span>
                                        </div>
                                    )}
                                </div>
                                <div className="firma-acciones">
                                    <button
                                        type="button"
                                        className="btn-limpiar-firma"
                                        onClick={limpiarFirma}
                                    >
                                        Limpiar Lienzo
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-confirmar-firma"
                                        onClick={confirmarFirma}
                                        disabled={firmaConfirmada}
                                    >
                                        {firmaConfirmada ? 'Firma Confirmada' : 'Confirmar Firma'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
                            <button
                                type="submit"
                                className="btn-guardar"
                                disabled={cargando || !firmaConfirmada}
                            >
                                {cargando ? 'Guardando...' : (citaId ? 'Guardar y Finalizar Cita' : 'Guardar')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default FormularioEvolucion;