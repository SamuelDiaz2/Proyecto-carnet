
import { supabase } from '../lib/supabaseClient';

// Obtener los identificadores de pacientes que tienen evoluciones.
export const obtenerEvoluciones = async () => {
    const { data, error } = await supabase
        .from('evoluciones_atencion')
        .select('paciente_id');

    if (error) throw error;

    return data || [];
};

// Contar los registros de un paciente.
export const contarEvolucionesPaciente = async (pacienteId) => {
    const { count, error } = await supabase
        .from('evoluciones_atencion')
        .select('*', { count: 'exact', head: true })
        .eq('paciente_id', pacienteId);

    if (error) throw error;

    return count || 0;
};

export const obtenerRegistrosPaciente = async (pacienteId) => {
    const { data, error } = await supabase
        .from('evoluciones_atencion')
        .select(`
            id,
            paciente_id,
            profesional_cedula,
            profesional_nombre,
            profesion_especialidad,
            datos_formulario,
            created_at,
            tipo_registro
        `)
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
};
