import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebaseConfig';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import SignatureCanvas from 'react-signature-canvas';
import './login.css';

const obtenerFirmaRecortada = (canvas) => {
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('No fue posible leer el lienzo de la firma.');

    const { width, height } = canvas;
    const pixeles = contexto.getImageData(0, 0, width, height).data;
    let izquierda = width;
    let arriba = height;
    let derecha = -1;
    let abajo = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (pixeles[(y * width + x) * 4 + 3] > 0) {
                izquierda = Math.min(izquierda, x);
                arriba = Math.min(arriba, y);
                derecha = Math.max(derecha, x);
                abajo = Math.max(abajo, y);
            }
        }
    }

    if (derecha < izquierda || abajo < arriba) {
        throw new Error('No se encontró un trazo en la firma.');
    }

    const margen = 12;
    const x = Math.max(0, izquierda - margen);
    const y = Math.max(0, arriba - margen);
    const ancho = Math.min(width, derecha + margen + 1) - x;
    const alto = Math.min(height, abajo + margen + 1) - y;
    const recorte = document.createElement('canvas');
    recorte.width = ancho;
    recorte.height = alto;

    const contextoRecorte = recorte.getContext('2d');
    if (!contextoRecorte) throw new Error('No fue posible preparar la imagen de la firma.');

    contextoRecorte.drawImage(canvas, x, y, ancho, alto, 0, 0, ancho, alto);
    return recorte.toDataURL('image/png');
};

function Login() {
    const navigate = useNavigate();
    const firmaRef = useRef(null);
    const [cedula, setCedula] = useState('');
    const [pin, setPin] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [perfilPendiente, setPerfilPendiente] = useState(null);
    const [datosCobro, setDatosCobro] = useState({
        banco: '',
        numeroCuenta: '',
        ciudad: '',
        telefono: ''
    });
    const [guardandoDatosCobro, setGuardandoDatosCobro] = useState(false);

    const iniciarSesion = () => {
        localStorage.setItem("sesion", "true");
        window.dispatchEvent(new Event('app-session-change'));
        navigate('/carnet');
    };

    const tieneDatosCobroCompletos = (datos) =>
        Boolean(
            datos.banco?.trim() &&
            datos.numeroCuenta?.trim() &&
            datos.ciudad?.trim() &&
            datos.telefono?.trim() &&
            datos.firma?.trim()
        );

    const completarDatosBasicos = (datos, cedulaUsuario) => {
        localStorage.setItem("usuarioNombre", datos.nombre || '');
        localStorage.setItem("usuarioCedula", cedulaUsuario);
        localStorage.setItem("usuarioFoto", datos.fotoUrl || "");
        localStorage.setItem("usuarioProfesion", datos.profesion || "");
        localStorage.setItem("usuarioRol", datos.rol || "profesional");
        if (datos.pin) localStorage.setItem("usuarioPin", datos.pin);
    };

    const solicitarDatosCobro = (datos, cedulaUsuario) => {
        setPerfilPendiente({ cedula: cedulaUsuario });
        setDatosCobro({
            banco: datos.banco || '',
            numeroCuenta: datos.numeroCuenta || '',
            ciudad: datos.ciudad || '',
            telefono: datos.telefono || ''
        });
        setMensaje({ texto: '', tipo: '' });
    };

    const handleGuardarDatosCobro = async (e) => {
        e.preventDefault();
        if (!perfilPendiente || guardandoDatosCobro) return;

        if (!firmaRef.current || firmaRef.current.isEmpty()) {
            setMensaje({ texto: 'Agrega tu firma antes de guardar.', tipo: 'error' });
            return;
        }

        const firma = obtenerFirmaRecortada(firmaRef.current.getCanvas());
        const datosActualizados = { ...datosCobro, firma };
        if (!tieneDatosCobroCompletos(datosActualizados)) {
            setMensaje({ texto: 'Completa todos los datos para continuar.', tipo: 'error' });
            return;
        }

        try {
            setGuardandoDatosCobro(true);
            await updateDoc(doc(db, 'autorizados', perfilPendiente.cedula), {
                ...datosActualizados,
                datosCobroCompletos: true
            });

            localStorage.setItem('usuarioDatosCobroCompletos', 'true');
            setPerfilPendiente(null);
            iniciarSesion();
        } catch (error) {
            console.error('Error al guardar los datos de cuenta de cobro:', error);
            setMensaje({
                texto: 'No se pudieron guardar tus datos. Verifica tu conexión e inténtalo de nuevo.',
                tipo: 'error'
            });
        } finally {
            setGuardandoDatosCobro(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cedulaTrimmed = cedula.trim();
        const pinTrimmed = pin.trim();
        const cedulaLocal = localStorage.getItem("usuarioCedula");
        const pinLocal = localStorage.getItem("usuarioPin");
        const nombreLocal = localStorage.getItem("usuarioNombre");


        if (!cedulaTrimmed) {
            setMensaje({ texto: "Por favor ingresa número de documento", tipo: "error" });
            return;
        }

        if (!pinTrimmed) {
            setMensaje({ texto: "Por favor ingresa tu PIN de acceso", tipo: "error" });
            return;
        }

        try {
            if (navigator.onLine) {
                const docRef = doc(db, "autorizados", cedulaTrimmed);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const datos = docSnap.data();

                    // Validar PIN si el usuario registrado tiene un PIN asignado
                    if (datos.pin && datos.pin !== pinTrimmed) {
                        setMensaje({ texto: "PIN incorrecto", tipo: "error" });
                        return;
                    }

                    completarDatosBasicos(datos, cedulaTrimmed);
                    localStorage.setItem('usuarioDatosCobroCompletos', 'false');

                    if (datos.rol === 'profesional' && !tieneDatosCobroCompletos(datos)) {
                        solicitarDatosCobro(datos, cedulaTrimmed);
                        return;
                    }

                    localStorage.setItem('usuarioDatosCobroCompletos', tieneDatosCobroCompletos(datos) ? 'true' : 'false');
                    iniciarSesion();
                    return;
                } else {
                    setMensaje({ texto: "No estás autorizado en el sistema", tipo: "error" });
                    return;
                }
            } else {
                // Modo offline: verificar coincidencia local de cédula y PIN
                if (cedulaTrimmed === cedulaLocal) {
                    if (pinLocal && pinTrimmed !== pinLocal) {
                        setMensaje({ texto: "PIN incorrecto en modo offline", tipo: "error" });
                        return;
                    }
                    if (
                        localStorage.getItem('usuarioRol') === 'profesional' &&
                        localStorage.getItem('usuarioDatosCobroCompletos') !== 'true'
                    ) {
                        setMensaje({
                            texto: 'Conéctate a internet para completar tus datos de cuenta de cobro.',
                            tipo: 'warning'
                        });
                        return;
                    }
                    iniciarSesion();
                    return;
                } else {
                    throw new Error("Offline y usuario no coincide");
                }
            }

        } catch (error) {
            console.error("Error detallado:", error);

            if (cedulaTrimmed === cedulaLocal && nombreLocal) {
                if (pinLocal && pinTrimmed !== pinLocal) {
                    setMensaje({ texto: "PIN incorrecto", tipo: "error" });
                    return;
                }
                if (
                    localStorage.getItem('usuarioRol') === 'profesional' &&
                    localStorage.getItem('usuarioDatosCobroCompletos') !== 'true'
                ) {
                    setMensaje({
                        texto: 'Conéctate a internet para completar tus datos de cuenta de cobro.',
                        tipo: 'warning'
                    });
                    return;
                }
                iniciarSesion();
            } else {
                setMensaje({ texto: "Error de conexión. Verifica tu internet.", tipo: "warning" });
            }
        }
    };

    return (
        <div className="login-container">
            {perfilPendiente ? (
                <form className="login-form account-details-form" onSubmit={handleGuardarDatosCobro}>
                    <h1 className="login-title">Formulario para cuenta de cobro</h1>
                    <p className="account-details-description">
                        Completa estos datos una sola vez. Se usarán para generar tus cuentas de cobro.
                    </p>

                    <div className="form-group">
                        <label htmlFor="account-bank">Banco o entidad financiera</label>
                        <input
                            id="account-bank"
                            type="text"
                            value={datosCobro.banco}
                            onChange={e => setDatosCobro(prev => ({ ...prev, banco: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="account-number">Número de cuenta</label>
                        <input
                            id="account-number"
                            type="text"
                            inputMode="numeric"
                            value={datosCobro.numeroCuenta}
                            onChange={e => setDatosCobro(prev => ({ ...prev, numeroCuenta: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="account-city">Ciudad</label>
                        <input
                            id="account-city"
                            type="text"
                            autoComplete="address-level2"
                            value={datosCobro.ciudad}
                            onChange={e => setDatosCobro(prev => ({ ...prev, ciudad: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="account-phone">Teléfono</label>
                        <input
                            id="account-phone"
                            type="tel"
                            autoComplete="tel"
                            value={datosCobro.telefono}
                            onChange={e => setDatosCobro(prev => ({ ...prev, telefono: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="account-signature">Firma del profesional</label>
                        <div className="account-signature-container">
                            <SignatureCanvas
                                ref={firmaRef}
                                penColor="#111827"
                                canvasProps={{
                                    id: 'account-signature',
                                    className: 'account-signature-canvas',
                                    'aria-label': 'Dibuja tu firma'
                                }}
                            />
                        </div>
                        <span className="account-signature-hint">
                            Firma dentro del recuadro con el dedo o el mouse.
                        </span>
                        <button
                            type="button"
                            className="account-signature-clear"
                            onClick={() => firmaRef.current?.clear()}
                        >
                            Borrar firma
                        </button>
                    </div>

                    {mensaje.texto && (
                        <p className={`login-message ${mensaje.tipo}`} role="alert">
                            {mensaje.texto}
                        </p>
                    )}

                    <button type="submit" className="btn-primary" disabled={guardandoDatosCobro}>
                        {guardandoDatosCobro ? 'Guardando...' : 'Guardar y continuar'}
                    </button>
                </form>
            ) : (
            <form className="login-form" onSubmit={handleSubmit}>
                <h1 className="login-title">Iniciar Sesión</h1>

                <div className="form-group">
                    <label htmlFor="id">Número de Documento</label>
                    <input
                        type="text"
                        id="id"
                        name="id"
                        autoComplete="on"
                        placeholder="Ingresa tu documento"
                        inputMode="numeric"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="pin">PIN de Acceso</label>
                    <input
                        type="password"
                        id="pin"
                        name="pin"
                        autoComplete="current-password"
                        placeholder="Ingresa tu PIN (4-6 dígitos)"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        required
                    />
                </div>

                {mensaje.texto && (
                    <p className={`login-message ${mensaje.tipo}`}>
                        {mensaje.texto}
                    </p>
                )}

                <button type="submit" className="btn-primary">
                    Entrar
                </button>
            </form>
            )}
        </div>
    );
}

export default Login;