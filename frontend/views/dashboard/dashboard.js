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

const cedula = localStorage.getItem("usuarioCedula");
const nombreGuardado = localStorage.getItem("usuarioNombre");


if (!cedula) {
    window.location.href = "/frontend/index.html"; // Si no hay cédula, regresa al login
} else {

    document.getElementById('displayCedula').innerText = cedula;
    document.getElementById('displayNombre').innerText = nombreGuardado || "Cargando...";

    validarAcceso();
    verificarAdmin();
    init();

}

async function validarAcceso() {
    if (navigator.onLine) {
        try {
            const docRef = doc(db, "autorizados", cedula);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Acceso denegado. Usuario no autorizado.");
                cerrarSesion();
            } else {
                const datosNuevos = docSnap.data();
                document.getElementById('displayNombre').innerText = datosNuevos.nombre;
                localStorage.setItem("usuarioNombre", datosNuevos.nombre);
            }
        } catch (error) {
            console.error("Error al validar acceso:", error);
            alert("Error al validar acceso.");
            cerrarSesion();
        }
    }
}

async function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/frontend/index.html";
}

async function verificarAdmin() {
    if (cedula === "1028862517" || cedula === "1073519428") {

        const ctrlAdmin = document.createElement('a');
        ctrlAdmin.textContent = "Ir a Panel Admin";
        ctrlAdmin.style.cursor = "pointer";
        ctrlAdmin.addEventListener('click', () => {
            window.location.href = "../admin/admin.html";
        });

        const btnAdminContainer = document.getElementById('options');
        btnAdminContainer.appendChild(ctrlAdmin);
        }
}

async function init() {
    const CerrarSesionBtn = document.createElement('a');
        CerrarSesionBtn.textContent = "Cerrar Sesión";
        CerrarSesionBtn.style.cursor = "pointer";
        CerrarSesionBtn.style.color = "#e74c3c";
        CerrarSesionBtn.addEventListener('click', () => {
            cerrarSesion();
        });

        const btnCerrarSesionContainer = document.getElementById('options');
        btnCerrarSesionContainer.appendChild(CerrarSesionBtn);
}

verificarAdmin();
init();
