import PacienteCard from './PacienteCard';

export default function PacientesLista({
    pacientes,
    onSeleccionarPaciente
}) {
    if (pacientes.length === 0) {
        return (
            <div className="pacientes-state-box">
                <h3>No se encontraron pacientes</h3>
                <p>
                    Intenta cambiar la búsqueda o los filtros seleccionados.
                </p>
            </div>
        );
    }

    return (
        <div className="pacientes-grid">
            {pacientes.map((paciente) => (
                <PacienteCard
                    key={paciente.id}
                    paciente={paciente}
                    onClick={() => onSeleccionarPaciente(paciente)}
                />
            ))}
        </div>
    );
}
