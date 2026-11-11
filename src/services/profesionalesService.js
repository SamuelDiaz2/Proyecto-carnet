import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';

import { db } from '../lib/firebaseConfig';

export const obtenerProfesionales = async () => {
    const resultado = await getDocs(
        query(
            collection(db, 'autorizados'),
            where('rol', '==', 'profesional')
        )
    );

    return resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
    }));
};
