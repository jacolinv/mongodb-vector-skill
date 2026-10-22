# Manual de Instalación y Configuración — `mongodb-vector-skill` v1.7.1

> **Marco Documental Diátaxis**
> Este manual está estructurado siguiendo los principios del framework **Diátaxis** para cubrir las cuatro necesidades del usuario:
> 1. **Guías Prácticas (How-To Guides)**: Pasos exactos de instalación, configuración de `.env`, creación del índice en MongoDB Atlas e integración MCP.
> 2. **Tutorial (Learning-Oriented)**: Verificación de extremo a extremo desde la validación estática hasta la primera consulta vectorial y de Atlassian.
> 3. **Referencia Técnica (Reference)**: Diccionario exhaustivo de variables de entorno, parámetros de herramientas MCP, extensiones soportadas y modelos de embeddings.
> 4. **Explicación (Explanation)**: Decisiones de arquitectura, control de versiones por checksum MD5 y aislamiento del protocolo `stdio`.

---

## Tabla de Contenidos

1. [Parte 1 — Guías Prácticas (How-To): Instalación y Configuración Paso a Paso](#parte-1--guías-prácticas-how-to-instalación-y-configuración-paso-a-paso)
   - [1.1 Requisitos Previos del Sistema](#11-requisitos-previos-del-sistema)
   - [1.2 Cómo Instalar el Repositorio y Dependencias (Node.js y Python)](#12-cómo-instalar-el-repositorio-y-dependencias-nodejs-y-python)
   - [1.3 Cómo Configurar las Variables de Entorno (`.env`)](#13-cómo-configurar-las-variables-de-entorno-env)
   - [1.4 Cómo Crear el Índice de Búsqueda Vectorial en MongoDB Atlas](#14-cómo-crear-el-índice-de-búsqueda-vectorial-en-mongodb-atlas)
   - [1.5 Cómo Configurar las Credenciales de Atlassian Cloud (Confluence y Jira)](#15-cómo-configurar-las-credenciales-de-atlassian-cloud-confluence-y-jira)
   - [1.6 Cómo Registrar el Servidor MCP en tu Cliente de IA](#16-cómo-registrar-el-servidor-mcp-en-tu-cliente-de-ia)
2. [Parte 2 — Tutorial: Validación y Primera Ejecución de Extremo a Extremo](#parte-2--tutorial-validación-y-primera-ejecución-de-extremo-a-extremo)
   - [Paso 1: Ejecutar la Validación Estática](#paso-1-ejecutar-la-validación-estática)
   - [Paso 2: Ingerir Documentos con Etiqueta de Versión](#paso-2-ingerir-documentos-con-etiqueta-de-versión)
   - [Paso 3: Probar las Herramientas MCP (MongoDB + Atlassian)](#paso-3-probar-las-herramientas-mcp-mongodb--atlassian)
3. [Parte 3 — Referencia Técnica](#parte-3--referencia-técnica)
   - [3.1 Diccionario de Variables de Entorno (`.env`)](#31-diccionario-de-variables-de-entorno-env)
   - [3.2 Especificación de Herramientas del Servidor MCP (`mcp-server.js`)](#32-especificación-de-herramientas-del-servidor-mcp-mcp-serverjs)
   - [3.3 Matriz de Extensiones Soportadas y Modelos Voyage AI](#33-matriz-de-extensiones-soportadas-y-modelos-voyage-ai)
   - [3.4 Esquema BSON del Documento en MongoDB Atlas](#34-esquema-bson-del-documento-en-mongodb-atlas)
   - [3.5 Guía de Diagnóstico y Resolución de Errores](#35-guía-de-diagnóstico-y-resolución-de-errores)
4. [Parte 4 — Explicación de Arquitectura](#parte-4--explicación-de-arquitectura)
   - [4.1 Separación de Responsabilidades: Ingesta Python vs. Servidor MCP Node.js](#41-separación-de-responsabilidades-ingesta-python-vs-servidor-mcp-nodejs)
   - [4.2 Idempotencia por Checksum MD5 y Etiquetado de Versiones](#42-idempotencia-por-checksum-md5-y-etiquetado-de-versiones)
   - [4.3 Pureza del Canal `stdio` en el Protocolo MCP](#43-pureza-del-canal-stdio-en-el-protocolo-mcp)
5. [Parte 5 — Formas de Uso, Catálogo de Prompts y Recomendaciones (Best Practices)](#parte-5--formas-de-uso-catálogo-de-prompts-y-recomendaciones-best-practices)
   - [5.1 Las 4 Formas de Uso de `mongodb-vector-skill`](#51-las-4-formas-de-uso-de-mongodb-vector-skill)
   - [5.2 Catálogo de Prompts Recomendados para el Agente IA](#52-catálogo-de-prompts-recomendados-para-el-agente-ia)
   - [5.3 Recomendaciones de Ajuste para Búsqueda Vectorial (`limit` y `numCandidates`)](#53-recomendaciones-de-ajuste-para-búsqueda-vectorial-limit-y-numcandidates)
   - [5.4 Recomendaciones de Segmentación (`CHUNK_SIZE`) e Ingesta Masiva](#54-recomendaciones-de-segmentación-chunk_size-e-ingesta-masiva)
   - [5.5 Buenas Prácticas para Consultas a Confluence y Jira](#55-buenas-prácticas-para-consultas-a-confluence-y-jira)
   - [5.6 Recomendaciones de Seguridad, Costos y Gobierno de Datos](#56-recomendaciones-de-seguridad-costos-y-gobierno-de-datos)

---

## Parte 1 — Guías Prácticas (How-To): Instalación y Configuración Paso a Paso

### 1.1 Requisitos Previos del Sistema

Antes de iniciar la instalación, verifica que tu estación de trabajo cumpla con los siguientes requisitos:

| Componente | Versión Mínima | Comando de Verificación | Propósito |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `node --version` | Ejecución del servidor MCP (`mcp-server.js`) y SDK `@modelcontextprotocol/sdk`. |
| **npm** | `>= 10.0.0` | `npm --version` | Gestión de paquetes JavaScript (`mongodb`, `dotenv`, MCP SDK). |
| **Python** | `>= 3.10` | `python3 --version` | Pipeline de ingesta (`ingest.py`), extracción multimodal y cliente `voyageai`. |
| **MongoDB Atlas** | Cluster M0 / M10+ | Acceso a Atlas UI | Base de datos vectorial con soporte para `$vectorSearch`. |
| **Voyage AI** | API Key activa | Cuenta en `dash.voyageai.com` | Generación de vectores de `1024` dimensiones (`voyage-4-large` y `voyage-multimodal-3.5`). |
| **Atlassian Cloud** | API Token (Opcional) | Cuenta corporativa Atlassian | Consultas MCP a Confluence Wiki y Jira Issues. |

---

### 1.2 Cómo Instalar el Repositorio y Dependencias (Node.js y Python)

Sigue estos pasos para instalar la skill dentro del directorio de skills de tu agente (`.agents/skills/mongodb-vector-skill`):

#### 1. Clonar el repositorio

```bash
mkdir -p .agents/skills
git clone https://github.com/jacolinv/mongodb-vector-skill.git .agents/skills/mongodb-vector-skill
cd .agents/skills/mongodb-vector-skill
```

#### 2. Instalar las dependencias de Node.js (Servidor MCP)

```bash
npm install
```

Este comando instala los paquetes declarados en `package.json` (`@modelcontextprotocol/sdk`, `mongodb` y `dotenv`).

#### 3. Crear el entorno virtual e instalar las dependencias de Python (Pipeline de Ingesta)

Se recomienda utilizar un entorno virtual (`.venv`) para aislar las librerías de procesamiento de documentos y visión:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install pymupdf pillow voyageai python-dotenv python-docx openpyxl pymongo certifi
```

---

### 1.3 Cómo Configurar las Variables de Entorno (`.env`)

El archivo `.env` ubicado en `.agents/skills/mongodb-vector-skill/.env` centraliza tanto la configuración del pipeline de ingesta en Python como las credenciales del servidor MCP en Node.js.

1. Abre el archivo `.env` incluido en la raíz de la skill.
2. Completa los valores siguiendo esta plantilla:

```env
# ============================================================================
# 1. CONFIGURACIÓN DE MONGODB ATLAS
# ============================================================================
MONGODB_URI="mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="knowledgeVectors"
MONGODB_COLLECTION="knowledge"
VECTOR_INDEX_NAME="vector_index"

# ============================================================================
# 2. CONFIGURACIÓN DE VOYAGE AI (EMBEDDINGS)
# ============================================================================
VOYAGE_API_KEY="pa-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================================================
# 3. PARÁMETROS DE INGESTA Y SEGMENTACIÓN (CHUNKING)
# ============================================================================
DOCUMENTS_PATH="/ruta/absoluta/a/tus/documentos"
DOCUMENT_VERSION="1.0.0"
CHUNK_SIZE=1500
CHUNK_OVERLAP_SENTENCES=1
EMBED_BATCH_SIZE=8

# ============================================================================
# 4. NOTIFICACIONES A GOOGLE CHAT (OPCIONAL)
# ============================================================================
GOOGLE_CHAT_WEBHOOK_URL="https://chat.googleapis.com/v1/spaces/XXXXX/messages?key=YYYYY&token=ZZZZZ"

# ============================================================================
# 5. INTEGRACIÓN CON ATLASSIAN CLOUD: CONFLUENCE Y JIRA (v1.7.0)
# ============================================================================
ATLASSIAN_DOMAIN="https://tu-organizacion.atlassian.net"
ATLASSIAN_USER="tu-correo@empresa.com.mx"
ATLASSIAN_API_TOKEN="ATATT3xFfGF0..."
```

> [!CAUTION]
> Nunca subas credenciales reales al control de versiones. Asegúrate de que `.env` esté listado en `.gitignore` o contenga únicamente cadenas vacías (`""`) antes de hacer `git push`.

---

### 1.4 Cómo Crear el Índice de Búsqueda Vectorial en MongoDB Atlas

Para que la herramienta `mongodb_vector_search` funcione, la colección configurada (`knowledgeVectors.knowledge`) debe contar con un índice activo en **Atlas Vector Search**.

1. Ingresa a [MongoDB Atlas](https://cloud.mongodb.com/) y selecciona tu Cluster.
2. En el menú lateral izquierdo, haz clic en **Atlas Search** -> **Create Search Index**.
3. Selecciona **Atlas Vector Search** -> **JSON Editor** y haz clic en **Next**.
4. Configura los siguientes datos:
   - **Database and Collection**: Selecciona la base de datos `knowledgeVectors` y la colección `knowledge`.
   - **Index Name**: Escribe exactamente `vector_index` (o el valor que hayas definido en `VECTOR_INDEX_NAME`).
5. Pega la siguiente definición JSON:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

6. Haz clic en **Next** y luego en **Create Search Index**. Espera a que el estado del índice cambie a **Active**.

---

### 1.5 Cómo Configurar las Credenciales de Atlassian Cloud (Confluence y Jira)

La versión `1.7.0` incorpora cuatro herramientas MCP para consultar Confluence y Jira directamente desde tu agente de IA. Para habilitarlas:

1. Ingresa a [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Haz clic en **Create API token**, asígnale una etiqueta descriptiva (por ejemplo, `mongodb-vector-skill-mcp`) y copia el token generado.
3. En tu archivo `.env`, configura:
   - `ATLASSIAN_DOMAIN`: La URL base de tu instancia (ej. `https://liverpooldigital.atlassian.net`). El servidor MCP limpia automáticamente cualquier sufijo como `/wiki` o `/jira`.
   - `ATLASSIAN_USER`: El correo electrónico exacto con el que inicias sesión en Atlassian Cloud (verifica el dominio completo, por ejemplo `@liverpool.com.mx`).
   - `ATLASSIAN_API_TOKEN`: El token copiado en el paso 2.

---

### 1.6 Cómo Registrar el Servidor MCP en tu Cliente de IA

Para que tu asistente de IA (Antigravity, Claude Desktop, Claude Code, Cursor, etc.) descubra y ejecute las herramientas de `mongodb-vector-skill`, registra `mcp-server.js` en el archivo de configuración MCP de tu cliente:

- **Antigravity**: `~/.gemini/antigravity/mcp_config.json`
- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Agrega la entrada `mongodb-vector-mcp` dentro del objeto `"mcpServers"`:

```json
{
  "mcpServers": {
    "mongodb-vector-mcp": {
      "command": "node",
      "args": [
        "/ruta/absoluta/a/.agents/skills/mongodb-vector-skill/mcp-server.js"
      ],
      "env": {
        "MONGODB_URI": "mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority",
        "MONGODB_DB": "knowledgeVectors",
        "MONGODB_COLLECTION": "knowledge",
        "VECTOR_INDEX_NAME": "vector_index",
        "ATLASSIAN_DOMAIN": "https://tu-organizacion.atlassian.net",
        "ATLASSIAN_USER": "tu-correo@empresa.com.mx",
        "ATLASSIAN_API_TOKEN": "ATATT3xFfGF0..."
      }
    }
  }
}
```

> [!TIP]
> Como `mcp-server.js` carga automáticamente el archivo `.env` ubicado en su mismo directorio (usando `dotenv.config({ path: path.join(__dirname, ".env"), quiet: true })`), puedes omitir el bloque `"env"` en `mcp_config.json` si ya configuraste `.agents/skills/mongodb-vector-skill/.env`.

---

## Parte 2 — Tutorial: Validación y Primera Ejecución de Extremo a Extremo

En este tutorial comprobarás que la instalación de la versión `1.7.0` funciona de principio a fin.

### Paso 1: Ejecutar la Validación Estática

Desde el directorio `.agents/skills/mongodb-vector-skill`, ejecuta:

```bash
npm test
```

**Resultado esperado:**

```text
> @jacolinv/mongodb-vector-skill@1.7.0 test
> node --check mcp-server.js && python3 -m compileall -q chunker.py embeddings.py loaders.py mongodb.py ingest.py
```

Si el comando termina con código de salida `0` y sin mensajes de error, tanto la sintaxis JavaScript del servidor MCP como los módulos Python de ingesta son válidos.

### Paso 2: Ingerir Documentos con Etiqueta de Versión

Ejecuta el script `ingest.py` pasándole la ruta de una carpeta con documentación y la bandera `--version`:

```bash
python3 ingest.py /ruta/a/documentos --version "1.7.0"
```

**¿Qué ocurre durante este paso?**
1. `ingest.py` escanea recursivamente todos los archivos soportados.
2. Calcula el hash `MD5` de cada archivo y consulta MongoDB Atlas para evitar reprocesar archivos sin cambios.
3. Si el archivo ya existe con el mismo `checksum` pero diferente versión, actualiza únicamente el metadato `version`.
4. Si el archivo es nuevo o cambió, extrae su contenido con `loaders.py`, lo divide en fragmentos con `chunker.py`, genera embeddings de `1024` dimensiones con Voyage AI e inserta los documentos en MongoDB Atlas.
5. Al finalizar todo el lote, envía un único mensaje de resumen al webhook de Google Chat (si `GOOGLE_CHAT_WEBHOOK_URL` está configurado).

### Paso 3: Probar las Herramientas MCP (MongoDB + Atlassian)

Una vez reiniciado tu cliente MCP, solicita a tu agente cualquiera de estas acciones para verificar las herramientas en vivo:

1. **Búsqueda por ID en MongoDB (`find_by_document_id`)**:
   > *"Busca en MongoDB el documento con `documentId` igual a `README.md`"*
2. **Búsqueda en Confluence (`search_confluence` y `read_confluence_page`)**:
   > *"Busca en Confluence los documentos actualizados en los últimos 15 días y muestra el contenido de la página resultante"*
3. **Búsqueda en Jira (`search_jira_issues` y `read_jira_issue`)**:
   > *"Consulta los últimos 5 tickets actualizados en Jira en los últimos 15 días"*

---

## Parte 3 — Referencia Técnica

### 3.1 Diccionario de Variables de Entorno (`.env`)

| Variable | Requerida | Valor por Defecto | Componente que la usa | Descripción Técnica |
| :--- | :---: | :--- | :--- | :--- |
| `MONGODB_URI` | **Sí** | — | `ingest.py`, `mcp-server.js` | Cadena de conexión SRV (`mongodb+srv://...`) a MongoDB Atlas. |
| `MONGODB_DB` | No | `knowledgeVectors` | `ingest.py`, `mcp-server.js` | Nombre de la base de datos en MongoDB Atlas. |
| `MONGODB_COLLECTION` | No | `knowledge` | `ingest.py`, `mcp-server.js` | Nombre de la colección donde se almacenan los vectores y chunks. |
| `VECTOR_INDEX_NAME` | No | `vector_index` | `mcp-server.js` | Nombre del índice configurado en Atlas Vector Search. |
| `VOYAGE_API_KEY` | **Sí** (Ingesta/Query) | — | `embeddings.py` | API Key de Voyage AI para generar embeddings de documentos y consultas. |
| `DOCUMENTS_PATH` | No | `./documents` | `ingest.py`, `force_ingest.py` | Ruta local por defecto cuando no se pasa argumento por CLI. |
| `DOCUMENT_VERSION` | No | `None` | `ingest.py` | Etiqueta de versión por defecto si no se especifica `--version` en CLI. |
| `CHUNK_SIZE` | No | `1500` | `ingest.py` (`chunker.py`) | Tamaño máximo aproximado en caracteres por cada fragmento de texto. |
| `CHUNK_OVERLAP_SENTENCES` | No | `1` | `ingest.py` (`chunker.py`) | Cantidad de oraciones que se solapan entre un chunk y el siguiente. |
| `EMBED_BATCH_SIZE` | No | `8` | `ingest.py` | Cantidad de bloques enviados por lote a la API de Voyage AI. |
| `GOOGLE_CHAT_WEBHOOK_URL` | No | `""` | `ingest.py` | URL del Webhook de Google Chat para la notificación consolidada de fin de ingesta. |
| `ATLASSIAN_DOMAIN` | No* | `""` | `mcp-server.js` | Dominio de Atlassian Cloud (*Requerido para herramientas de Confluence/Jira). |
| `ATLASSIAN_USER` | No* | `""` | `mcp-server.js` | Correo de la cuenta Atlassian (*Requerido para herramientas de Confluence/Jira). |
| `ATLASSIAN_API_TOKEN` | No* | `""` | `mcp-server.js` | API Token de Atlassian (*Requerido para herramientas de Confluence/Jira). |

---

### 3.2 Especificación de Herramientas del Servidor MCP (`mcp-server.js`)

El servidor `mongodb-vector-mcp` (`v1.7.0`) expone **6 herramientas** a través del protocolo MCP:

#### 1. `mongodb_vector_search`
Ejecuta el pipeline de agregación `$vectorSearch` en MongoDB Atlas.

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `vector` | `number[]` | **Sí** | — | Arreglo de `1024` números de punto flotante generado con `VoyageEmbedding.embed_query()`. |
| `limit` | `number` | No | `5` | Cantidad máxima de fragmentos devueltos. |
| `numCandidates` | `number` | No | `50` | Número de vecinos aproximados evaluados por el índice HNSW. |
| `path` | `string` | No | `"embedding"` | Campo del documento donde reside el vector. |

#### 2. `find_by_document_id`
Realiza una búsqueda exacta (`collection.find({ documentId })`) sobre MongoDB Atlas.

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `documentId` | `string` | **Sí** | — | Nombre o identificador del documento (ej. `"normativa_mongodb.pdf"`). |

#### 3. `search_confluence`
Busca páginas en Confluence mediante el endpoint `/wiki/rest/api/content/search`.

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `query` | `string` | **Sí** | — | Texto libre o consulta CQL (ej. `type=page AND lastModified >= now("-15d")`). |
| `limit` | `number` | No | `10` | Número máximo de páginas a devolver. |

#### 4. `read_confluence_page`
Recupera el título, espacio, URL y contenido textual limpio (`body.storage`) de una página de Confluence por su ID (`/wiki/rest/api/content/{pageId}`).

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `pageId` | `string` | **Sí** | — | Identificador numérico de la página en Confluence (ej. `"2823684097"`). |

#### 5. `search_jira_issues`
Busca tickets en Jira Cloud usando el endpoint `/rest/api/3/search/jql`.

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `jql` | `string` | No | `"updated >= -30d ORDER BY updated DESC"` | Consulta JQL acotada (Jira Cloud exige que la consulta tenga un filtro acotado como `updated >= -15d` o `project = KEY`). |
| `maxResults` | `number` | No | `10` | Cantidad máxima de tickets a retornar. |

#### 6. `read_jira_issue`
Obtiene el resumen, estado, prioridad, asignado, descripción y últimos 10 comentarios de un ticket de Jira (`/rest/api/3/issue/{issueKey}`).

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `issueKey` | `string` | **Sí** | — | Clave del issue en Jira (ej. `"POS-1024"`). |

---

### 3.3 Matriz de Extensiones Soportadas y Modelos Voyage AI

`loaders.py` y `embeddings.py` enrutan automáticamente cada extensión al extractor y modelo de Voyage AI correspondiente, manteniendo siempre una dimensionalidad fija de **`1024`** para compartir el mismo índice vectorial:

| Categoría | Extensiones Soportadas | Estrategia de Extracción (`loaders.py`) | Modelo Voyage AI (`embeddings.py`) |
| :--- | :--- | :--- | :--- |
| **Texto, Código y Scripts** | `.txt`, `.csv`, `.xml`, `.json`, `.js`, `.html`, `.htm`, `.properties`, `.sh`, `.bat`, `.sql`, `.svg` | Lectura UTF-8/Latin-1 y segmentación por oraciones (`chunker.py`). | `voyage-4-large` (`1024d`) |
| **Artefactos Enactor / Enterprise** | `.process`, `.page`, `.layout`, `.theme`, `.style`, `.message`, `.flf`, `.def`, `.xsd`, `.wsdl` | Extracción de definiciones XML/propiedades empresariales y segmentación en chunks. | `voyage-4-large` (`1024d`) |
| **Excel** | `.xlsx` | Extracción estructurada por hoja y filas con `openpyxl`. | `voyage-4-large` (`1024d`) |
| **Empaquetados, Binarios y Certificados** | `.jar`, `.war`, `.ear`, `.zip`, `.tar`, `.gz`, `.tgz`, `.class`, `.key`, `.lic`, `.cer`, `.crt`, `.jks`, `.keystore` | Inspección de inventario interno (`zipfile`/`tarfile`), extracción de cadenas legibles en bytecode `.class` o resumen SHA-256. | `voyage-4-large` (`1024d`) |
| **Markdown Multimodal** | `.md` | Extracción de texto + decodificación de imágenes Base64 (`data:image/...`) e imágenes locales referenciadas. | `voyage-multimodal-3.5` (`1024d`) |
| **Word Multimodal** | `.docx` | Extracción de párrafos de texto + imágenes incrustadas (`python-docx`). | `voyage-multimodal-3.5` (`1024d`) |
| **PDF Multimodal** | `.pdf` | Extracción de texto por página + renderizado visual RGB a `150 DPI` (`PyMuPDF`). | `voyage-multimodal-3.5` (`1024d`) |
| **Imágenes** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.ico` | Conversión a tensor visual RGB (`Pillow`) con fallback descriptivo si el archivo está corrupto o vacío (`0 bytes`). | `voyage-multimodal-3.5` (`1024d`) |

---

### 3.4 Esquema BSON del Documento en MongoDB Atlas

Cada chunk insertado en la colección `knowledgeVectors.knowledge` cumple con la siguiente estructura:

```json
{
  "_id": { "$oid": "67169e4c89a2c40012ab3456" },
  "documentId": "Pos Void Transaction.process",
  "checksum": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  "version": "2.7.1784.105",
  "source": {
    "path": "/Users/JACOLINV/Documents/mongodbVectorSkill/enactor-kb/Process/Pos Void Transaction.process"
  },
  "fileType": "process",
  "modality": "text",
  "page": 1,
  "chunkIndex": 0,
  "text": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
  "embedding": [0.0142, -0.0318, 0.0091, "... (1024 floats)"],
  "embeddingModel": "voyage-4-large",
  "createdAt": { "$date": "2026-10-21T17:30:00.000Z" }
}
```

---

### 3.5 Guía de Diagnóstico y Resolución de Errores

| Síntoma / Error | Causa Raíz | Solución |
| :--- | :--- | :--- |
| `Error: MONGODB_URI no está definida en el archivo .env` | El servidor MCP o script Python no encontró `MONGODB_URI`. | Verifica que `.agents/skills/mongodb-vector-skill/.env` exista y contenga `MONGODB_URI="..."`. |
| `Atlassian API Error (401)` en Jira o `(403)` en Confluence | `ATLASSIAN_USER` tiene un correo incorrecto (ej. `.com` en lugar de `.com.mx`) o el `ATLASSIAN_API_TOKEN` expiró. | Corrige `ATLASSIAN_USER` en `.env` con el correo exacto de tu cuenta Atlassian y verifica el token. |
| `Atlassian API Error (410 Gone)` o `(400 Unbounded JQL)` en Jira | Uso del endpoint deprecado `/rest/api/3/search` o consulta JQL sin restricción temporal/proyecto. | `mcp-server.js` v1.7.0 ya usa `/rest/api/3/search/jql`. Asegúrate de enviar un JQL acotado como `updated >= -15d ORDER BY updated DESC`. |
| Error de protocolo JSON-RPC al iniciar el MCP server (`Unexpected token ◇`) | `dotenv` v17+ imprime mensajes promocionales en `stdout`, corrompiendo el canal `stdio` de MCP. | Mantén `dotenv.config({ path: ..., quiet: true })` en `mcp-server.js`. Nunca uses `console.log()` en `mcp-server.js` (usa `console.error()`). |
| `mongodb_vector_search` devuelve `[]` (arreglo vacío) | El índice `vector_index` no existe en Atlas, aún está en estado `Building`, o la dimensión del vector de consulta no es `1024`. | Verifica en MongoDB Atlas -> Atlas Search que el índice `vector_index` esté `Active` sobre el campo `embedding` con `1024` dimensiones. |

---

## Parte 4 — Explicación de Arquitectura

### 4.1 Separación de Responsabilidades: Ingesta Python vs. Servidor MCP Node.js

La arquitectura de `mongodb-vector-skill` separa deliberadamente el **procesamiento pesado de ingesta** (Python) de la **exposición de herramientas en tiempo real** (Node.js):
- **Python (`ingest.py`, `loaders.py`, `embeddings.py`)** aprovecha el ecosistema nativo de procesamiento documental y visión por computadora (`PyMuPDF`, `Pillow`, `python-docx`, `openpyxl`, SDK oficial `voyageai`) para transformar decenas de miles de archivos heterogéneos en vectores de `1024` dimensiones.
- **Node.js (`mcp-server.js`)** proporciona un proceso ultraligero de arranque instantáneo sobre el SDK oficial `@modelcontextprotocol/sdk`, manteniendo conexiones persistentes a MongoDB Atlas y ejecutando peticiones REST asíncronas hacia Confluence y Jira con latencia mínima.

### 4.2 Idempotencia por Checksum MD5 y Etiquetado de Versiones

Al procesar repositorios masivos (como los `26,485` archivos de `enactor-kb`), interrumpir y reanudar una ingesta no debe duplicar documentos ni consumir cuota innecesaria en la API de Voyage AI:
1. Antes de generar cualquier embedding, `ingest.py` calcula el hash `MD5` del archivo local y lo compara contra el campo `checksum` almacenado en MongoDB Atlas.
2. Si el `checksum` coincide y no hay cambio de versión, el archivo se omite en milisegundos (`SIN CAMBIOS`).
3. Si el `checksum` coincide pero se especificó una nueva versión (`--version "2.7.1784.105"`), `mongodb.py` ejecuta `update_many` solo sobre el campo `version`, sin volver a llamar a Voyage AI.
4. Si el `checksum` cambió, `mongodb.py` elimina todos los chunks previos de ese `documentId` e inserta los nuevos fragmentos actualizados.

### 4.3 Pureza del Canal `stdio` en el Protocolo MCP

El protocolo **Model Context Protocol (MCP)** sobre transporte `stdio` utiliza `stdout` exclusivamente para tramas JSON-RPC 2.0 entre el cliente de IA y `mcp-server.js`. Cualquier byte escrito en `stdout` que no sea un objeto JSON-RPC válido (como banners de librerías o logs de depuración) rompe la comunicación con el agente. Por ello:
- `dotenv` se inicializa con `{ quiet: true }`.
- Todos los mensajes diagnósticos del servidor se escriben únicamente en `stderr` (`console.error`).

---

## Parte 5 — Formas de Uso, Catálogo de Prompts y Recomendaciones (Best Practices)

### 5.1 Las 4 Formas de Uso de `mongodb-vector-skill`

La skill `v1.7.0` puede operarse en cuatro modalidades complementarias según la tarea que necesites resolver:

| Modalidad | Cómo se invoca | Cuándo utilizarla |
| :--- | :--- | :--- |
| **1. Invocación Directa de la Skill en el Chat** | `/mongodb-vector-skill <instrucción>` o pidiendo al agente ingestar/buscar en la base vectorial. | Cuando deseas que el agente orqueste todo el flujo (generar el embedding de la pregunta con Python, consultar el MCP server y sintetizar una respuesta RAG). |
| **2. Consumo de Herramientas MCP en Tiempo Real** | El agente invoca automáticamente `mongodb_vector_search`, `find_by_document_id`, `search_confluence`, `read_confluence_page`, `search_jira_issues` o `read_jira_issue`. | Durante sesiones de desarrollo, arquitectura o soporte donde el agente necesita consultar documentación técnica local en MongoDB o páginas/tickets vivos en Atlassian. |
| **3. Ejecución por Línea de Comandos (CLI Batch)** | `python3 ingest.py <ruta> --version "<ver>"` o `python3 force_ingest.py <ruta>`. | Para indexar por primera vez un repositorio grande (ej. `enactor-kb`), actualizar únicamente los archivos modificados o etiquetar una nueva versión de release. |
| **4. Flujo Híbrido (Confluence/Jira + MongoDB Vector Search)** | Combinando herramientas de Atlassian y de MongoDB en un mismo prompt. | Para validar si el código/procesos almacenados en MongoDB cumplen con una normativa publicada en Confluence, o para investigar en el código un incidente reportado en Jira. |

---

### 5.2 Catálogo de Prompts Recomendados para el Agente IA

A continuación se presentan plantillas de prompts probadas para aprovechar al máximo las capacidades de la versión `1.7.0`:

#### A. Búsqueda Semántica y RAG sobre Conocimiento Ingerido (`mongodb_vector_search`)
- **Exploración funcional y técnica**:
  > *"/mongodb-vector-skill Busca en la base de conocimiento vectorial cómo funciona el flujo de Catálogo Extendido en el POS Enactor, incluyendo procesos, reglas, APIs y mapeos."*
- **Localización de procesos o configuraciones**:
  > *"Genera un embedding de consulta y usa `mongodb_vector_search` con `limit: 10` y `numCandidates: 100` para encontrar todos los fragmentos relacionados con la anulación de transacciones (`Void Transaction`)."*

#### B. Recuperación Exacta de un Documento Completo (`find_by_document_id`)
- **Inspección de todos los fragmentos de un archivo conocido**:
  > *"Usa `find_by_document_id` para recuperar todos los chunks del documento `Catalogo Extendido-Flujo de Venta POS Enactor.pdf` ordenados por página."*

#### C. Consultas a Confluence y Jira (`search_confluence`, `read_confluence_page`, `search_jira_issues`, `read_jira_issue`)
- **Monitoreo de actividad reciente (últimos 15 días)**:
  > *"Consulta en Confluence y Jira todos los documentos y tickets actualizados en los últimos 15 días y preséntame un resumen ejecutivo agrupado por plataforma."*
- **Lectura íntegra de normativas o diseños en Confluence**:
  > *"Busca en Confluence el documento 'Normativa para Diseño y Modelado de Bases de Datos MongoDB: Políticas y Reglas Esenciales v1.0' y obtén su contenido completo usando `read_confluence_page`."*
- **Análisis de un ticket de Jira**:
  > *"Lee el ticket `POS-123` con `read_jira_issue`, resume su descripción y los últimos comentarios."*

#### D. Flujo Híbrido (Auditoría Cruzada Atlassian + MongoDB Atlas)
- **Verificación de cumplimiento normativo**:
  > *"Lee la página de Confluence con la Normativa de MongoDB (`pageId: 2823684097`) y revisa si el esquema actual de nuestra colección `knowledgeVectors.knowledge` cumple con las reglas de nomenclatura, tipos de datos e indexación."*
- **Diagnóstico de bugs con contexto de Jira + Base Vectorial**:
  > *"Obtén el detalle del issue en Jira actualizado recientemente y luego realiza una búsqueda vectorial en MongoDB para localizar los archivos `.process` o `.page` de Enactor involucrados."*

---

### 5.3 Recomendaciones de Ajuste para Búsqueda Vectorial (`limit` y `numCandidates`)

El operador `$vectorSearch` de MongoDB Atlas utiliza búsqueda aproximada de vecinos más cercanos (ANN sobre grafos HNSW). Ajusta los parámetros según la naturaleza de tu consulta:

| Tipo de Consulta | `limit` recomendado | `numCandidates` recomendado | Justificación |
| :--- | :---: | :---: | :--- |
| **Pregunta puntual / definición específica** | `5` | `50` (10x `limit`) | Baja latencia y alta precisión en los primeros 5 fragmentos más cercanos. |
| **Análisis arquitectónico o flujo completo (ej. BRD + Procesos + Mapeos)** | `10` – `15` | `100` – `150` | Permite recuperar contexto distribuido en múltiples documentos (`.pdf`, `.docx`, `.xlsx`, `.process`). |
| **Auditoría exhaustiva sobre colecciones > 25,000 documentos** | `20` | `200` – `300` | Aumentar `numCandidates` reduce el riesgo de omitir fragmentos relevantes en colecciones grandes. |

> [!TIP]
> **Regla práctica de proporción**: Mantén siempre `numCandidates` entre **10 y 20 veces** el valor de `limit` (`numCandidates >= 10 * limit`). Después de obtener el top-K con `mongodb_vector_search`, si identificas que un documento específico contiene la respuesta pero está dividido en varios chunks, encadena una llamada a `find_by_document_id` para leer los chunks contiguos.

---

### 5.4 Recomendaciones de Segmentación (`CHUNK_SIZE`) e Ingesta Masiva

1. **Ajuste de `CHUNK_SIZE` y `CHUNK_OVERLAP_SENTENCES`**:
   - **Documentación general y manuales (`.md`, `.docx`, `.pdf`)**: El valor por defecto `CHUNK_SIZE=1500` y `CHUNK_OVERLAP_SENTENCES=1` ofrece el mejor equilibrio entre contexto semántico y precisión del vector.
   - **Código fuente, XML y procesos empresariales (`.process`, `.page`, `.xsd`, `.js`)**: Si los archivos XML son muy extensos, evita reducir `CHUNK_SIZE` por debajo de `1000` para no fragmentar etiquetas o definiciones lógicas a la mitad.
2. **Cuándo usar `ingest.py` vs. `force_ingest.py`**:
   - **Usa siempre `ingest.py` por defecto**: Es idempotente y reanudable. Si una ingesta masiva de 26,000 archivos se interrumpe por red en el archivo 24,700, volver a ejecutar `python3 ingest.py <ruta> --version "<ver>"` saltará instantáneamente los 24,700 archivos ya insertados y procesará únicamente los 1,785 restantes.
   - **Usa `force_ingest.py` únicamente cuando**: Hayas modificado `CHUNK_SIZE`, cambiado de modelo de embeddings o quieras regenerar desde cero todos los vectores de una carpeta específica.
3. **Control de lotes (`EMBED_BATCH_SIZE`) y límites de tasa (Rate Limits)**:
   - Mantén `EMBED_BATCH_SIZE=8` (o entre `8` y `16`) para evitar errores `429 Too Many Requests` o excesos de tokens por minuto en Voyage AI cuando se procesan PDFs o imágenes pesadas.
4. **Etiquetado de versiones (`--version`)**:
   - Siempre que ingieras una base de conocimiento asociada a un release de software (por ejemplo, `--version "2.7.1784.105"`), incluye la bandera `--version`. Si solo deseas actualizar la etiqueta de versión sin recalcular embeddings, ejecuta `ingest.py` con el nuevo `--version` sobre los mismos archivos.

---

### 5.5 Buenas Prácticas para Consultas a Confluence y Jira

1. **Usa consultas JQL acotadas en Jira (`search_jira_issues`)**:
   - La API v3 de Jira Cloud (`/rest/api/3/search/jql`) rechaza consultas sin filtro de acotamiento (`Unbounded JQL`). Incluye siempre una condición de fecha o proyecto, por ejemplo:
     - `updated >= -15d ORDER BY updated DESC`
     - `project = "POS" AND status = "In Progress" ORDER BY updated DESC`
2. **Combina `search_confluence` con `read_confluence_page`**:
   - Utiliza primero `search_confluence` para localizar el título y el `id` de la página con el menor consumo de tokens posible, y luego invoca `read_confluence_page` únicamente sobre el `pageId` relevante para traer su contenido completo.
3. **Búsquedas avanzadas con CQL en `search_confluence`**:
   - Puedes pasar tanto palabras clave simples (`"Normativa MongoDB"`) como expresiones CQL completas (`type=page AND space="CU" AND lastModified >= now("-15d")`).

---

### 5.6 Recomendaciones de Seguridad, Costos y Gobierno de Datos

1. **Protección de Datos Personales (PII) y Secretos**:
   - No ingieras archivos `.env`, dumps de producción con datos personales identificables (PII) ni llaves privadas reales con contenido sensible. Para archivos `.key`, `.lic`, `.cer`, `.crt`, `.jks` y `.keystore`, `loaders.py` v1.7.0 extrae de forma segura únicamente los metadatos del archivo (nombre, tamaño y hash SHA-256) sin enviar el contenido criptográfico privado a Voyage AI ni guardarlo en texto plano.
2. **Ahorro de Cuota en Voyage AI**:
   - Aprovecha la verificación por checksum MD5 de `ingest.py` antes de lanzar re-ingestas completas.
3. **Principio de Menor Privilegio**:
   - El usuario configurado en `MONGODB_URI` para las aplicaciones/MCP debe contar únicamente con permisos `readWrite` (para ingesta) o `read` (para solo consulta en el servidor MCP) sobre la base de datos `knowledgeVectors`, evitando roles administrativos (`dbAdmin` / `userAdmin`) en producción.
   - El token `ATLASSIAN_API_TOKEN` debe pertenecer a una cuenta cuyos permisos de lectura en Confluence y Jira estén acotados a los espacios y proyectos requeridos.


