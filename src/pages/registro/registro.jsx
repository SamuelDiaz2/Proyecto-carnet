import { supabase } from '../../lib/supabaseClient';
import { useState } from 'react';
import './registro.css';
import emailjs from '@emailjs/browser';
import SideMenu from '../../components/side-menu/side-menu.jsx';

function Registro() {
    const [paso, setPaso] = useState(1); // Paso actual (1, 2 o 3)

    const [menuAbierto, setMenuAbierto] = useState(false);

    // Estado del formulario
    const [nombre, setNombre] = useState('');
    const [identificacion, setIdentificacion] = useState('C.C');
    const [numeroIdentificacion, setNumeroIdentificacion] = useState('');
    const [edad, setEdad] = useState('');
    const [diagnostico, setDiagnostico] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [barrioLocalidad, setBarrioLocalidad] = useState('');
    const [municipioCiudad, setMunicipioCiudad] = useState('');
    const [email, setEmail] = useState('');
    const [nombreAcudiente, setNombreAcudiente] = useState('');
    const [password, setPassword] = useState('');
    const [servicio, setServicio] = useState('Terapia Fisica');
    const [modalidad, setModalidad] = useState('30 minutos');


    const handleNext = (e) => {
        e.preventDefault();
        setPaso((prev) => Math.min(prev + 1, 3));
    };

    const handlePrev = () => {
        setPaso((prev) => Math.max(prev - 1, 1));
    };

    const handleSignUp = async (e) => {
        e.preventDefault();

        try {
            // 1. Registro en Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nombre_completo: nombre,
                        identificacion: identificacion,
                        numero_identificacion: numeroIdentificacion,
                        edad: edad,
                        diagnostico: diagnostico,
                        telefono: telefono,
                        direccion: direccion,
                        barrio_localidad: barrioLocalidad,
                        municipio_ciudad: municipioCiudad,
                        nombre_acudiente: nombreAcudiente,
                        servicio: servicio,
                        modalidad: modalidad
                    }
                }
            });

            if (error) throw error;
            console.log("Usuario creado en Supabase:", data);

            // 2. Parámetros para EmailJS
            const templateParams = {
                nombre_paciente: nombre,
                correo_usuario: email,
                password_usuario: password,
                servicio_solicitado: servicio,
                modalidad: modalidad,
                documento: `${identificacion} ${numeroIdentificacion}`,
                telefono: telefono,
                direccion: direccion,
                municipio: municipioCiudad
            };

            // 3. Envío de EmailJS
            const emailRes = await emailjs.send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                templateParams,
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            );

            console.log("cuenta creada con exito");
            window.location.href = '/carnet';
        } catch (err) {
            console.error("Error en el proceso:", err);
            window.location.href = '/registro';
        }
    };

    return (
        <div className="register-container">

            {/* Botón hamburguesa */}
            <button className="hamburger-btn" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
                {menuAbierto ? '✕' : '☰'}
            </button>

            {/* Menú lateral */}
            <div className={`sidebar-wrapper ${menuAbierto ? 'abierto' : ''}`}>
                <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>
                <SideMenu />
            </div>

            <div className="login-form">
                <h2 className="form-title">Crear Paciente</h2>

                {/* Indicador de Progreso */}
                <div className="stepper-header">
                    <div className={`step-dot ${paso >= 1 ? 'active' : ''}`}>1</div>
                    <div className={`step-line ${paso >= 2 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${paso >= 2 ? 'active' : ''}`}>2</div>
                    <div className={`step-line ${paso >= 3 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${paso >= 3 ? 'active' : ''}`}>3</div>
                </div>

                <p className="step-title">
                    {paso === 1 && "1. Datos Personales del Paciente"}
                    {paso === 2 && "2. Ubicación y Servicio"}
                    {paso === 3 && "3. Credenciales de Acceso"}
                </p>

                {/* FORMULARIO STEP 1: Datos Personales */}
                {paso === 1 && (
                    <form onSubmit={handleNext} className="step-content">
                        <input
                            type="text"
                            placeholder="Nombre Completo"
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                        <div className="input-group-row">
                            <select
                                value={identificacion}
                                onChange={(e) => setIdentificacion(e.target.value)}
                                className="select-pill"
                            >
                                <option value="C.C">C.C</option>
                                <option value="T.I">T.I</option>
                                <option value="C.E">C.E</option>
                                <option value="R.C">R.C</option>
                            </select>
                            <input
                                type="tel"
                                inputMode="numeric"
                                placeholder="N° Documento"
                                required
                                value={numeroIdentificacion}
                                onChange={(e) => setNumeroIdentificacion(e.target.value)}
                            />
                        </div>
                        <div className="input-group-row">
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Edad"
                                required
                                value={edad}
                                onChange={(e) => setEdad(e.target.value)}
                            />
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="Teléfono"
                                required
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Diagnóstico"
                            required
                            value={diagnostico}
                            onChange={(e) => setDiagnostico(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Nombre Acudiente / Familiar"
                            value={nombreAcudiente}
                            onChange={(e) => setNombreAcudiente(e.target.value)}
                        />

                        <button type="submit" className="btn-registro">Siguiente</button>
                    </form>
                )}

                {/* FORMULARIO STEP 2: Ubicación y Servicio */}
                {paso === 2 && (
                    <form onSubmit={handleNext} className="step-content">
                        <input
                            type="text"
                            placeholder="Dirección de residencia"
                            required
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Barrio o Localidad"
                            required
                            value={barrioLocalidad}
                            onChange={(e) => setBarrioLocalidad(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Municipio o Ciudad"
                            required
                            value={municipioCiudad}
                            onChange={(e) => setMunicipioCiudad(e.target.value)}
                        />

                        <label className="input-label">Servicio Requerido:</label>
                        <select value={servicio} onChange={(e) => setServicio(e.target.value)} className="select-pill">
                            <option value="Psicologia">Psicología</option>
                            <option value="Hidroterapia">Hidroterapia</option>
                            <option value="Terapia Fisica">Terapia Física</option>
                            <option value="Terapia Respiratoria">Terapia Respiratoria</option>
                            <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                            <option value="Terapia Fonoaudiologia">Terapia Fonoaudiología</option>
                        </select>

                        <label className="input-label">Duración de Sesión:</label>
                        <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="select-pill">
                            <option value="30-minutos">30 minutos</option>
                            <option value="50-minutos">50 minutos</option>
                        </select>

                        <div className="btn-group-row">
                            <button type="button" onClick={handlePrev} className="btn-secundario">Volver</button>
                            <button type="submit" className="btn-registro">Siguiente</button>
                        </div>
                    </form>
                )}

                {/* FORMULARIO STEP 3: Credenciales y Guardado */}
                {paso === 3 && (
                    <form onSubmit={handleSignUp} className="step-content">
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <div className="btn-group-row">
                            <button type="button" onClick={handlePrev} className="btn-secundario">Volver</button>
                            <button type="submit" className="btn-registro btn-exito">Completar Registro</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Registro;