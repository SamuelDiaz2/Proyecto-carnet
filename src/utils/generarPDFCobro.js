import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const obtenerFechaCorte = () => {
    const hoy = new Date();
    const mes = hoy.getMonth();
    const anio = hoy.getFullYear();
    const dia = hoy.getDate();

    let fechaCorte;
    if (dia <= 15) {
        fechaCorte = new Date(anio, mes, 15);
    } else {
        fechaCorte = new Date(anio, mes + 1, 0);
    }
    return fechaCorte.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatoPesos = (valor) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
};

// IMPORTANTE: Ahora la función es async
export const generarPDFCobro = async (profesional, atencionesAgrupadas, tarifaPorSesion = 28000) => {
    const docPDF = new jsPDF();
    const fechaCorte = obtenerFechaCorte();

    const colorAzul = [49, 130, 206];
    const colorGrisBase = [240, 244, 248];

    docPDF.setFontSize(24);
    docPDF.setFont("helvetica", "bold");
    docPDF.setTextColor(colorAzul[0], colorAzul[1], colorAzul[2]);
    docPDF.text("REHABILITAR-C", 105, 22, { align: "center" });

    docPDF.setFontSize(9);
    docPDF.setFont("helvetica", "normal");
    docPDF.setTextColor(100, 100, 100);
    docPDF.text("VEN Y RENACE CON NOSOTROS", 105, 27, { align: "center" });

    docPDF.setFontSize(11);
    docPDF.setTextColor(0, 0, 0);
    docPDF.text("Cuenta de cobro # ______________", 130, 40);

    docPDF.setFillColor(220, 230, 255);
    docPDF.rect(14, 45, 182, 7, 'F');
    docPDF.setFont("helvetica", "bold");
    docPDF.text("DEBE A:", 105, 50, { align: "center" });

    autoTable(docPDF, {
        startY: 52,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: colorGrisBase, cellWidth: 35 },
            2: { fontStyle: 'bold', fillColor: colorGrisBase, cellWidth: 35 }
        },
        body: [
            ['Nombre', profesional.nombre || '', 'C.C / NIT', profesional.cedula || ''],
            ['Dirección', '', 'Teléfono', ''],
            ['Ciudad', '', 'Fecha', fechaCorte],
            ['Banco', profesional.banco || '', 'No. Cuenta', profesional.numeroCuenta || '']
        ],
    });

    let totalGeneral = 0;
    const filasTabla = atencionesAgrupadas.map(item => {
        const valorParcial = item.cantidad * tarifaPorSesion;
        totalGeneral += valorParcial;
        return [
            `Paciente: ${item.paciente}`,
            item.cantidad.toString(),
            formatoPesos(tarifaPorSesion),
            '$ 0',
            formatoPesos(valorParcial)
        ];
    });

    while (filasTabla.length < 4) {
        filasTabla.push(['', '', '', '', '']);
    }

    filasTabla.push(['', '', '', 'Total a pagar', formatoPesos(totalGeneral)]);

    autoTable(docPDF, {
        startY: docPDF.lastAutoTable.finalY + 8,
        theme: 'grid',
        headStyles: { fillColor: [200, 210, 250], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold' },
        columns: [
            { header: 'Concepto', dataKey: 'concepto' },
            { header: 'Cantidad', dataKey: 'cantidad' },
            { header: 'Valor Sesión', dataKey: 'vparcial' },
            { header: 'Recibido', dataKey: 'recibido' },
            { header: 'Valor total', dataKey: 'vtotal' }
        ],
        body: filasTabla,
    });

    docPDF.setFontSize(10);
    docPDF.text("Valor en letras: ____________________________________________________________________", 14, docPDF.lastAutoTable.finalY + 12);

    docPDF.setFillColor(220, 230, 255);
    docPDF.rect(14, docPDF.lastAutoTable.finalY + 25, 182, 7, 'F');
    docPDF.setFont("helvetica", "bold");
    docPDF.text("Firma y cédula del profesional", 105, docPDF.lastAutoTable.finalY + 30, { align: "center" });

    docPDF.line(60, docPDF.lastAutoTable.finalY + 65, 150, docPDF.lastAutoTable.finalY + 65);
    docPDF.setFont("helvetica", "normal");
    docPDF.text(`C.C: ${profesional.cedula}`, 105, docPDF.lastAutoTable.finalY + 70, { align: "center" });

    const pageHeight = docPDF.internal.pageSize.height;
    docPDF.setFontSize(9);
    docPDF.text("Carrera 19 # 12a-16 Funza (Cundinamarca)", 105, pageHeight - 20, { align: "center" });
    docPDF.text("Teléfono: 3134188109 - 3197740132", 105, pageHeight - 15, { align: "center" });
    docPDF.text("Email: solyvida635@gmail.com", 105, pageHeight - 10, { align: "center" });

    // ==========================================
    // LÓGICA DE DESCARGA: WEB VS MÓVIL
    // ==========================================
    const nombreArchivo = `Cuenta_Cobro_${profesional.nombre.replace(/\s+/g, '_')}_${fechaCorte.replace(/\//g, '-')}.pdf`;

    if (Capacitor.isNativePlatform()) {
        try {
            // 1. Extraer el PDF en formato Base64 (texto)
            const pdfBase64 = docPDF.output('datauristring').split(',')[1];

            // 2. Escribir el archivo en la memoria caché del móvil
            const result = await Filesystem.writeFile({
                path: nombreArchivo,
                data: pdfBase64,
                directory: Directory.Cache
            });

            // 3. Abrir el menú nativo para compartir/guardar el archivo
            await Share.share({
                title: 'Cuenta de Cobro',
                text: `Cuenta de cobro generada para ${profesional.nombre}`,
                url: result.uri,
                dialogTitle: 'Compartir o Guardar PDF',
            });
        } catch (error) {
            console.error("Error al generar PDF nativo:", error);
            alert("No se pudo generar el archivo PDF en el dispositivo.");
        }
    } else {
        // 4. Comportamiento clásico para navegadores web
        docPDF.save(nombreArchivo);
    }
};