# Votación de Directivas — Iglesia

Sistema de votación electrónica, anónimo y gratuito, para elegir las directivas de **Caballeros, Damas y Jóvenes**
(Presidente, Vicepresidente, Secretario y Tesorero de cada una).

**Cómo se eligen los cargos:** en cada directiva hay **2 votaciones**. En **Presidencia**, el más votado es **Presidente** y el segundo, **Vicepresidente**. En **Secretaría**, el más votado es **Secretario** y el segundo, **Tesorero**. Cada persona marca 1 candidato por votación: 6 en total (2 × 3 directivas).

- **Estaciones de votación** (hasta 10 tablets): una sola papeleta con las 3 directivas, letra grande, pensada para personas mayores.
- **Panel del staff**: estado de la elección, estaciones en vivo, candidatos, resultados y exportación CSV.
- **Gratis**: React + Vite servido por **Google Apps Script**, datos en **Google Sheets**. Sin servidores ni bases de datos externas.

---

## Índice

1. [Cómo funciona](#1-cómo-funciona)
2. [Probar en su computadora (sin Google)](#2-probar-en-su-computadora-sin-google)
3. [Instalación en Google (una sola vez)](#3-instalación-en-google-una-sola-vez)
4. [Actualizar la app después de cambios](#4-actualizar-la-app-después-de-cambios)
5. [Ensayo general](#5-ensayo-general)
6. [Guía para el día de la elección](#6-guía-para-el-día-de-la-elección)
7. [Guía de administración (panel)](#7-guía-de-administración-panel)
8. [Seguridad y anonimato](#8-seguridad-y-anonimato)
9. [Limitaciones conocidas](#9-limitaciones-conocidas)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Solución de problemas](#11-solución-de-problemas)

---

## 1. Cómo funciona

```
Tablet ×10 ─┐                               ┌─ Google Sheets (Votes, Devices, Candidates…)
Panel staff ─┼─ google.script.run ─► Apps Script ─┤  Script Properties (llave del panel)
            ─┘   (misma URL de la app)            └─ CacheService (última actividad, límite de intentos)
```

| URL | Para qué |
|---|---|
| `https://script.google.com/macros/s/…/exec` | Estación de votación (se abre en cada tablet) |
| `https://script.google.com/macros/s/…/exec?view=admin&key=LLAVE` | Panel del staff (enlace secreto, sin login) |
| `https://script.google.com/macros/s/…/exec?view=admin&key=LLAVE#/pantalla` | Resultados en grande, sin menús (para proyector o TV) |
| `https://script.google.com/macros/s/…/exec?view=conteo` | **Conteo público**: solo el número de votos en grande y el tiempo de votación. Sin llave, nunca muestra resultados. |
| `https://script.google.com/macros/s/…/exec?view=candidatos` | **Candidatos (público)**: lista de candidatos por directiva y votación, con foto o iniciales. Sin llave. En Netlify: `/public-candidatos`. |

**Ciclo de una estación:**

```
Bloqueada ──(3 toques en la esquina sup. izquierda, o "Habilitar" en el panel)──► Bienvenida
   ▲                                                                  │ "Comenzar a votar"
   │                                                                  ▼
   └──── ¡Su voto fue registrado! ◄── Confirmar ◄── Revisar ◄── Papeleta (6 votaciones)
```

Después de cada voto, la estación queda **bloqueada en el servidor**: recargar la página no la desbloquea.

---

## 2. Probar en su computadora (sin Google)

Requisitos: [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run dev
```

En modo desarrollo, el **código real del servidor** (`apps-script/*.gs`) se ejecuta en el navegador sobre una hoja de cálculo emulada (guardada en `localStorage`), con datos de ejemplo.

| Abrir | Qué es |
|---|---|
| `http://localhost:5173/?view=admin&key=dev` | Panel del staff |
| `http://localhost:5173/?view=admin&key=dev#/pantalla` | Resultados en grande |
| `http://localhost:5173/?station=1` | Estación 1 (abra otras pestañas con `?station=2`, `3`… para simular varias tablets) |

- **Habilitar una estación:** en la pantalla de espera, 3 toques seguidos en la esquina superior izquierda.
- **Simular mala conexión:** agregue `&mockFail=0.4` a la URL de la estación (40 % de las llamadas fallan, la mitad *después* de guardar en el servidor). Los reintentos nunca duplican votos.
- **Reiniciar los datos emulados:** en la consola del navegador ejecute `__mockReset()`.

Pruebas automáticas (servidor real en el emulador, gesto de desbloqueo, máquina de estados, CSV):

```bash
npm test
```

---

## 3. Instalación en Google (una sola vez)

> Recomendación: use una **cuenta de Google dedicada** a la elección (p. ej. `elecciones.iglesia@gmail.com`), cuya contraseña conozcan 2 personas de confianza. Esa cuenta será la dueña de los datos.

### 3.1 Instalar clasp e iniciar sesión

```bash
npm install -g @google/clasp
clasp login
```

Active la API de Apps Script en <https://script.google.com/home/usersettings> (**Google Apps Script API → Activado**).

### 3.2 Crear la hoja de cálculo y el proyecto de Apps Script

1. Con la cuenta dedicada, cree una hoja de cálculo nueva en <https://sheets.new> y llámela **“Votación Iglesia”**.
2. En la hoja: **Extensiones → Apps Script**. Se abre el editor de un proyecto vinculado a esa hoja.
3. En el editor: **⚙ Configuración del proyecto** → copie el **ID de la secuencia de comandos**.
4. Péguelo en el archivo `.clasp.json` de este proyecto:

```json
{
  "scriptId": "1AbC…su-id…",
  "rootDir": "apps-script"
}
```

> Se recomienda este método manual en lugar de `clasp create-script`, porque ese comando descarga un `appsscript.json` por defecto que reemplazaría el del proyecto (zona horaria y configuración de la app web).

### 3.3 Subir el código

```bash
npm install
npm run push        # compila React en un solo archivo y ejecuta clasp push
```

Si `clasp push` pregunta si sobrescribir `appsscript.json`, responda **sí**.

### 3.4 (Opcional) Zona horaria

Si su iglesia no está en República Dominicana, cambie `timeZone` en `apps-script/appsscript.json` (p. ej. `America/Mexico_City`, `America/Bogota`) antes del `npm run push`.

### 3.5 Inicializar la base de datos

1. Abra el editor: `clasp open-script` (o desde la hoja: *Extensiones → Apps Script*).
2. Seleccione el archivo **Database.gs**, elija la función **`setupDatabase`** en la barra superior y pulse **▶ Ejecutar**.
3. Acepte los permisos (Google mostrará “Google no verificó esta app” → *Configuración avanzada → Ir a Votación Iglesia*). Es normal: la app es suya.
4. Abra el **Registro de ejecución**: verá los enlaces del panel, de la pantalla de resultados y de las estaciones.

`setupDatabase` crea las hojas `Elections`, `Categories`, `Positions`, `Candidates`, `Votes`, `Devices` y `AuditLog`, siembra las 3 directivas con sus 2 votaciones (Presidencia y Secretaría), y crea la primera elección en estado *En preparación*. Puede ejecutarla las veces que quiera: **nunca toca los votos**. Si la hoja tenía la estructura anterior de 4 cargos separados y aún no hay votos, la migra sola: los candidatos de Vicepresidente pasan a Presidencia y los de Tesorero a Secretaría.

### 3.6 Publicar como aplicación web

1. En el editor: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. **Ejecutar como:** *Yo* (la cuenta dueña).
4. **Quién tiene acceso:** *Cualquier usuario* (las tablets no necesitan iniciar sesión).
5. **Implementar** y copie la **URL de la aplicación web** (termina en `/exec`).

### 3.7 Obtener los enlaces

En el editor ejecute la función **`mostrarDatosAdmin`** (archivo *Database.gs*). El registro mostrará:

- **Enlace de las estaciones:** `https://script.google.com/macros/s/…/exec`
- **Enlace del panel:** `https://script.google.com/macros/s/…/exec?view=admin&key=XXXXXXXX`
- **Pantalla de resultados en grande:** `https://script.google.com/macros/s/…/exec?view=admin&key=XXXXXXXX#/pantalla`
- **Conteo público (sin llave):** `https://script.google.com/macros/s/…/exec?view=conteo`
- **Candidatos (sin llave):** `https://script.google.com/macros/s/…/exec?view=candidatos`

Guarde el enlace del panel como marcador **solo** en los dispositivos del staff. Quien tenga ese enlace administra la elección.

Para verificar la instalación, ejecute **`diagnostico`**: lista hojas, propiedades y la elección activa (solo lectura).

### 3.8 (Alternativa) Publicar el frontend en Netlify

Puede servir la interfaz desde Netlify en lugar de Google. Google Apps Script y la hoja siguen siendo el backend y la base de datos, así que **los pasos 3.1 a 3.6 son obligatorios igual**. Ventajas: una URL propia (`votacion-iglesia.netlify.app`), sin el banner de Google y con un almacenamiento local más estable en iPad.

1. Termine los pasos 3.1 a 3.6 y copie la **URL de la app web** (`https://script.google.com/macros/s/…/exec`).
2. Suba este proyecto a un repositorio de GitHub (o GitLab/Bitbucket).
3. En Netlify: **Add new site → Import an existing project →** elija el repositorio. El archivo `netlify.toml` ya define el build (`npm run build`, carpeta `dist`).
4. En **Site configuration → Environment variables** agregue la variable `VITE_GAS_URL` con la URL `/exec` del paso 1.
5. **Deploy.** Si la variable falta o está mal escrita, el build falla con un mensaje que lo explica.

Enlaces en Netlify (la llave es la misma que muestra `mostrarDatosAdmin`):

| Para qué | URL |
|---|---|
| Estaciones de votación | `https://SU-SITIO.netlify.app/` |
| Panel del staff | `https://SU-SITIO.netlify.app/?view=admin&key=XXXXXXXX` |
| Pantalla de resultados | `https://SU-SITIO.netlify.app/?view=admin&key=XXXXXXXX#/pantalla` |
| Conteo público (sin llave) | `https://SU-SITIO.netlify.app/?view=conteo` |
| Candidatos (sin llave) | `https://SU-SITIO.netlify.app/public-candidatos` |

Cómo funciona: la página llama a `doPost` de Apps Script con `fetch`. Esa función reenvía a las mismas `kioskApi`/`adminApi`, con las mismas validaciones y la misma llave. La petición va como `text/plain` para que el navegador no haga la consulta previa (preflight) CORS, que Apps Script no responde.

> **Probar en local contra Google real:** copie `.env.example` a `.env.local`, ponga su URL `/exec` y ejecute `npm run dev`. Sin ese archivo, `npm run dev` usa el emulador.

### 3.9 Instalar como app (PWA)

En Netlify, la app es instalable como PWA:

- **Pantalla completa:** se abre sin la barra del navegador. Es ideal para las tablets de votación.
- **Pantalla siempre encendida:** mientras la estación está abierta, la pantalla no se apaga (si el navegador lo permite).
- **Abre sin internet:** muestra "Sin conexión" y se reconecta sola. Los votos **nunca** se guardan en la caché: siempre se envían a Google, y una papeleta pendiente se reintenta con el mismo identificador, sin duplicarse.

**Instalar en cada tablet, antes de registrarla:**

| Dispositivo | Cómo |
|---|---|
| Android (Chrome) | Abra `https://SU-SITIO.netlify.app/`. En la pantalla *Registrar estación* toque **Instalar app** (o menú ⋮ → *Instalar aplicación*). |
| iPad / iPhone (Safari) | Toque **Compartir** → **Agregar a inicio**. |

Después abra la app desde el icono de la pantalla de inicio y registre la estación **ahí**. En iPad, la app instalada no comparte datos con Safari: si registra en Safari y luego instala, tendrá que registrarla otra vez.

El panel del staff se usa desde el navegador normal, con su enlace secreto. La app instalada siempre abre la estación de votación.

**Actualizaciones:** cada vez que la app abre con internet, descarga la versión más reciente, así que no hay que reinstalar.

> La PWA solo funciona en el sitio publicado (Netlify). Si la app se sirve desde Apps Script, los navegadores no permiten instalarla.

Los iconos están en `public/icons/`. Si cambia el diseño (`icon.svg`, `icon-maskable.svg`), regenere los PNG con `node scripts/generate-icons.cjs <ruta-a-playwright>`.

---

## 4. Actualizar la app después de cambios

```bash
npm run push
```

Luego en el editor: **Implementar → Gestionar implementaciones → ✏ Editar → Versión: Nueva versión → Implementar**. La URL `/exec` no cambia.

> `clasp push` solo actualiza el código; las tablets ven los cambios cuando se publica una nueva versión de la implementación.

**Si usa Netlify:**
- **Cambios del frontend (`src/`):** basta con hacer `git push`; Netlify vuelve a desplegar solo.
- **Cambios del backend (`apps-script/`):** siguen necesitando `npm run push` y una nueva versión de la implementación, como arriba. La URL `/exec` no cambia, así que no hay que tocar `VITE_GAS_URL`.

---

## 5. Ensayo general

Hágalo unos días antes, con 2–3 tablets reales:

1. **Panel → Candidatos:** cargue los candidatos reales (o pulse *Cargar ejemplo* para practicar).
2. En cada tablet abra el **enlace de las estaciones** y **regístrela** con un nombre (“Mesa 1”, “Mesa 2”…).
3. **Panel → Inicio → Abrir votación.**
4. En cada tablet: 3 toques en la esquina superior izquierda → *Comenzar a votar* → llene la papeleta → *Confirmar*.
5. Pruebe a la vez en varias tablets, pruebe recargar la página después de votar (debe seguir bloqueada) y apague el Wi‑Fi justo al confirmar (al volver la conexión debe registrarse **una sola vez**).
6. Pruebe *Habilitar*, *Reiniciar* y *Bloquear* desde **Panel → Estaciones**.
7. **Cerrar votación** → revise **Resultados**, descargue el CSV y abra *Abrir en Google Sheets*.
8. **Panel → Ajustes → Nueva elección** (marque *Copiar los candidatos*). Esto empieza la elección real con el conteo en cero. Los votos del ensayo **no se borran**: quedan guardados con su propia elección.

---

## 6. Guía para el día de la elección

### Antes de abrir

- [ ] Tablets **cargadas** y conectadas al cargador si es posible.
- [ ] **Bloqueo automático de pantalla desactivado** (Ajustes → Pantalla → Tiempo de espera: máximo / nunca). La app instalada ya pide mantener la pantalla encendida, pero no todos los dispositivos lo respetan.
- [ ] Si usa Netlify: la app **instalada** en cada tablet (sección 3.9).
- [ ] Wi‑Fi estable; tenga un **teléfono con datos como punto de acceso** de respaldo.
- [ ] Abra el enlace de las estaciones en cada tablet y **fíjelo**:
  - **Android:** Ajustes → Seguridad → *Fijar aplicaciones / Fijar pantalla*; luego Recientes → icono de la app → *Fijar*.
  - **iPad:** Ajustes → Accesibilidad → *Acceso guiado* → activar; abrir la página y triple clic en el botón lateral.
- [ ] En el panel: candidatos correctos, todas las estaciones **en línea** (punto verde).
- [ ] **Abrir votación.**

### Por cada votante

1. El staff verifica a la persona en la lista de miembros (control físico).
2. El staff habilita la estación: **3 toques seguidos en la esquina superior izquierda** (o *Habilitar* desde el panel).
3. La persona toca **Comenzar a votar**, elige en las 3 directivas, revisa y **Confirma**.
4. La estación muestra **“¡Su voto fue registrado!”** y queda bloqueada.

### Situaciones comunes

| Situación | Qué hacer |
|---|---|
| La persona se fue sin terminar | Panel → Estaciones → **Reiniciar** (descarta la papeleta a medias; no se registra nada). Si nadie toca la pantalla, a los 4 minutos se limpia sola. |
| “Registrando su voto… Reintentando” | Esperar. El voto se reenvía solo y **nunca se duplica**. No recargue la página. |
| “Su voto NO fue registrado” | Leer el mensaje. Si la votación estaba en pausa, pulsar *Volver a mi papeleta* cuando se reanude. Si no, llamar al encargado. |
| “Sin conexión” | Revisar el Wi‑Fi. La estación se reconecta sola. |
| Hay que hacer una pausa | Panel → **Pausar**. Quien esté votando conserva su papeleta y continúa al **Reanudar**. |
| Una tablet falla | Panel → Estaciones → **Deshabilitar** esa estación y usar otra. |

### Empates

- **Empate por el primer lugar** (p. ej. dos candidatos con 3 votos): la pantalla muestra *Presidente / Vicepresidente · empate*. Los dos ocupan los dos cargos, pero falta definir quién es el titular.
- **Empate por el segundo lugar:** el titular queda definido y el segundo cargo (Vicepresidente o Tesorero) aparece como *empate*.
- El sistema no desempata: la directiva decide según su reglamento (por ejemplo, una segunda vuelta en papel).

### Al cerrar

1. Panel → **Cerrar votación** (es definitivo; bloquea todas las estaciones).
2. **Resultados** → **Descargar CSV** y **Abrir en Google Sheets** (crea la hoja *Resultados*).
3. Si hay papeletas incompletas (alerta roja), revise la hoja `Votes` antes de anunciar. No se cuentan en los resultados.

---

## 7. Guía de administración (panel)

| Sección | Qué permite |
|---|---|
| **Inicio** | Estado de la elección y botones **Abrir / Pausar / Reanudar / Cerrar**. Papeletas registradas, estaciones en línea, “votando ahora”, actividad reciente y alertas. |
| **Candidatos** | Agregar, editar, activar/desactivar y eliminar candidatos por directiva y cargo, con foto opcional (enlace `https://`). **Solo antes de abrir la votación.** Luego quedan congelados. |
| **Estaciones** | Tabla con estado y última actividad. Acciones: **Habilitar** (siguiente votante), **Bloquear**, **Reiniciar**, **Deshabilitar**, **Actividad**. Ninguna acción toca los votos. |
| **Resultados** | Ocultos hasta cerrar la votación (salvo que active *Resultados en vivo* en Ajustes). Votos y % por candidato, ganador por cargo, empates, CSV y exportación a Google Sheets. Se actualizan cada 4 s. |
| **Ajustes** | Nombre y descripción de la elección, resultados en vivo, botón de la pantalla de resultados, historial y **Nueva elección**. |
| **Pantalla de resultados** (`#/pantalla`) | Resultados en grande, sin sidebar ni menús, para proyector o TV. Muestra el ganador de cada cargo y las barras de todos los candidatos, y se actualiza sola cada 4 s. Mientras los resultados estén ocultos solo muestra el número de papeletas. Se abre con el botón *Pantalla de resultados* (en Resultados o Ajustes) o directamente con su enlace. Pulse **F11** para pantalla completa. |

**Estados de la elección:** *En preparación* → *Abierta* ⇄ *En pausa* → *Cerrada* (final).

**Estados de una estación:** *Habilitada* (lista para 1 papeleta) · *Votando* · *Bloqueada* · *Deshabilitada*.

---

## 8. Seguridad y anonimato

- **Anonimato:** la hoja `Votes` solo guarda `vote_id, ballot_id, election_id, category_id, position_id, candidate_id` y la **fecha (sin hora)**. No guarda la estación, la hora exacta ni ningún dato del votante. Cada papeleta se inserta en una **posición aleatoria** de la hoja, así el orden de las filas no permite saber quién votó primero. El registro de actividad dice “papeleta registrada en Mesa 1” pero nunca guarda qué se votó.
- **Una papeleta por desbloqueo:** el servidor solo acepta votos de estaciones *Habilitadas* y las bloquea al registrar. El control de quién vota lo hace el staff en persona.
- **Sin duplicados:** cada papeleta lleva un identificador generado antes de enviarse. Los reintentos usan el mismo y el servidor lo reconoce.
- **Todo o nada:** las 12 filas de una papeleta se escriben con una sola operación dentro de `LockService`. Si algo quedara incompleto, se excluye del conteo y se avisa en el panel.
- **Validación en el servidor:** elección abierta, estación habilitada, 6 votaciones, un candidato válido por votación y de la directiva correcta.
- **Estaciones:** cada tablet tiene un token aleatorio. En la hoja solo se guarda su hash SHA‑256. El identificador de la estación no sirve como credencial.
- **Desbloqueo:** 3 toques seguidos (menos de 0,7 s entre cada uno) en un cuadrado de 160 px de la esquina superior izquierda. Toques lentos o en otro lugar reinician la cuenta. Es un gesto del staff para evitar habilitaciones accidentales, no una contraseña: el control de quién vota es físico.
- **Panel:** protegido por la llave secreta del enlace. Las estaciones nunca reciben resultados: la API de las estaciones no tiene esa función.
- **Funciones internas:** todas terminan en `_`, así que el navegador no puede llamarlas. Las funciones de editor (`setupDatabase`, `mostrarDatosAdmin`, `diagnostico`) rechazan a cualquiera que no sea el dueño.

---

## 9. Limitaciones conocidas

Google Sheets no es una base de datos segura de nivel bancario. Esto es lo que **no** se puede impedir técnicamente:

| Limitación | Mitigación |
|---|---|
| El **dueño de la cuenta de Google** puede editar la hoja a mano. | Cuenta dedicada con contraseña conocida por 2 personas. **No comparta** la hoja. El *Historial de versiones* de Sheets (Archivo → Historial de versiones) registra cualquier edición manual. Exporte y publique el CSV al cerrar. |
| **Sin PIN en las estaciones**: cualquiera que tenga el enlace de votación puede registrar una tablet y habilitarla con los 3 toques. | Abra el enlace de las estaciones solo en las tablets de la iglesia y no lo publique. El panel muestra todas las estaciones registradas: deshabilite cualquiera que no reconozca. El control de quién vota lo hace el staff en persona. |
| **Sin login**: quien obtenga el enlace del panel puede administrar. | Comparta el enlace solo con el staff. Si se filtra: en *Propiedades de la secuencia de comandos* borre `ADMIN_KEY` y ejecute `setupDatabase` (genera una llave nueva) y luego `mostrarDatosAdmin`. |
| Cuotas de Apps Script: todas las llamadas cuentan contra el límite de **30 ejecuciones simultáneas** del dueño. | 10 tablets y el panel están muy por debajo. Las consultas son cortas y se pausan cuando la pestaña está oculta. |
| Cada llamada tarda entre 0,4 y 1,5 s. | La interfaz muestra estados de carga y reintenta sola. |
| Google muestra un banner arriba (“Esta aplicación fue creada por un usuario de Google Apps Script”). | Es solo estético. |
| Safari (iPad) puede borrar el almacenamiento local y la tablet “olvida” su registro. | Los votos no se pierden. Deshabilite la estación vieja y registre la tablet otra vez. |
| La descarga de CSV puede no funcionar en algunos iPad. | Use **Abrir en Google Sheets** (hoja *Resultados*) o descargue desde una computadora. |

---

## 10. Estructura del proyecto

```
apps-script/              Backend (Google Apps Script)
  Code.gs                 doGet + kioskApi / adminApi (lista blanca de acciones)
  Database.gs             setupDatabase, mostrarDatosAdmin, diagnostico, helpers de hojas
  Elections.gs            ciclo de vida de la elección
  Candidates.gs           CRUD de candidatos + datos de ejemplo
  Voting.gs               registerVote_ (lock, idempotencia, inserción aleatoria)
  Devices.gs              estaciones: registro, estado, desbloqueo, acciones remotas
  Results.gs              conteo, integridad, dashboard, exportación
  Security.gs             SHA-256, tokens de estación, llave del panel
  Audit.gs, Admin.gs, Utils.gs
  appsscript.json         V8, app web: ejecutar como dueño, acceso anónimo
  Index.html              (generado por npm run build:gas, no editar)
src/
  pages/                  VotingPage, AdminApp, Dashboard/Candidates/Devices/Results/SettingsPage, BigResultsPage
  components/voting/      Bienvenida, papeleta, revisión, bloqueo, registro
  components/admin/       Layout con sidebar, tabla de estaciones, controles, formulario
  components/dashboard/   Tarjetas, actividad, barras de resultados
  context/                KioskContext + kioskReducer (máquina de estados), AdminContext
  hooks/                  usePolling, useIdleTimer, useUnlockSequence
  services/               googleScript (puente), voting/device/adminService, mockBackend (solo dev)
  emulator/               Emulador de SpreadsheetApp, LockService, CacheService… para dev y tests
  utils/                  gesto de desbloqueo, papeleta, CSV, formatos
tests/                    Vitest: servidor real en el emulador + lógica del cliente
```

**Configuración del gesto de desbloqueo:** `src/utils/unlockSequence.js` (`UNLOCK_CONFIG`). Allí se cambian el número de toques, el tamaño de la esquina y el tiempo máximo entre toques.

---

## 11. Solución de problemas

| Problema | Solución |
|---|---|
| “Enlace de administración inválido” | El enlace debe incluir `?view=admin&key=…` completo. Ejecute `mostrarDatosAdmin` para verlo. |
| “El sistema no está configurado” | Ejecute `setupDatabase` en el editor. |
| `setupDatabase` dice “solo puede ejecutarse desde el editor” | Ejecútela con la cuenta **dueña** del script y acepte todos los permisos solicitados (incluido ver su correo electrónico, que se usa para comprobar que es el dueño). |
| “Faltan candidatos en: …” al abrir | Cada votación (Presidencia y Secretaría de cada directiva) necesita **al menos 2 candidatos activos**, para que haya titular y segundo. |
| “Ya hay 10 estaciones activas” | Deshabilite estaciones viejas en Panel → Estaciones. |
| Cambié el código y las tablets no lo ven | Publique una **nueva versión** de la implementación (sección 4). |
| `clasp push` falla con “User has not enabled the Apps Script API” | Active la API en <https://script.google.com/home/usersettings>. |
