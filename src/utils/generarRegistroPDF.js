import logoEmpresa from "../assets/logo.png"; // <-- Asegúrate de que tu archivo se llame .png
import fondoPDF from "../assets/logo.png";    // <-- Igual aquí
import { jsPDF } from "jspdf";

const cargarImagen = async (ruta) => {
    const respuesta = await fetch(ruta);
    const blob = await respuesta.blob();

    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onloadend = () => resolve(lector.result);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
    });
};

const normalizarTexto = (texto = "") => {
    return texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .trim();
};

const obtenerSecciones = (registro, datosEvaluacion, datosEvolucion) => {
    const profesion = normalizarTexto(
        registro.profesion_especialidad || "fonoaudiologia"
    );

    if (registro.tipo_registro === "evaluacion_inicial") {
        return (
            datosEvaluacion.servicio?.[profesion] ||
            datosEvaluacion.servicio?.fonoaudiologia ||
            []
        );
    }

    return (
        datosEvolucion.evoluciones?.[profesion] ||
        datosEvolucion.evoluciones?.observaciones_clinicas ||
        []
    );
};

const formatearFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";
    return new Date(fecha).toLocaleString("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
    });
};

export const generarHistorialPDF = async ({
    paciente,
    registros,
    datosEvaluacion,
    datosEvolucion,
}) => {
    const pdf = new jsPDF();

    // Paleta de Colores Corporativos
    const colorPrimario = [0, 86, 210];
    const colorTextoGris = [100, 116, 139];
    const colorTextoOscuro = [30, 41, 59];
    const colorFondoCard = [248, 250, 252];
    const colorBordeCard = [226, 232, 240];

    const aclararImagen = async (ruta, intensidad = 0.15) => {
        const respuesta = await fetch(ruta);
        const blob = await respuesta.blob();
        const imagen = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        const contexto = canvas.getContext("2d");

        canvas.width = imagen.width;
        canvas.height = imagen.height;
        contexto.drawImage(imagen, 0, 0);
        contexto.fillStyle = `rgba(255, 255, 255, ${1 - intensidad})`;
        contexto.fillRect(0, 0, canvas.width, canvas.height);

        return canvas.toDataURL("image/png");
    };

    const logoData = await cargarImagen(logoEmpresa);
    const fondoData = await aclararImagen(fondoPDF);

    const margen = 15;
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const anchoTexto = anchoPagina - margen * 2;

    let y = 50; // Bajamos un poco el inicio del contenido para el nuevo encabezado
    let numeroPagina = 1;

    const decorarPagina = () => {
        // 1. Franja de color superior (Acento corporativo)
        pdf.setFillColor(...colorPrimario);
        pdf.rect(0, 0, anchoPagina, 5, 'F');

        // 2. Fondo de agua centrado
        const sizeFondo = 130;
        const xFondo = (anchoPagina - sizeFondo) / 2;
        const yFondo = (altoPagina - sizeFondo) / 2.2;
        pdf.addImage(fondoData, "PNG", xFondo, yFondo, sizeFondo, sizeFondo);

        // 3. Logo con proporciones ajustadas (Formato PNG)
        // Ajustamos a 32x20 para que los bordes del logo se vean naturales
        pdf.addImage(logoData, "PNG", margen, 12, 32, 20);

        // Texto Encabezado Derecha
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.setTextColor(...colorPrimario);
        pdf.text("HISTORIAL CLÍNICO", anchoPagina - margen, 22, { align: "right" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...colorTextoGris);
        pdf.text("Documento Médico Oficial", anchoPagina - margen, 27, { align: "right" });

        // 4. Línea divisoria elegante debajo del encabezado
        pdf.setDrawColor(...colorBordeCard);
        pdf.setLineWidth(0.5);
        pdf.line(margen, 38, anchoPagina - margen, 38);

        // Número de página en el Footer
        pdf.setFontSize(9);
        pdf.text(`Página ${numeroPagina}`, anchoPagina - margen, altoPagina - 10, { align: "right" });
        numeroPagina++;
    };

    decorarPagina();

    const comprobarEspacio = (altura = 10) => {
        if (y + altura > altoPagina - margen - 15) {
            pdf.addPage();
            decorarPagina();
            y = 50;
        }
    };

    const agregarCampoFormulario = (label, valor) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...colorTextoGris);

        const lineasLabel = pdf.splitTextToSize(label.toUpperCase(), anchoTexto);
        const alturaLabel = lineasLabel.length * 4;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10.5);
        pdf.setTextColor(...colorTextoOscuro);

        const lineasValor = pdf.splitTextToSize(String(valor), anchoTexto);
        const alturaValor = lineasValor.length * 5;

        comprobarEspacio(alturaLabel + alturaValor + 8);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...colorTextoGris);
        pdf.text(lineasLabel, margen, y);
        y += alturaLabel + 1;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10.5);
        pdf.setTextColor(...colorTextoOscuro);
        pdf.text(lineasValor, margen, y);
        y += alturaValor + 6;
    };

    if (!paciente || !registros?.length) {
        throw new Error("No hay información suficiente para generar el historial.");
    }

    const registrosOrdenados = [...registros].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    // ==========================================
    // TARJETA DE INFORMACIÓN DEL PACIENTE
    // ==========================================
    pdf.setFillColor(...colorFondoCard);
    pdf.setDrawColor(...colorBordeCard);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margen, y, anchoTexto, 22, 3, 3, 'FD');

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...colorPrimario);
    pdf.text(`PACIENTE: ${paciente.nombre || "No disponible"}`, margen + 5, y + 8);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...colorTextoOscuro);
    pdf.text(`Identificación: ${paciente.identificacion || "No disponible"}`, margen + 5, y + 15);

    pdf.setFillColor(226, 232, 240);
    pdf.roundedRect(anchoPagina - margen - 32, y + 6, 26, 9, 4, 4, 'F');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...colorTextoOscuro);
    pdf.text(`${registros.length} Sesiones`, anchoPagina - margen - 19, y + 12.2, { align: "center" });

    y += 32;

    // ==========================================
    // CICLO DE REGISTROS 
    // ==========================================
    registrosOrdenados.forEach((registro, indice) => {
        const esEvaluacion = registro.tipo_registro === "evaluacion_inicial";
        const tituloRegistro = esEvaluacion ? "EVALUACIÓN INICIAL" : `EVOLUCIÓN DE SEGUIMIENTO #${indice}`;

        comprobarEspacio(30);

        // BANNER AZUL DE LA SESIÓN
        pdf.setFillColor(...colorPrimario);
        pdf.rect(margen, y, anchoTexto, 8, 'F');
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(tituloRegistro, margen + 3, y + 5.5);

        y += 13;

        // META-DATOS DEL PROFESIONAL
        pdf.setFontSize(9);
        const col1 = margen;
        const col2 = margen + (anchoTexto / 2);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colorTextoGris);
        pdf.text("Fecha:", col1, y);
        pdf.text("Profesional:", col2, y);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colorTextoOscuro);
        pdf.text(formatearFecha(registro.created_at), col1 + 12, y);
        pdf.text(registro.profesional_nombre || "No disponible", col2 + 20, y);

        y += 6;

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colorTextoGris);
        pdf.text("Especialidad:", col1, y);
        pdf.text("Reg. Médico:", col2, y);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colorTextoOscuro);
        pdf.text(registro.profesion_especialidad || "No disponible", col1 + 22, y);
        pdf.text(registro.profesional_cedula || "No disponible", col2 + 21, y);

        y += 12;

        const respuestas = registro.datos_formulario || {};
        const secciones = obtenerSecciones(registro, datosEvaluacion, datosEvolucion);

        secciones.forEach((seccion) => {
            const camposConRespuesta = (seccion.campos || []).filter(campo => {
                const r = respuestas[campo.id];
                return r !== undefined && r !== null && r !== "";
            });

            if (camposConRespuesta.length === 0) {
                return;
            }

            comprobarEspacio(15);

            y += 2;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(...colorPrimario);
            pdf.text(seccion.titulo.toUpperCase(), margen, y);

            y += 2;
            pdf.setDrawColor(...colorBordeCard);
            pdf.setLineWidth(0.5);
            pdf.line(margen, y, anchoPagina - margen, y);
            y += 7;

            camposConRespuesta.forEach((campo) => {
                agregarCampoFormulario(campo.label || campo.id, respuestas[campo.id]);
            });
        });

        // BLOQUE DE FIRMA DEL PACIENTE
        const firma = respuestas.firma_paciente;

        comprobarEspacio(50);
        y += 5;

        pdf.setFillColor(...colorFondoCard);
        pdf.setDrawColor(...colorBordeCard);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(margen, y, 90, 45, 3, 3, 'FD');

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...colorTextoGris);
        pdf.text("FIRMA DEL PACIENTE", margen + 5, y + 7);

        if (firma && firma.startsWith("data:image/")) {
            try {
                const formato = firma.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
                pdf.addImage(firma, formato, margen + 10, y + 10, 70, 30);
            } catch (error) {
                pdf.setFont("helvetica", "normal");
                pdf.text("No fue posible cargar la firma.", margen + 5, y + 25);
            }
        } else {
            pdf.setFont("helvetica", "normal");
            pdf.text("No registrada.", margen + 5, y + 25);
        }

        y += 60;
    });

    const nombreArchivo = normalizarTexto(paciente.nombre || "paciente");
    pdf.save(`Historial_Clinico_${nombreArchivo}.pdf`);
};

export default generarHistorialPDF;