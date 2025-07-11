require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Config
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'clave_secreta_segura',
    resave: false,
    saveUninitialized: false
}));

// DB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Modelos
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    nombre: String,
    segundo_nombre: String,
    apellido: String,
    dni: String,
    fecha_vencimiento: String,
    ip: String
}));

const LoginAttempt = mongoose.model('LoginAttempt', new mongoose.Schema({
    ip: String,
    intentos: Number,
    bloqueado_hasta: Date
}));

// Rutas

app.get('/', (req, res) => {
    res.redirect('/register');
});

app.get('/logout', (req, res) => {
    req.session.admin = null;
    req.session.usuario = null;
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { nombre, segundo_nombre, apellido, dni } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    const letrasRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    const dniRegex = /^\d{2}\.\d{3}\.\d{3}$/;

    if (!letrasRegex.test(nombre) || !letrasRegex.test(segundo_nombre) || !letrasRegex.test(apellido)) {
        return res.send("Error: Nombre, segundo nombre y apellido solo pueden contener letras.");
    }

    if (!dniRegex.test(dni)) {
        return res.send("Error: El DNI debe tener el formato xx.xxx.xxx");
    }

    const existente = await Usuario.findOne({ dni });

    if (existente) {
        if (
            existente.nombre === nombre &&
            existente.segundo_nombre === segundo_nombre &&
            existente.apellido === apellido
        ) {
            req.session.usuario = existente;
            return res.redirect('/index');
        } else {
            return res.send("Error: El DNI ya está registrado con otros datos.");
        }
    }

    const cantidad_ip = await Usuario.countDocuments({ ip });

    if (cantidad_ip >= 10) {
        return res.send("Error: Se alcanzó el límite de 10 registros por IP.");
    }

    const ahora = new Date();
    const vencimiento = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const nuevo = new Usuario({
        nombre,
        segundo_nombre,
        apellido,
        dni,
        fecha_vencimiento: vencimiento.toLocaleDateString('es-AR'),
        ip
    });

    await nuevo.save();
    req.session.usuario = nuevo;
    res.redirect('/index');
});

app.get('/index', (req, res) => {
    if (!req.session.usuario) return res.redirect('/register');
    res.render('index', { usuario: req.session.usuario });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const intento = await LoginAttempt.findOne({ ip });
    const ahora = new Date();

    if (intento && intento.bloqueado_hasta && ahora < intento.bloqueado_hasta) {
        const minutos = Math.ceil((intento.bloqueado_hasta - ahora) / 60000);
        return res.send(`Demasiados intentos fallidos. Intenta en ${minutos} minuto(s).`);
    }

    const { usuario, password } = req.body;

    if (usuario === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        await LoginAttempt.deleteOne({ ip });
        req.session.admin = true;
        return res.redirect('/dashboard');
    } else {
        if (intento) {
            intento.intentos += 1;
            if (intento.intentos >= 10) {
                intento.bloqueado_hasta = new Date(ahora.getTime() + 10 * 60000);
            }
            await intento.save();
        } else {
            await LoginAttempt.create({ ip, intentos: 1, bloqueado_hasta: null });
        }
        return res.send("Credenciales inválidas");
    }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.admin) return res.redirect('/login');
    const usuarios = await Usuario.find();
    res.render('dashboard', { usuarios });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
