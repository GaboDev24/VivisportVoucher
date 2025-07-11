import express from 'express';
import path from 'path';
import clientPromise from './db.js';

const app = express();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.redirect('/register');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/index', async (req, res) => {
  const dni = req.query.dni;
  if (!dni) {
    return res.redirect('/register');
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const usuario = await db.collection('usuarios').findOne({ dni });

    if (!usuario) {
      return res.redirect('/register');
    }

    res.render('index', { usuario });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});

app.get('/login', (req, res) => res.render('login'));

app.get('/dashboard', async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const usuarios = await db.collection('usuarios').find().toArray();
    res.render('dashboard', { usuarios });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar dashboard');
  }
});

app.get('/logout', (req, res) => {
  // Aquí podés agregar lógica de cierre de sesión si usás cookies o sesiones
  res.redirect('/login');
});

export default app;
