// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCe_gy0izMEP21s0MB1U2PorT3fmnZsxCE",
  authDomain: "carnet-9e498.firebaseapp.com",
  projectId: "carnet-9e498",
  storageBucket: "carnet-9e498.firebasestorage.app",
  messagingSenderId: "199453995706",
  appId: "1:199453995706:web:8eae4976cc2c4530b4c883",
  measurementId: "G-KGTDX2LMR7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase inicializado correctamente");

document.getElementById('btnGuardar').addEventListener('click', async () => {
    // --- LÓGICA DE RESPALDO OFFLINE ---
    const cedulaLocal = localStorage.getItem("usuarioCedula");
    const nombreLocal = localStorage.getItem("usuarioNombre");

    const cedula = document.getElementById('documentoInput').value.trim();
    const mensaje = document.getElementById('mensaje');

    if (!cedula) return alert("Por favor ingresa un número de documento");


    try {
        // Intentar consultar a Firebase solo si hay internet
        if (navigator.onLine) {
            const docRef = doc(db, "autorizados", cedula);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const datos = docSnap.data();
                
                // Guardamos/Actualizamos los datos locales para la próxima vez
                localStorage.setItem("usuarioNombre", datos.nombre);
                localStorage.setItem("usuarioCedula", cedula);
                localStorage.setItem("usuarioFoto", datos.fotoUrl || ""); 
                
                window.location.href = "dashboard.html"; //
                return; // Salimos de la función
            } else {
                mensaje.textContent = "No estás autorizado en el sistema";
                mensaje.style.color = "red";
                return;
            }
        } else {
            // SI NO HAY INTERNET: Verificar si es el usuario guardado
            if (cedula === cedulaLocal) {
                window.location.href = "dashboard.html";
                return;
            } else {
                throw new Error("Offline y usuario no coincide");
            }
        }

    } catch (error) {
        console.error("Error detallado:", error);
        
        // Si hay un error (como falta de internet) pero la cédula coincide con la local
        if (cedula === cedulaLocal && nombreLocal) {
            console.log("Entrando en modo offline por error de red");
            window.location.href = "dashboard.html";
        } else {
            mensaje.textContent = "Error de conexión. Verifica tu internet.";
            mensaje.style.color = "orange";
        }
    }
});