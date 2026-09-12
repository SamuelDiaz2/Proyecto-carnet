import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../lib/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

import { BadgePreview } from '../../components/badgepreview/badgepreview';
import { UserForm } from '../../components/formulario/formulario';
import { UserTable } from '../../components/tablausuarios/tablausuarios';
import { compressImage } from '../../utils/imageCompressor';
import './profesional.css';

function Professional() {
    const navigate = useNavigate();
    const [usuarioLogueado, setUsuarioLogueado] = useState(false);
    const [emailAuth, setEmailAuth] = useState('');
    const [passAuth, setPassAuth] = useState('');
    const [mensajeLogin, setMensajeLogin] = useState({ texto: '', color: '' });

    const [usuarios, setUsuarios] = useState([]);
    const [cedula, setCedula] = useState('');
    const [nombre, setNombre] = useState('');
    const [pin, setPin] = useState('');
    const [profesion, setProfesion] = useState('');
    const [fotoBase64, setFotoBase64] = useState('');
    const [mensajeGuardar, setMensajeGuardar] = useState({ texto: '', color: '' });
    const [confirmarEliminar, setConfirmarEliminar] = useState({ visible: false, id: null, nombre: '' });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setUsuarioLogueado(!!user);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!usuarioLogueado) return;
        const q = query(collection(db, "autorizados"), orderBy("fecha", "desc"), limit(50));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
            const lista = [];
            snapshot.forEach((docSnap) => {
                lista.push({ id: docSnap.id, ...docSnap.data() });
            });
            setUsuarios(lista);
        });
        return () => unsubscribeSnapshot();
    }, [usuarioLogueado]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, emailAuth, passAuth);
        } catch {
            setMensajeLogin({ texto: "Correo o contraseña incorrectos", color: "#ef4444" });
        }
    };

    const handleCambioFoto = async (e) => {
        const archivo = e.target.files[0];
        if (archivo) {
            try {
                // Comprime la imagen automáticamente para móviles a <50KB
                const compressed = await compressImage(archivo, 450, 450, 0.75);
                setFotoBase64(compressed);
            } catch (err) {
                console.error("Error al procesar la foto:", err);
            }
        }
    };

    const handleGuardarUsuario = async (e) => {
        e.preventDefault();
        if (!cedula.trim() || !nombre.trim() || !pin.trim() || !profesion.trim()) {
            setMensajeGuardar({ texto: "Todos los campos obligatorios (*) deben completarse", color: "#ef4444" });
            return;
        }

        try {
            await setDoc(doc(db, "autorizados", cedula.trim()), {
                nombre: nombre.trim(),
                cedula: cedula.trim(),
                pin: pin.trim(),
                profesion: profesion.trim(),
                rol: "profesional",
                fotoUrl: fotoBase64 || "",
                fecha: new Date()
            });
            setMensajeGuardar({ texto: "¡Profesional guardado con éxito!", color: "#10b981" });
            setTimeout(() => {
                setCedula(''); 
                setNombre(''); 
                setPin('');
                setProfesion('');
                setFotoBase64('');
                setMensajeGuardar({ texto: '', color: '' });
                const fileInput = document.getElementById('carnet-file');
                if (fileInput) fileInput.value = "";
            }, 2000);
        } catch (error) {
            console.error("Error al guardar profesional:", error);
            setMensajeGuardar({ texto: "Error al guardar el usuario", color: "#ef4444" });
        }
    };

    const ejecutarEliminacion = async () => {
        try {
            await deleteDoc(doc(db, "autorizados", confirmarEliminar.id));
            setConfirmarEliminar({ visible: false, id: null, nombre: '' });
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    };

    if (!usuarioLogueado) {
        return (
            <div className="login-panel-wrapper">
                <div className="admin-card-section login-box">
                    <h2>Ingreso Administrativo</h2>
                    <form onSubmit={handleLogin} className="admin-form">
                        <div className="admin-form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" value={emailAuth} onChange={(e) => setEmailAuth(e.target.value)} required />
                        </div>
                        <div className="admin-form-group">
                            <label>Contraseña</label>
                            <input type="password" value={passAuth} onChange={(e) => setPassAuth(e.target.value)} required />
                        </div>
                        {mensajeLogin.texto && <p style={{ color: mensajeLogin.color }}>{mensajeLogin.texto}</p>}
                        <button type="submit" className="btn-admin-submit">Iniciar Sesión</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="professional-mobile-layout">
            <header className="professional-header">
                <button onClick={() => navigate('/carnet')} className="btn-back-top" aria-label="Volver al Carnet">
                    ← Volver
                </button>
                <div>
                    <h1>Panel de Control</h1>
                    <p>Gestión interna de profesionales</p>
                </div>
                <button onClick={() => signOut(auth)} className="btn-logout-top" aria-label="Cerrar Sesión">
                    Salir
                </button>
            </header>

            <main className="professional-content-stream">
                <section className="admin-card-section">
                    <h2>1. Registrar Profesional</h2>
                    <UserForm
                        cedula={cedula} setCedula={setCedula}
                        nombre={nombre} setNombre={setNombre}
                        pin={pin} setPin={setPin}
                        profesion={profesion} setProfesion={setProfesion}
                        onFotoChange={handleCambioFoto}
                        onSubmit={handleGuardarUsuario}
                        mensaje={mensajeGuardar}
                    />
                </section>

                <section className="admin-card-section centered-flex">
                    <h2>2. Vista Previa en Vivo</h2>
                    <BadgePreview nombre={nombre} cedula={cedula} profesion={profesion} fotoBase64={fotoBase64} />
                </section>

                <section className="admin-card-section">
                    <h2>3. Profesionales Registrados</h2>
                    <UserTable
                        usuarios={usuarios}
                        confirmarEliminar={confirmarEliminar}
                        setConfirmarEliminar={setConfirmarEliminar}
                        ejecutarEliminacion={ejecutarEliminacion}
                        onEliminarClick={(id, nom) => setConfirmarEliminar({ visible: true, id, nombre: nom })}
                    />
                </section>
            </main>
        </div>
    );
}

export default Professional;