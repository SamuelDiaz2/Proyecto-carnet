import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Ya no importamos 'getStorage' ni funciones de storage

const firebaseConfig = {
    apiKey: "AIzaSyCe_gy0izMEP21s0MB1U2PorT3fmnZsxCE",
    authDomain: "carnet-9e498.firebaseapp.com",
    projectId: "carnet-9e498",
    storageBucket: "carnet-9e498.firebasestorage.app",
    messagingSenderId: "199453995706",
    appId: "1:199453995706:web:8eae4976cc2c4530b4c883",
    measurementId: "G-KGTDX2LMR7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const sectionLogin = document.getElementById('section-login');
const sectionAdmin = document.getElementById('section-admin');

// --- LOGIN Y OBSERVADOR ---
document.getElementById('btnLoginAdmin').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('mensaje').textContent = "Bienvenido";
        document.getElementById('mensaje').style.color = "green";
    } catch (error) {
        document.getElementById('mensaje').textContent = "Correo o contraseña incorrectos";
        document.getElementById('mensaje').style.color = "red";
    }
});

document.getElementById('btnLogoutAdmin').addEventListener('click', () => {
    signOut(auth);
});

document.getElementById('btnDashboard').addEventListener('click', () => {
    window.location.href = "/frontend/views/dashboard/dashboard.html";
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        sectionLogin.style.display = "none";
        sectionAdmin.style.display = "block"; // Cambiado a block para evitar problemas de layout
        cargarListaUsuarios();
    } else {
        sectionLogin.style.display = "block";
        sectionAdmin.style.display = "none";
    }
});

// --- VISTA PREVIA (Solo texto) ---
document.getElementById('newNombre').addEventListener('input', (e) => {
    const previewNombre = document.getElementById('displayNombre');
    if(previewNombre) previewNombre.innerText = e.target.value || "Nombre Completo";
});

document.getElementById('newCedula').addEventListener('input', (e) => {
    const previewCedula = document.getElementById('displayCedula');
    if(previewCedula) previewCedula.innerText = e.target.value || "0000000000";
});

document.getElementById('carnet').addEventListener('change', async function() {
    const archivo = this.files[0];
    const preview = document.getElementById('previewFoto');

    if (archivo) {
        try {
            const fotoTexto = await toBase64(archivo);

            preview.src = fotoTexto;

            console.log("Vista previa cargada con éxito");
        } catch (error) {
            console.error("Error al cargar la vista previa:", error);
        }
    }
})

// --- FUNCIONES DE GESTIÓN (SIN STORAGE) ---
function mensaje(texto, color) {
    const mensajeElem = document.getElementById('mensajeGuardar');
    if (mensajeElem) {
        mensajeElem.textContent = texto;
        mensajeElem.style.color = color;
        mensajeElem.style.fontWeight = "bold";
    }
}


const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader(); // Objeto nativo del navegador
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

document.getElementById('btnGuardar').addEventListener('click', async () => {
    const cedula = document.getElementById('newCedula').value;
    const nombre = document.getElementById('newNombre').value;
    const archivo = document.getElementById('carnet').files[0];

    if (!cedula || !nombre) return mensaje("Falta Cedula o Nombre", "red");

    try {
        // CORRECCIÓN: Declaramos la variable fuera del IF
        let fotoParaGuardar = ""; 

        if (archivo) {
            // Esperamos a que la función convierta la imagen
            fotoParaGuardar = await toBase64(archivo);
        }

        // GUARDAMOS EN FIRESTORE
        await setDoc(doc(db, "autorizados", cedula), {
            nombre: nombre,
            cedula: cedula,
            fotoUrl: fotoParaGuardar, // Ahora sí llevará el texto largo data:image/...
            fecha: new Date()
        });

        console.log("¡Usuario registrado con foto! ✅");

        mensaje("Usuario " + nombre + " guardado correctamente", "green");

        setTimeout(() => {
            document.getElementById('newCedula').value = "";
            document.getElementById('newNombre').value = "";
            document.getElementById('carnet').value = "";
            document.getElementById('previewFoto').src = "./imagenes/usuario.png";
            document.getElementById('displayNombre').innerText = "Nombre Completo";
            document.getElementById('displayCedula').innerText = "0000000000";
            mensaje("", "black");
        }, 3000);
    } catch (error) {
        console.error("Error al guardar:", error);
    }

});

// --- CARGAR LISTA ---
function cargarListaUsuarios() {
    // 1. Consulta ordenada por fecha (descendente para ver los nuevos arriba)
    const q = query(collection(db, "autorizados"), orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById('listaUsuarios');
        if (!lista) return;
        lista.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const u = docSnap.data();
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${docSnap.id}</td>
                <td>${u.nombre}</td>
                <td>
                    <button class="btn-eliminar"
                    data-id="${docSnap.id}" 
                    data-nombre="${u.nombre}"
                    style="background:red; color:white; border:none; padding:5px; cursor:pointer; border-radius:3px;">
                        Borrar
                    </button>
                </td>
            `;
            lista.appendChild(row);
        });
    });
}

// Delegación de eventos para el botón eliminar
let idParaEliminar = null;

document.addEventListener('click', async (e) => {
    const divConfirmar = document.getElementById('confirmar');

    // 1. Al hacer clic en el botón rojo de la tabla
    if (e.target.classList.contains('btn-eliminar')) {
        idParaEliminar = e.target.getAttribute('data-id');
        const nombre = e.target.getAttribute('data-nombre');
        
        divConfirmar.style.display = 'block'; // Asegúrate de mostrar el div
        divConfirmar.innerHTML = `
            <div style="background:white; padding:15px; border:1px solid #ccc; border-radius:10px; margin-top:10px;">
                <p>¿Confirmar eliminación de <strong>${nombre}</strong>?</p>
                <button id="confirmarSi" style="background:red; color:white; border:none; padding:10px; cursor:pointer; border-radius:3px;">Sí, eliminar</button> 
                <button id="confirmarNo" style="background:gray; color:white; border:none; padding:10px; cursor:pointer; border-radius:3px;">Cancelar</button>
            </div>`;
    }

    // 2. Al hacer clic en "Sí" (Confirmar)
    if (e.target.id === 'confirmarSi') {
        if (!idParaEliminar) return;

        try {
            await deleteDoc(doc(db, "autorizados", idParaEliminar));
            mensaje("Usuario eliminado con éxito", "green");
            divConfirmar.innerHTML = ""; // Limpia el mensaje
            divConfirmar.style.display = 'none';
            console.log("Usuario eliminado con éxito"); // O tu función mensaje()
        } catch (error) {
            mensaje("Error al eliminar usuario " + nombre, "red");
            console.error("Error al eliminar:", error);;
        }

        idParaEliminar = null; // Reiniciamos la variable
    }

    // 3. Al hacer clic en "No" (Cancelar)
    if (e.target.id === 'confirmarNo') {
        divConfirmar.innerHTML = "";
        divConfirmar.style.display = 'none';
        idParaEliminar = null;
    }
});