
import { useState, useEffect, useMemo, useCallback } from 'react';

import { obtenerCitas } from '../services/citasService';
import { obtenerPacientes } from '../services/pacientesService';
import { obtenerEvoluciones } from '../services/evolucionesService';

import {
    agruparPacientes,
    filtrarPacientes
} from '../utils/pacientesUtils';

export default function usePacientes() {
    const [citas, setCitas] = useState([]);
    const [profesionalesAsignados, setProfesionalesAsignados] = useState({});
    const [conteoEvoluciones, setConteoEvoluciones] = useState({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('mis-pacientes');

    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [actualizandoCitaId, setActualizandoCitaId] = useState(null);

    const miNombre =
        localStorage.getItem('usuarioNombre') || 'Profesional Asignado';

    const profesionUsuario =
        localStorage.getItem('usuarioProfesion') || '';

    const cedulaUsuario =
        localStorage.getItem('usuarioCedula') || '';

    const esAdmin =
        cedulaUsuario === '1028862517' ||
        cedulaUsuario === '1073519428';

    const cargarCitas = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [citasData, pacientesData, evolucionesData] =
                await Promise.all([
                    obtenerCitas(),
                    obtenerPacientes(),
                    obtenerEvoluciones()
                ]);

            // Contar evoluciones por paciente
            const conteoPorPaciente = {};

            evolucionesData.forEach((evolucion) => {
                const pacienteId = evolucion.paciente_id;

                if (!pacienteId) return;

                conteoPorPaciente[pacienteId] =
                    (conteoPorPaciente[pacienteId] || 0) + 1;
            });

            // Relacionar pacientes con sus profesionales y evoluciones
            const mapaProfesionales = {};
            const mapaEvoluciones = {};

            pacientesData.forEach((paciente) => {
                const documento = String(
                    paciente.numero_identificacion || ''
                ).trim();

                if (!documento) return;

                mapaProfesionales[documento] =
                    paciente.profesional || '';

                mapaEvoluciones[documento] =
                    conteoPorPaciente[paciente.id] || 0;
            });

            setCitas(citasData);
            setProfesionalesAsignados(mapaProfesionales);
            setConteoEvoluciones(mapaEvoluciones);

        } catch (err) {
            console.error('Error al cargar pacientes:', err);

            setError(
                'No se pudieron cargar los pacientes. Verifica la conexión.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarCitas();
    }, [cargarCitas]);

    const pacientesAgrupados = useMemo(() => {
        return agruparPacientes({
            citas,
            profesionalesAsignados,
            conteoEvoluciones,
            miNombre,
            profesionUsuario,
            esAdmin
        });
    }, [
        citas,
        profesionalesAsignados,
        conteoEvoluciones,
        miNombre,
        profesionUsuario,
        esAdmin
    ]);

    const pacientesFiltrados = useMemo(() => {
        return filtrarPacientes({
            pacientes: pacientesAgrupados,
            busqueda,
            filtroTab
        });
    }, [
        pacientesAgrupados,
        busqueda,
        filtroTab
    ]);

    return {
        citas,
        setCitas,

        profesionalesAsignados,
        setProfesionalesAsignados,

        conteoEvoluciones,

        loading,
        error,

        busqueda,
        setBusqueda,

        filtroTab,
        setFiltroTab,

        pacienteSeleccionado,
        setPacienteSeleccionado,

        actualizandoCitaId,
        setActualizandoCitaId,

        miNombre,
        profesionUsuario,
        esAdmin,

        pacientesAgrupados,
        pacientesFiltrados,

        cargarCitas
    };
}
