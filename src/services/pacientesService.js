import { supabase } from '../lib/supabaseClient';

export const obtenerPacientes = async () => {
    const { data, error } = await supabase
        .from('pacientes')
        .select('id, numero_identificacion, profesional, servicio_principal');

    if (error) throw error;

    return data || [];
};

export const obtenerPacientePorIdentificacion = async (identificacion) => {
    const { data, error } = await supabase
        .from('pacientes')
        .select('id, profesional, servicio_principal')
        .eq('numero_identificacion', String(identificacion || '').trim())
        .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
        throw new Error('No se encontró el registro del paciente.');
    }

    return data[0];
};

export const obtenerPacientePorId = async (id) => {
    const { data, error } = await supabase
        .from('pacientes')
        .select('id, profesional, servicio_principal')
        .eq('id', id)
        .single();

    if (error) throw error;

    return data;
};

export const actualizarProfesionalPaciente = async (
    pacienteId,
    profesionalActual,
    nuevoProfesional
) => {
    let consulta = supabase
        .from('pacientes')
        .update({ profesional: nuevoProfesional })
        .eq('id', pacienteId);

    consulta = profesionalActual == null
        ? consulta.is('profesional', null)
        : consulta.eq('profesional', profesionalActual);

    const { data, error } = await consulta
        .select('id')
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error(
            'La asignación cambió mientras tenías abierta la ficha. Ciérrala y vuelve a intentarlo.'
        );
    }

    return data;
};
