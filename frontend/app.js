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
    const cedula = document.getElementById('documentoInput').value;
    const mensaje = document.getElementById('mensaje');

    
    
    if (!cedula) return alert("Por favor ingresa un número de documento");

    try {
        const docRef = doc(db, "autorizados", cedula);
        const docSnap = await getDoc(docRef);

        // Dentro de tu app.js, en el evento del botón de entrar
        if (docSnap.exists()) {
        const datos = docSnap.data();
        localStorage.setItem("usuarioNombre", datos.nombre);
        localStorage.setItem("usuarioCedula", cedula);
        localStorage.setItem("usuarioFoto", datos.fotoUrl); // Guardamos el texto de la foto
        window.location.href = "dashboard.html";
    
    } else {
        mensaje.textContent = "No estás autorizado";
        mensaje.style.color = "red";
    }

    } catch (error) {
        console.error("Error detallado:", error);
        alert("Ocurrió un error al consultar los datos.");
    }
});