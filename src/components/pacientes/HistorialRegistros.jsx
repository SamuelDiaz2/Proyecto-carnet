import { useEffect, useState } from 'react';
import { obtenerRegistrosPaciente } from '../../services/evolucionesService';
import generarHistorialPDF from '../../utils/generarRegistroPDF';
import datosEvaluacion from '../FormularioEvolucion/evaluacion.json';
import datosEvolucion from '../FormularioEvolucion/evolucion.json';
import UseAnimations from 'react-useanimations';
import download from 'react-useanimations/lib/download';
import loading from 'react-useanimations/lib/loading';

export default function HistorialRegistros({
    pacienteId,
    paciente,
    onCerrar,
}) {
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [generandoPDF, setGenerandoPDF] = useState(false);

    useEffect(() => {
        let activo = true;

        const cargarRegistros = async () => {
            try {
                setCargando(true);
                setError(null);

                const resultado = await obtenerRegistrosPaciente(pacienteId);

                if (activo) {
                    setRegistros(resultado);
                }
            } catch (err) {
                console.error('Error al cargar registros:', err);

                if (activo) {
                    setError('No se pudo cargar el historial clínico.');
                }
            } finally {
                if (activo) {
                    setCargando(false);
                }
            }
        };

        if (pacienteId) {
            cargarRegistros();
        } else {
            setRegistros([]);
            setCargando(false);
        }

        return () => {
            activo = false;
        };
    }, [pacienteId]);

    const descargarHistorial = async () => {
        try {
            setGenerandoPDF(true);

            await generarHistorialPDF({
                paciente,
                registros,
                datosEvaluacion,
                datosEvolucion,
            });
        } catch (err) {
            console.error('Error al generar el historial PDF:', err);
            alert('No fue posible generar el PDF: ' + err.message);
        } finally {
            setGenerandoPDF(false);
        }
    };

    if (!pacienteId) return null;

    return (
        <div
            className="historial-overlay"
            onClick={onCerrar}
        >
            <section
                className="historial-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="historial-header">
                    <div>
                        <h2>Historial clínico</h2>
                        <p>{paciente?.nombre || 'Paciente'}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onCerrar}
                        className="historial-cerrar"
                    >
                        ✕
                    </button>
                </header>

                <div className="historial-contenido">

                    {cargando ? (
                        <p>Cargando historial de atenciones...</p>
                    ) : error ? (
                        <div className="historial-error">
                            <p>{error}</p>

                            <button
                                type="button"
                                onClick={() => {
                                    setRegistros([]);
                                    setError(null);
                                    setCargando(true);
                                    // El efecto se vuelve a ejecutar al cambiar
                                    // el identificador; para reintentar se
                                    // puede cerrar y volver a abrir el historial.
                                    window.location.reload();
                                }}
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : registros.length === 0 ? (
                        <p>
                            Este paciente todavía no tiene evaluaciones
                            ni evoluciones registradas.
                        </p>
                    ) : (
                        <>
                            <div className="historial-resumen">
                                <h3>Registros disponibles</h3>

                                <span>
                                    {registros.length}
                                </span>
                            </div>

                            <div className="historial-lista">
                                {registros.map((registro) => {
                                    const esEvaluacion =
                                        registro.tipo_registro === 'evaluacion_inicial';

                                    return (
                                        <article
                                            key={registro.id}
                                            className="historial-registro-item"
                                        >
                                            <div>
                                                <strong>
                                                    {esEvaluacion
                                                        ? 'Evaluación inicial'
                                                        : 'Evolución de seguimiento'}
                                                </strong>

                                                <p>
                                                    {registro.profesion_especialidad ||
                                                        'Especialidad no disponible'}
                                                </p>

                                                <small>
                                                    {registro.created_at
                                                        ? new Date(
                                                            registro.created_at
                                                        ).toLocaleString('es-CO')
                                                        : 'Fecha no disponible'}
                                                </small>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            {generandoPDF ? (
                                <button
                                    type="button"
                                    className="btn-descargar-historial"
                                    disabled
                                >
                                    <UseAnimations
                                        animation={loading}
                                        size={22}
                                        strokeColor="currentColor"
                                        autoplay
                                        loop
                                    />
                                    <span>Generando PDF...</span>
                                </button>
                            ) : (
                                <UseAnimations
                                    animation={download}
                                    size={22}
                                    strokeColor="currentColor"
                                    loop={false}
                                    autoplay={true}
                                    render={(eventProps, animationProps) => (
                                        <button
                                            {...eventProps}
                                            type="button"
                                            className="btn-descargar-historial"
                                            onClick={(e) => {
                                                eventProps.onClick?.(e);
                                                descargarHistorial();
                                            }}
                                        >
                                            <div {...animationProps} />
                                            <span>Descargar historial</span>
                                        </button>
                                    )}
                                />
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
