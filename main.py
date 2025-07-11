from flask import Flask, render_template, request, redirect, url_for, session
from flask_pymongo import PyMongo
from datetime import datetime, timedelta
import re
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = 'clave_secreta_segura'

app.config["MONGO_URI"] = os.getenv("MONGO_URI")

mongo = PyMongo(app)

# Admin info desde env
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

@app.route('/')
def home():
    return redirect(url_for('register'))

@app.route('/logout')
def logout():
    session.pop('admin', None)
    session.pop('usuario', None)
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nombre = request.form['nombre']
        segundo_nombre = request.form['segundo_nombre']
        apellido = request.form['apellido']
        dni = request.form['dni']

        # Validar formato DNI
        if not re.fullmatch(r"\d{2}\.\d{3}\.\d{3}", dni):
            return "Error: El DNI debe tener el formato xx.xxx.xxx"

        usuario_existente = mongo.db.usuarios.find_one({"dni": dni})

        if usuario_existente:
            # Validar que los demás datos coincidan con la base (por seguridad)
            if (usuario_existente['nombre'] == nombre and
                usuario_existente['segundo_nombre'] == segundo_nombre and
                usuario_existente['apellido'] == apellido):
                # Si coinciden, iniciar sesión con ese usuario
                session['usuario'] = usuario_existente
                return redirect(url_for('index'))
            else:
                return "Error: El DNI ya está registrado con otros datos."

        # Si no existe, creamos nuevo usuario
        fecha_registro = datetime.now()
        fecha_vencimiento = fecha_registro + timedelta(days=7)

        usuario = {
            "nombre": nombre,
            "segundo_nombre": segundo_nombre,
            "apellido": apellido,
            "dni": dni,
            "fecha_vencimiento": fecha_vencimiento.strftime("%d/%m/%Y")
        }

        mongo.db.usuarios.insert_one(usuario)
        session['usuario'] = usuario
        return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/index')
def index():
    if 'usuario' not in session:
        return redirect(url_for('register'))
    return render_template('index.html', usuario=session['usuario'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form['usuario']
        password = request.form['password']
        if usuario == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin'] = True
            return redirect(url_for('dashboard'))
        else:
            return "Credenciales inválidas"
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if not session.get('admin'):
        return redirect(url_for('login'))
    usuarios = list(mongo.db.usuarios.find())
    return render_template('dashboard.html', usuarios=usuarios)

if __name__ == '__main__':
    app.run(debug=True)
