import clientPromise from './db';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { usuario, password } = req.body;

  const client = await clientPromise;
  const db = client.db();

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const ahora = new Date();

  try {
    const intento = await db.collection('login_attempts').findOne({ ip });

    if (intento && intento.bloqueado_hasta && ahora < intento.bloqueado_hasta) {
      const diff = Math.ceil((intento.bloqueado_hasta - ahora) / 60000);
      return res.status(429).json({ message: `Demasiados intentos fallidos. Intenta en ${diff} minuto(s).` });
    }

    if (usuario === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      await db.collection('login_attempts').deleteOne({ ip });
      // Aquí podrías generar un JWT o cookie para sesión
      return res.status(200).json({ message: 'Login exitoso', admin: true });
    } else {
      if (intento) {
        const nuevos_intentos = (intento.intentos || 0) + 1;
        if (nuevos_intentos >= 10) {
          await db.collection('login_attempts').updateOne(
            { ip },
            { $set: { intentos: nuevos_intentos, bloqueado_hasta: new Date(Date.now() + 10 * 60000) } }
          );
          return res.status(429).json({ message: 'IP bloqueada por 10 minutos.' });
        } else {
          await db.collection('login_attempts').updateOne({ ip }, { $set: { intentos: nuevos_intentos } });
        }
      } else {
        await db.collection('login_attempts').insertOne({ ip, intentos: 1, bloqueado_hasta: null });
      }
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
