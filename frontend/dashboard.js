import { db } from './firebaseConfig.js';
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

const cedula = localStorage.getItem("usuarioCedula");


if (!cedula) {
    window.location.href = "index.html"; // Si no hay cédula, regresa al login
} else {
    const db = getFirestore(app);
    const docRef = doc(db, "autorizados", cedula);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const datos = docSnap.data();
        // Ahora sí, estos elementos existen en dashboard.html
        document.getElementById('displayNombre').innerText = datos.nombre;
        document.getElementById('displayCedula').innerText = cedula;
    }
}

async function verificarEstadoUsuario() {
    if (navigator.onLine && cedula) {
        try {
            const docRef = doc(db, "autorizados", cedula);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                alert("Conexión restaurada. Datos actualizados.");
                localStorage.clear();
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error("Error al verificar el estado del usuario:", error);
        }
    }
}

verificarEstadoUsuario();
