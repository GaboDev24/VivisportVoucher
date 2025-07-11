import clientPromise from './db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombre, segundo_nombre, apellido, dni } = req.body;

  const letrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  const dniRegex = /^\d{2}\.\d{3}\.\d{3}$/;

  if (!letrasRegex.test(nombre) || !letrasRegex.test(segundo_nombre) || !letrasRegex.test(apellido)) {
    return res.status(400).json({ message: "Nombre, segundo nombre y apellido solo pueden contener letras" });
  }

  if (!dniRegex.test(dni)) {
    return res.status(400).json({ message: "DNI debe tener formato xx.xxx.xxx" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const existente = await db.collection('usuarios').findOne({ dni });

    if (existente) {
    if (
        existente.nombre === nombre &&
        existente.segundo_nombre === segundo_nombre &&
        existente.apellido === apellido
    ) {
        return res.status(200).json({
        redirect: `/index?dni=${dni}`
        });
    } else {
        return res.status(400).json({ message: 'DNI ya está en uso con otros datos' });
    }
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    const cantidad_ip = await db.collection('usuarios').countDocuments({ ip });
    if (cantidad_ip >= 10) {
      return res.status(400).json({ message: 'Límite de 10 registros por IP alcanzado' });
    }

    const fecha_vencimiento = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const usuario = {
      nombre,
      segundo_nombre,
      apellido,
      dni,
      fecha_vencimiento: fecha_vencimiento.toLocaleDateString('es-AR'),
      ip,
    };

    await db.collection('usuarios').insertOne(usuario);

    return res.status(201).json({ redirect: `/index?dni=${dni}` });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
