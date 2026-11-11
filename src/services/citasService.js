import { supabase } from '../lib/supabaseClient';

export const obtenerCitas = async () => {
    const { data, error } = await supabase
        .from('citas')
        .select('*')
        .order('fecha', { ascending: true });

    if (error) throw error;

    return data || [];
};

export const cancelarCita = async (citaId) => {
    const { error } = await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', citaId);

    if (error) throw error;

    return true;
};

export const actualizarCitasPendientes = async (
    identificacion,
    nuevoProfesional
) => {
    const { error } = await supabase
        .from('citas')
        .update({ profesional: nuevoProfesional })
        .eq('identificacion', String(identificacion || '').trim())
        .in('estado', ['pendiente', 'confirmada']);

    if (error) throw error;

    return true;
};
