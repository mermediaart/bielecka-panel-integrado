# Bielecka · Panel operativo (versión web independiente)

Misma app que el artifact de Claude, con dos cambios de fondo:

1. **Login real, sin contraseña.** Cada persona entra con su email — le llega
   un link mágico y con eso accede. Ya no existe el sistema de PIN.
2. **Seguridad real en la base de datos.** Los datos de clientes completos,
   métricas, notas del equipo directivo y mensajes/briefs quedan bloqueados
   en Supabase (con Row Level Security) para cualquiera que no sea Socia —
   aunque alguien abra las herramientas de desarrollador e intente consultar
   la base directamente, Postgres le devuelve cero filas. No es una
   restricción de interfaz, es una restricción de la base de datos.

## 1. Crear el proyecto de Supabase

1. Entrá a [supabase.com](https://supabase.com), creá una cuenta gratis y un proyecto nuevo.
2. Andá a **Authentication → Providers** y confirmá que **Email** esté activo
   (viene activo por defecto). No hace falta tocar nada más ahí.
3. Andá a **SQL Editor → New query**, abrí `supabase-schema.sql` de este
   proyecto, **reemplazá el mail y el nombre en la última sección** (el
   `insert into profiles ...` del final) por los tuyos — esa persona va a ser
   la primera Socia con acceso — y ejecutá todo el script.
4. Andá a **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public key**

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Completá `.env` con los dos valores del paso anterior. Después:

```bash
npm run dev
```

Entrá con el mail que cargaste como primera Socia — te va a llegar el link de
acceso a esa casilla.

## 3. Dar de alta al resto del equipo

Una vez adentro como Socia:

1. Andá a **Equipo → Agregar integrante**.
2. Cargá nombre, rol, tipo de acceso (Socia / Freelance) y, **lo más
   importante, el email** de esa persona.
3. Esa persona entra a `bielecka-panel...` (la URL de tu sitio), pone ese
   mismo mail, recibe el link, y el sistema la reconoce automáticamente con
   el rol que le asignaste. No hace falta que la crees en Supabase a mano.

Si alguien intenta entrar con un mail que todavía no está cargado en Equipo,
la app le avisa que su cuenta no está habilitada — no accede a nada hasta que
una Socia lo agregue.

## 4. Subir a GitHub

```bash
git init
git add .
git commit -m "Panel Bielecka"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

El `.env` no se sube (está en `.gitignore`).

## 5. Desplegar

### Opción A — GitHub Pages (automático, ya incluido)

1. En tu repo: **Settings → Secrets and variables → Actions** → agregá
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. **Settings → Pages** → fuente: **GitHub Actions**.
3. Push a `main` (o corré el workflow manualmente desde la pestaña Actions).
4. Publicado en `https://TU-USUARIO.github.io/TU-REPO/`.

Si el repo no se llama igual que tu usuario, abrí `vite.config.js` y
descomentá `base: '/TU-REPO/'`.

**Importante:** en Supabase, andá a **Authentication → URL Configuration** y
agregá la URL final del sitio desplegado en "Redirect URLs" — si no, el link
mágico no va a poder volver a la app correctamente.

### Opción B — Vercel o Netlify

Importá el repo, cargá las mismas dos variables de entorno en la
configuración del proyecto, deploy. Mismo paso de agregar la URL en Supabase.

## Cómo queda repartido el acceso

| Dato | Quién lo ve |
|---|---|
| Clientes completos (fee, notas, contacto) | Solo Socias |
| Nombre de marca (sin datos comerciales) | Todo el equipo |
| Métricas | Solo Socias |
| Notas "equipo directivo" | Solo Socias |
| Notas "equipo general" | Todo el equipo |
| Mensajes / briefs predeterminados | Solo Socias |
| Historial de una marca (procesos) | Socias ven todo; cada freelancer solo ve las tareas donde es responsable |

Esto no es una regla de la interfaz que se pueda esquivar — está escrito en
las políticas de la base de datos (`supabase-schema.sql`), así que aplica sin
importar cómo se haga la consulta.

## Estructura del proyecto

```
├── src/
│   ├── App.jsx            ← el panel completo (vistas y componentes)
│   ├── db.js               ← hooks de datos + login por mail
│   ├── supabaseClient.js   ← inicialización del cliente de Supabase
│   └── main.jsx             ← punto de entrada de React
├── supabase-schema.sql      ← tablas + reglas de seguridad (RLS)
├── .env.example
└── .github/workflows/deploy.yml  ← despliegue automático a GitHub Pages
```
