/**
 * Comprime y redimensiona una imagen para optimizar almacenamiento y rendimiento en dispositivos móviles.
 * @param {File} file - Archivo de imagen seleccionado.
 * @param {number} maxWidth - Ancho máximo permitido (default 500px).
 * @param {number} maxHeight - Alto máximo permitido (default 500px).
 * @param {number} quality - Calidad JPEG (0.1 a 1.0, default 0.7).
 * @returns {Promise<string>} Base64 Data URL comprimido.
 */
export function compressImage(file, maxWidth = 500, maxHeight = 500, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('El archivo no es una imagen válida'));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let { width, height } = img;

                // Mantener aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Exportar como JPEG optimizado
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
