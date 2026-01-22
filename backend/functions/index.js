const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Esta función se ejecutará en us-south1 (Texas)
exports.validarUsuario = functions.region("us-south1").https.onCall(async (data, context) => {
    const { documento, password } = data;

    try {
        // Buscamos el documento en la colección 'usuarios'
        const userRef = admin.firestore().collection("usuarios").doc(documento);
        const doc = await userRef.get();

        if (!doc.exists) {
            throw new functions.https.HttpsError("not-found", "Usuario no registrado");
        }

        const userData = doc.data();

        // Verificamos la contraseña (esto es una prueba simple)
        if (userData.password === password) {
            // Creamos el token usando el número de documento como UID
            const customToken = await admin.auth().createCustomToken(documento);
            return { token: customToken };
        } else {
            throw new functions.https.HttpsError("unauthenticated", "Contraseña incorrecta");
        }
    } catch (error) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});