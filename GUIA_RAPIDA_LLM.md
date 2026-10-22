# Guía Rápida — Instalar y Usar `mongodb-vector-skill` desde el Chat de tu LLM (v1.7.1)

Esta guía está diseñada para que **no tengas que ejecutar comandos manuales en la terminal**. Todo el proceso de instalación, configuración y consulta se realiza **conversando directamente con tu agente LLM** (Antigravity, Claude Code, Cursor, Windsurf, etc.).

> [!IMPORTANT]
> **Requisito de Red (VPN):** Para poder conectarse, obtener información (búsqueda semántica) e ingestar documentos en la **bóveda de conocimiento de MongoDB Atlas**, **debes estar conectado por medio de la VPN corporativa**.

---

## Parte 1: Instalación desde el Chat de tu LLM (en 3 Prompts)

Solo copia y pega los siguientes mensajes en el chat de tu asistente de IA.

### Paso 1: Pedirle al LLM que descargue e instale la Skill desde GitHub

Copia y pega este prompt en el chat de tu LLM:

> **Prompt de instalación:**
> ```text
> Por favor instala la skill que se encuentra en el repositorio https://github.com/jacolinv/mongodb-vector-skill dentro de la carpeta .agents/skills/mongodb-vector-skill de mi espacio de trabajo (o clona el repositorio), instala sus dependencias de Node.js (npm install) y Python (requirements.txt), y registra su servidor MCP (mcp-server.js) en tu configuración de herramientas MCP como "mongodb-vector-skill".
> ```

**¿Qué hará el LLM automáticamente por ti?**
1. Clonará `https://github.com/jacolinv/mongodb-vector-skill`.
2. Instalará los paquetes de Node.js (`@modelcontextprotocol/sdk`, `mongodb`, `voyageai`, `dotenv`) y Python.
3. Registrará `mcp-server.js` como servidor MCP activo para que pueda usar las herramientas de búsqueda e ingesta.

---

### Paso 2: Entregarle el archivo `.env` al LLM

Si un compañero del equipo te compartió el archivo `.env` (o las variables de conexión), tienes **dos opciones** desde el chat:

#### Opción A — Si ya descargaste el archivo `.env` en tu computadora
Dile al LLM dónde está para que él lo coloque en el lugar correcto:

> **Prompt (Opción A):**
> ```text
> Toma el archivo .env que tengo en [ruta/donde/descargaste/.env] y cópialo dentro de .agents/skills/mongodb-vector-skill/.env.
> ```

#### Opción B — Pegar las variables directamente en el chat
Pégale este mensaje al LLM con tus credenciales para que él mismo cree el archivo `.env`:

> **Prompt (Opción B):**
> ```text
> Crea el archivo .agents/skills/mongodb-vector-skill/.env con las siguientes variables de entorno:
>
> MONGODB_URI="mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/"
> MONGODB_DB="knowledgeVectors"
> MONGODB_COLLECTION="knowledge"
> VECTOR_INDEX_NAME="vector_index"
> VOYAGE_API_KEY="<tu_voyage_api_key>"
> CHUNK_SIZE=1500
> CHUNK_OVERLAP_SENTENCES=1
> GOOGLE_CHAT_WEBHOOK_URL="<webhook_url>"
> ATLASSIAN_DOMAIN="https://liverpooldigital.atlassian.net/wiki/spaces/CU/overview?homepageId=1763246536"
> CONFLUENCE_ALLOWED_SPACES="CU"
> JIRA_ALLOWED_PROJECTS="CM,CPI,CUD,CUQ"
> ATLASSIAN_API_TOKEN="<tu_atlassian_api_token>"
> ```

---

### Paso 3: Pedirle al LLM que valide la conexión

Asegúrate de tener **activa tu VPN** y envíale este prompt para confirmar que todo funciona:

> **Prompt de verificación:**
> ```text
> /mongodb-vector-skill Ejecuta una prueba rápida de la skill mongodb-vector-skill para confirmar que tienes acceso a:
> 1. La bóveda de conocimiento en MongoDB Atlas (knowledgeVectors.knowledge)
> 2. Confluence en el espacio CU (Comercio Unificado)
> 3. Jira en los proyectos CM, CPI, CUD y CUQ
> ```

---

## Parte 2: Ejemplos de Uso en el Chat del LLM

> [!TIP]
> **Recuerda indicar `/mongodb-vector-skill`:** Al escribir tus consultas en el chat del LLM, antepón o incluye **`/mongodb-vector-skill`** para indicarle explícitamente al agente que ejecute la búsqueda o ingesta a través de esta skill (`search_knowledge`, `ingest_file`, `search_confluence`, `read_confluence_page`, `search_jira_issues`, `read_jira_issue`).

---

### 1. Bóveda de Conocimiento en MongoDB Atlas (`knowledgeVectors.knowledge`)

> [!IMPORTANT]
> Recuerda mantener tu **conexión a la VPN activa** siempre que vayas a conectarte, obtener fragmentos de la bóveda de conocimiento de MongoDB o ingestar nuevos documentos.

Aquí se almacena la documentación técnica, diagramas de arquitectura, PDFs, archivos de Office y código fuente vectorizado.

#### A. Consultar u obtener información de la bóveda (Búsqueda Semántica)
> **Prompts de ejemplo:**
> - `"/mongodb-vector-skill Busca en la bóveda de conocimiento de MongoDB cómo funciona el flujo de órdenes y pagos en Comercio Unificado."`
> - `"/mongodb-vector-skill Consulta en la bóveda de MongoDB qué microservicios participan en el proceso de checkout y muéstrame los documentos fuente."`
> - `"/mongodb-vector-skill Busca en MongoDB únicamente en archivos de tipo markdown o pdf la documentación sobre arquitectura de inventarios."`

#### B. Subir / Ingestar nuevos documentos a MongoDB desde el chat
> **Prompts de ejemplo:**
> - `"/mongodb-vector-skill Ingesta el archivo /ruta/a/mi/documento_arquitectura.pdf en la bóveda de conocimiento de MongoDB."`
> - `"/mongodb-vector-skill Sube toda la carpeta /ruta/a/mis/documentos a la bóveda de conocimiento de MongoDB y avísame cuántos fragmentos se guardaron."`

---

### 2. Confluence (`CU` — Comercio Unificado)

El LLM consulta en tiempo real las páginas de Confluence dentro del espacio autorizado **`CU`**.

#### A. Buscar páginas y documentación en Confluence
> **Prompts de ejemplo:**
> - `"/mongodb-vector-skill Busca en Confluence (espacio CU) todas las páginas relacionadas con pasarelas de pago o devoluciones."`
> - `"/mongodb-vector-skill Lista las páginas de Confluence creadas o actualizadas recientemente en el espacio CU sobre arquitectura de Punto de Venta."`
> - `"/mongodb-vector-skill Busca en Confluence usando CQL: space = \"CU\" AND type = page AND title ~ \"Arquitectura\"."`

#### B. Leer el contenido completo de una página de Confluence
> **Prompts de ejemplo:**
> - `"/mongodb-vector-skill Lee la página de Confluence con ID 5370806273 y hazme un resumen de los puntos clave y acuerdos."`
> - `"/mongodb-vector-skill Busca la página principal de Comercio Unificado en Confluence, léela completa y extrae la tabla de servicios."`

---

### 3. Jira (`CM`, `CPI`, `CUD`, `CUQ` — Comercio Unificado)

El LLM consulta tickets, historias de usuario, épicas y bugs en tiempo real dentro de los proyectos autorizados:
- **`CM`** — Comercio Unificado
- **`CPI`** — Comercio Unificado Punto de Venta
- **`CUD`** — Comercio Unificado Desarrollo
- **`CUQ`** — Comercio Unificado QA

#### A. Buscar tickets e incidencias en Jira
> **Prompts de ejemplo:**
> - `"/mongodb-vector-skill Busca en Jira los últimos 10 tickets actualizados del proyecto CUD y muéstrame su clave, resumen, estado y responsable."`
> - `"/mongodb-vector-skill Busca en Jira todos los bugs abiertos o en progreso en los proyectos CUQ y CPI."`
> - `"/mongodb-vector-skill Ejecuta esta búsqueda JQL en Jira: project IN (CM, CUD) AND status != Done ORDER BY updated DESC."`

#### B. Leer el detalle y comentarios de un ticket específico
> **Prompts de ejemplo:**
> - `"/mongodb-vector-skill Lee el detalle completo del ticket CM-3 en Jira, incluyendo su descripción y los últimos comentarios."`
> - `"/mongodb-vector-skill Revisa el ticket CUD-125 en Jira y dime qué criterios de aceptación tiene y cuál es su estado actual."`

---

### 4. Consultas Combinadas (MongoDB + Confluence + Jira en un solo Prompt)

El mayor valor de la skill es pedirle al LLM que cruce las tres fuentes en una sola conversación (recuerda tener la **VPN activa** para el acceso a MongoDB):

> **Prompts combinados de ejemplo:**
> - `"/mongodb-vector-skill Revisa el ticket CM-3 en Jira, busca en Confluence (CU) la documentación funcional asociada y consulta en la bóveda de conocimiento de MongoDB los componentes técnicos relacionados para darme un plan de implementación."`
> - `"/mongodb-vector-skill Compara lo que dice la especificación en Confluence (CU) sobre el módulo de cobro contra la documentación técnica indexada en MongoDB y dime si hay tickets abiertos en Jira (CUD o CUQ) sobre ese tema."`
> - `"/mongodb-vector-skill Lee la página 5370806273 de Confluence y, si es relevante para el equipo, guárdala/ingéstala también en la bóveda de conocimientos de MongoDB."`

---

## Solución Rápida de Problemas (Pídeselo al LLM)

Si algo falla, verifica primero estos dos puntos o pídele a tu LLM que lo diagnostique:

- **Si no puedes conectarte, consultar o ingestar documentos en MongoDB Atlas (timeout / error de red):**
  - Verifica que estés **conectado a la VPN**. Sin la VPN activa, el clúster `gcp-knowledge-mongodb-d.2mbsf.mongodb.net` no permitirá la conexión para obtener ni ingestar documentos.
- **Si agregaste o actualizaste credenciales en `.env`:**
  > `"/mongodb-vector-skill Acabo de actualizar el archivo .env de mongodb-vector-skill, por favor reinicia o recarga el servidor MCP y vuelve a probar la conexión."`
