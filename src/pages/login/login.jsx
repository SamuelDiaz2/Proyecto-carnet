import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebaseConfig';
import { doc, getDoc } from "firebase/firestore";
import './login.css';

function Login() {
    const navigate = useNavigate();
    const [cedula, setCedula] = useState('');
    const [pin, setPin] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

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

                    // Guardar los datos locales para soporte offline posterior
                    localStorage.setItem("usuarioNombre", datos.nombre);
                    localStorage.setItem("usuarioCedula", cedulaTrimmed);
                    localStorage.setItem("usuarioFoto", datos.fotoUrl || "");
                    localStorage.setItem("usuarioProfesion", datos.profesion || "");
                    localStorage.setItem("offline", "false");
                    if (datos.pin) {
                        localStorage.setItem("usuarioPin", datos.pin);
                    }


                    navigate('/carnet');
                    return;
                } else {
                    setMensaje({ texto: "No estás autorizado en el sistema", tipo: "error" });
                    return;
                }
            } else {
                // Modo offline: verificar coincidencia local de cédula y PIN
                localStorage.setItem("offline", "true")

                if (cedulaTrimmed === cedulaLocal) {
                    if (pinLocal && pinTrimmed !== pinLocal) {
                        setMensaje({ texto: "PIN incorrecto en modo offline", tipo: "error" });
                        return;
                    }
                    navigate('/carnet');
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
                navigate('/carnet');
            } else {
                setMensaje({ texto: "Error de conexión. Verifica tu internet.", tipo: "warning" });
            }
        }
    };

    return (
        <div className="login-container">
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
        </div>
    );
}

export default Login;