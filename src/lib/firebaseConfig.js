import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Estos datos te los proporciona la consola de Firebase al crear el proyecto web
const firebaseConfig = {
    apiKey: "AIzaSyCe_gy0izMEP21s0MB1U2PorT3fmnZsxCE",
    authDomain: "carnet-9e498.firebaseapp.com",
    projectId: "carnet-9e498",
    storageBucket: "carnet-9e498.firebasestorage.app",
    messagingSenderId: "199453995706",
    appId: "1:199453995706:web:8eae4976cc2c4530b4c883",
    measurementId: "G-KGTDX2LMR7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usaremos en los componentes
export const auth = getAuth(app);
export const db = getFirestore(app);