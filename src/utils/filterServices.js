/**
 * Utilidades para normalizar y filtrar citas según la profesión del profesional.
 */

export const normalizarTexto = (texto) =>
    (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

/**
 * Verifica si un servicio de cita médica corresponde a la profesión del profesional.
 * 
 * @param {Object} cita - Objeto con datos de la cita (servicio, especialidad, etc.)
 * @param {string} profesionUsuario - Profesión del usuario registrado (ej. "Psicología", "Fonoaudiología", etc.)
 * @returns {boolean}
 */
export const coincideProfesionCita = (cita, profesionUsuario) => {
    if (!profesionUsuario || profesionUsuario === 'todos') return true;

    const textoServicio = normalizarTexto(
        cita?.servicio || cita?.especialidad || cita?.profesion || ""
    );
    const textoProfesion = normalizarTexto(profesionUsuario);

    if (!textoServicio) return false;

    // Coincidencia directa
    if (textoServicio.includes(textoProfesion) || textoProfesion.includes(textoServicio)) {
        return true;
    }

    // 1. Psicología
    if (textoProfesion.includes("psicolog") && textoServicio.includes("psicolog")) {
        return true;
    }

    // 2. Fonoaudiología
    if (textoProfesion.includes("fonoaudiolog") && (textoServicio.includes("fonoaudiolog") || textoServicio.includes("fono"))) {
        return true;
    }

    // 3. Terapia Ocupacional
    if (textoProfesion.includes("ocupacional") && textoServicio.includes("ocupacional")) {
        return true;
    }

    // 4. Terapia Respiratoria
    if (textoProfesion.includes("respiratori") && textoServicio.includes("respiratori")) {
        return true;
    }

    // 5. Fisioterapia / Terapia Física
    const esProfFisio = textoProfesion.includes("fisio") || textoProfesion.includes("fisica");
    const esServFisio = textoServicio.includes("fisio") || textoServicio.includes("fisica");
    if (esProfFisio && esServFisio) {
        return true;
    }

    return false;
};

export const LISTA_PROFESIONES = [
    "Psicología",
    "Fonoaudiología",
    "Fisioterapia con terapia respiratoria",
    "Fisioterapia con terapia ocupacional",
    "Terapia ocupacional"
];
