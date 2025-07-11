import clientPromise from './db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método no permitido' });
  }

  // Simular validación admin con header personalizado (no seguro, solo para pruebas)
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  const client = await clientPromise;
  const db = client.db();

  const usuarios = await db.collection('usuarios').find().toArray();

  return res.status(200).json({ usuarios });
}
