import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const obtenerFechaCorte = () => {
    const hoy = new Date();
    const mes = hoy.getMonth();
    const anio = hoy.getFullYear();
    const dia = hoy.getDate();

    let fechaCorte;
    if (dia <= 15) {
        fechaCorte = new Date(anio, mes, 15);
    } else {
        fechaCorte = new Date(anio, mes + 1, 0); // Último día del mes
    }
    return fechaCorte.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Formateador de moneda colombiana
const formatoPesos = (valor) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
};

export const generarPDFCobro = (profesional, atencionesAgrupadas, tarifaPorSesion = 28000) => {
    const docPDF = new jsPDF();
    const fechaCorte = obtenerFechaCorte();

    // Colores corporativos
    const colorAzul = [49, 130, 206];
    const colorGrisBase = [240, 244, 248];

    // Encabezado
    docPDF.setFontSize(24);
    docPDF.setFont("helvetica", "bold");
    docPDF.setTextColor(colorAzul[0], colorAzul[1], colorAzul[2]);
    docPDF.text("REHABILITAR-C", 105, 22, { align: "center" });

    docPDF.setFontSize(9);
    docPDF.setFont("helvetica", "normal");
    docPDF.setTextColor(100, 100, 100);
    docPDF.text("VEN Y RENACE CON NOSOTROS", 105, 27, { align: "center" });

    // Consecutivo
    docPDF.setFontSize(11);
    docPDF.setTextColor(0, 0, 0);
    docPDF.text("Cuenta de cobro # ______________", 130, 40);

    // Bloque DEBE A
    docPDF.setFillColor(220, 230, 255);
    docPDF.rect(14, 45, 182, 7, 'F');
    docPDF.setFont("helvetica", "bold");
    docPDF.text("DEBE A:", 105, 50, { align: "center" });

    // Tabla de datos del profesional
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
            ['Dirección', '', 'Teléfono', profesional.telefono || ''],
            ['Ciudad', profesional.ciudad || '', 'Fecha', fechaCorte],
            ['Banco', profesional.banco || '', 'No. Cuenta', profesional.numeroCuenta || '']
        ],
    });

    // Preparar los datos dinámicos para la tabla de conceptos
    let totalGeneral = 0;
    const filasTabla = atencionesAgrupadas.map(item => {
        const valorParcial = item.cantidad * tarifaPorSesion;
        totalGeneral += valorParcial;

        return [
            `${item.paciente}`,
            item.cantidad.toString(),
            formatoPesos(tarifaPorSesion), // Valor Unitario / Parcial
            '$ 0', // Recibido
            formatoPesos(valorParcial) // Valor Total
        ];
    });

    // Agregar filas en blanco si hay poquitos pacientes para que la tabla no se vea vacía
    while (filasTabla.length < 4) {
        filasTabla.push(['', '', '', '', '']);
    }

    // Fila del total final
    filasTabla.push(['', '', '', 'Total a pagar', formatoPesos(totalGeneral)]);

    // Tabla de Conceptos Dinámica
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

    // Valor en letras
    docPDF.setFontSize(10);
    docPDF.text("Valor en letras: ____________________________________________________________________", 14, docPDF.lastAutoTable.finalY + 12);

    // Bloque de Firma
    docPDF.setFillColor(220, 230, 255);
    docPDF.rect(14, docPDF.lastAutoTable.finalY + 25, 182, 7, 'F');
    docPDF.setFont("helvetica", "bold");
    docPDF.text("Firma y cédula del profesional", 105, docPDF.lastAutoTable.finalY + 30, { align: "center" });

    if (profesional.firma?.startsWith('data:image/png;base64,')) {
        docPDF.addImage(profesional.firma, 'PNG', 75, docPDF.lastAutoTable.finalY + 36, 60, 18);
    }

    docPDF.line(60, docPDF.lastAutoTable.finalY + 65, 150, docPDF.lastAutoTable.finalY + 65);
    docPDF.setFont("helvetica", "normal");
    docPDF.text(`C.C: ${profesional.cedula}`, 105, docPDF.lastAutoTable.finalY + 70, { align: "center" });

    // Footer
    const pageHeight = docPDF.internal.pageSize.height;
    docPDF.setFontSize(9);
    docPDF.text("Carrera 19 # 12a-16 Funza (Cundinamarca)", 105, pageHeight - 20, { align: "center" });
    docPDF.text("Teléfono: 3134188109 - 3197740132", 105, pageHeight - 15, { align: "center" });
    docPDF.text("Email: solyvida635@gmail.com", 105, pageHeight - 10, { align: "center" });

    docPDF.save(`Cuenta_Cobro_${profesional.nombre.replace(/\s+/g, '_')}_${fechaCorte.replace(/\//g, '-')}.pdf`);
};