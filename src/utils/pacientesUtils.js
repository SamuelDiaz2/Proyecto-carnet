import { coincideProfesionCita } from './filterServices.js';

export const agruparPacientes = ({
    citas,
    profesionalesAsignados,
    conteoEvoluciones,
    miNombre,
    profesionUsuario,
    esAdmin
}) => {
    const grupos = {};

    citas.forEach((cita) => {
        const documento = String(cita.identificacion || '').trim();

        const profesionalAsignado =
            Object.prototype.hasOwnProperty.call(
                profesionalesAsignados,
                documento
            )
                ? profesionalesAsignados[documento]
                : cita.profesional || '';

        const esMia =
            profesionalAsignado.trim().toLowerCase() ===
            (miNombre || '').trim().toLowerCase();

        const correspondeEspecialidad =
            esAdmin || coincideProfesionCita(cita, profesionUsuario);

        if (!esMia && !correspondeEspecialidad) return;

        const key = documento
            ? documento
            : cita.nombre_paciente
                ? cita.nombre_paciente.trim().toLowerCase()
                : 'desconocido';

        if (!grupos[key]) {
            grupos[key] = {
                id: key,
                nombre: cita.nombre_paciente || 'Paciente sin nombre',
                identificacion: cita.identificacion || 'Sin documento',
                telefono: cita.telefono_contacto || '',
                municipio: cita.municipio_ciudad || '',
                barrio: cita.barrio_localidad || '',
                direccion: cita.direccion_atencion || '',
                profesional: profesionalAsignado,
                citas: []
            };
        }

        if (profesionalAsignado) {
            grupos[key].profesional = profesionalAsignado;
        }

        grupos[key].citas.push(cita);
    });

    return Object.values(grupos).map((paciente) => {
        const citasPendientes = paciente.citas.filter(
            (cita) =>
                cita.estado === 'pendiente' ||
                cita.estado === 'confirmada'
        );

        const citasAtendidas = paciente.citas.filter(
            (cita) => cita.estado === 'completada'
        );

        const nombreNormalizado = (miNombre || '').trim().toLowerCase();

        const asignadoAMi = paciente.profesional
            ? paciente.profesional.trim().toLowerCase() === nombreNormalizado
            : paciente.citas.some(
                (cita) =>
                    (cita.profesional || '').trim().toLowerCase() ===
                    nombreNormalizado
            );

        const sesionesTotales = 10;

        const sesionesRealizadas =
            conteoEvoluciones[paciente.identificacion] !== undefined
                ? conteoEvoluciones[paciente.identificacion]
                : citasAtendidas.length;

        const sesionesRestantes = Math.max(
            0,
            sesionesTotales - sesionesRealizadas
        );

        return {
            ...paciente,
            citasPendientes,
            citasAtendidas,
            asignadoAMi,
            sesionesTotales,
            sesionesRealizadas,
            sesionesRestantes
        };
    });
};

export const filtrarPacientes = ({
    pacientes,
    busqueda,
    filtroTab
}) => {
    const termino = busqueda.toLowerCase();

    return pacientes.filter((paciente) => {
        const coincideBusqueda =
            (paciente.nombre || '').toLowerCase().includes(termino) ||
            (paciente.identificacion || '').toLowerCase().includes(termino) ||
            (paciente.municipio || '').toLowerCase().includes(termino);

        if (!coincideBusqueda) return false;

        if (filtroTab === 'mis-pacientes') {
            return paciente.asignadoAMi;
        }

        return true;
    });
};
