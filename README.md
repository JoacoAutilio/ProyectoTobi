# TSP Arquitectura · Portal con Supabase

Portal real con autenticación, base de datos y datos compartidos entre dispositivos.

---

## Estructura del proyecto

```
tsp-arquitectura-supabase/
├── index.html                ← UI completa
├── css/
│   └── styles.css            ← Estilos
├── js/
│   ├── supabase-client.js    ← Conexión y acceso a Supabase
│   └── app.js                ← Lógica principal
├── supabase-setup.sql        ← Script para crear tablas (correr UNA sola vez)
└── README.md
```

---

## PASO 1 — Configurar Supabase (hacer UNA sola vez)

### 1.1 Correr el script SQL

1. En tu proyecto de Supabase → menú izquierdo → **SQL Editor**
2. Click en **New query**
3. Abrí el archivo `supabase-setup.sql` de este proyecto
4. Copiá TODO el contenido y pegalo en el editor
5. Click en **Run** (o `Ctrl+Enter`)
6. Deberías ver: `Success. No rows returned`

Esto crea:
- Tabla `profiles` (datos de usuario)
- Tabla `projects` (proyectos)
- Trigger automático (crea perfil al registrarse)
- Bucket de storage para archivos
- Políticas de seguridad

### 1.2 Crear tu usuario ADMIN

1. En Supabase → **Authentication** → **Users** → **Add user** → **Create new user**
2. Completá:
   - Email: `tobias@tsp.com` (o el que quieras)
   - Password: la que quieras
   - ✅ **Auto Confirm User**
3. Click **Create User**
4. Volvé al **SQL Editor** → New query y corré esto (reemplazando el email):

```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id = (SELECT id FROM auth.users WHERE email = 'tobias@tsp.com');
```

5. Click **Run** → debería decir `1 row affected`

### 1.3 Agregar columnas extra a proyectos

En SQL Editor → New query, corré esto:

```sql
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS surface   integer,
ADD COLUMN IF NOT EXISTS covered   integer,
ADD COLUMN IF NOT EXISTS rooms     integer,
ADD COLUMN IF NOT EXISTS bathrooms integer,
ADD COLUMN IF NOT EXISTS materials text;
```

---

## PASO 2 — Correr el proyecto localmente

1. Abrí la carpeta en **VSCode**
2. Click derecho en `index.html` → **Open with Live Server**
3. Se abre en `http://localhost:5500`
4. Ingresá con el email y contraseña del admin que creaste

---

## PASO 3 — Subir a GitHub Pages

```bash
git init
git add .
git commit -m "TSP Arquitectura con Supabase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tsp-arquitectura.git
git push -u origin main
```

Luego en GitHub → Settings → Pages → Source: **main / root**

Tu portal queda en: `https://TU_USUARIO.github.io/tsp-arquitectura`

---

## Flujo completo de uso

### Como ADMIN (Tobias):
1. Entrás con tu email y contraseña
2. Ves el panel admin automáticamente
3. En **Usuarios**: ves todos los registrados, activás los pendientes
4. En **Proyectos**: creás proyectos y los asignás a clientes
5. Los datos se guardan en Supabase, visibles desde cualquier dispositivo

### Como CLIENTE (nuevo):
1. Clickea **Crear cuenta** en el login
2. Completa nombre, email y contraseña
3. Queda en estado **Pendiente**
4. Vos (admin) lo activás desde el panel
5. El cliente ingresa y ve su proyecto asignado desde cualquier dispositivo

---

## Credenciales iniciales

| Email | Contraseña | Rol |
|---|---|---|
| `tobias@tsp.com` (o el que pusiste) | la que elegiste | Admin |

Los clientes se registran solos o vos los creás desde el panel.

---

## Diferencias con la versión localStorage

| | Versión localStorage | Versión Supabase |
|---|---|---|
| Datos entre dispositivos | ❌ No | ✅ Sí |
| Login real seguro | ❌ No | ✅ Sí |
| Clientes ven solo su proyecto | ❌ No | ✅ Sí |
| Funciona en GitHub Pages | ✅ Sí | ✅ Sí |
| Requiere internet | ❌ No | ✅ Sí |
| Costo | Gratis | Gratis (plan free) |
