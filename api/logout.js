export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método no permitido' });
  }

  // En serverless, simplemente se informa que el logout fue exitoso.
  return res.status(200).json({ message: 'Logout exitoso' });
}
