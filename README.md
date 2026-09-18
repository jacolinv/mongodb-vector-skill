# MongoDB Vector Search Skill

Una skill para preparar conocimiento multimodal, generar embeddings con Voyage AI, almacenarlos en MongoDB Atlas y recuperarlos con búsqueda vectorial mediante un servidor MCP local.

## Propósito

Este proyecto permite:

- Ingestar documentos en formato Markdown, Texto (txt, csv, xml), PDF e imágenes.
- Dividir el contenido en chunks para mejorar la recuperación semántica.
- Generar embeddings con Voyage AI.
- Guardar los documentos y sus vectores en MongoDB Atlas.
- Ejecutar una búsqueda vectorial a través del tool `mongodb_vector_search` expuesto por `mcp-server.js`.

La idea principal es soportar un flujo de Retrieval-Augmented Generation (RAG) o búsqueda semántica sobre documentos locales.

## ¿Cuándo usar esta skill?

Es útil cuando necesitas:

- Construir una búsqueda semántica sobre documentación técnica o conocimiento interno.
- Ingestar fuentes de tipo `.md`, `.txt`, `.csv`, `.xml`, `.pdf`, `.jpg`, `.jpeg` o `.png`.
- Generar embeddings para documentos y consultas con el mismo modelo y dimensiones compatibles.
- Validar una configuración de Atlas Vector Search, embeddings o MCP server.

## Requisitos

Antes de usar la skill debes tener:

- Node.js y npm instalados.
- Python 3 disponible en el entorno activo.
- Una instancia de MongoDB Atlas con soporte a Atlas Vector Search.
- Una API key válida de Voyage AI.
- Un archivo `.env` con las variables necesarias.

## Instalación

1. Instala dependencias de Node:

```bash
npm install
```

2. Instala dependencias de Python requeridas por la ingesta y los embeddings:

```bash
python3 -m pip install pymupdf pillow voyageai python-dotenv
```

3. Crea un archivo `.env` en la raíz del proyecto con variables como estas:

```env
MONGODB_URI="mongodb+srv://<usuario>:<password>@<cluster>/test?retryWrites=true&w=majority"
MONGODB_DB="knowledgeVectors"
MONGODB_COLLECTION="knowledge"
VECTOR_INDEX_NAME="vector_index"
VOYAGE_API_KEY="<tu_api_key>"
DOCUMENTS_PATH="/ruta/a/documentos"
```

> El archivo `.env` no debe subirse al repositorio si incluye secretos reales.

## Variables de entorno relevantes

Estas son las variables que usa el proyecto:

- `MONGODB_URI`: cadena de conexión a MongoDB Atlas.
- `MONGODB_DB`: base de datos de destino. Por defecto: `knowledgeVectors`.
- `MONGODB_COLLECTION`: colección donde se almacenan los chunks. Por defecto: `knowledge`.
- `VECTOR_INDEX_NAME`: nombre del índice vectorial en Atlas. Por defecto: `vector_index`.
- `VOYAGE_API_KEY`: clave para el servicio de embeddings de Voyage AI.
- `DOCUMENTS_PATH`: ruta por defecto para el directorio con documentos a ingerir.
- `CHUNK_SIZE`: longitud aproximada de cada chunk de texto.
- `CHUNK_OVERLAP_SENTENCES`: superposición entre chunks.
- `EMBED_BATCH_SIZE`: tamaño del lote para embeding en batch.

## Flujo de trabajo

El flujo principal es el siguiente:

### 1. Preparar los documentos

El proyecto acepta documentos con estas extensiones:

- `.md`, `.txt`, `.csv`, `.xml`
- `.pdf`
- `.jpg`
- `.jpeg`
- `.png`

Los archivos se leen con `loaders.py`:

- Markdown/Texto: se procesa como texto.
- PDF: cada página se convierte a texto más imagen renderizada.
- Imagen: se convierte a RGB y se usa como entrada multimodal.

### 2. Dividir contenido en chunks

`chunker.py` segmenta el texto para crear bloques manejables. El proceso genera chunks con metadata como:

- `documentId`
- `checksum`
- `source.path`
- `fileType`
- `modality`
- `page`
- `chunkIndex`
- `text`
- `embedding`
- `embeddingModel`

La lógica de `ingest.py` evita volver a insertar archivos sin cambios usando un checksum MD5.

### 3. Generar embeddings

`embeddings.py` encapsula la API de Voyage AI.

El proyecto usa modelos configurados por extensión, y todos los documentos que compartan un mismo índice vectorial deben usar un modelo compatible con el mismo índice.

Modelos por defecto:

- Texto: `voyage-4-large`
- Multimodal: `voyage-multimodal-3.5`
- Dimensión del embedding: `1024`

### 4. Persistir en MongoDB Atlas

`mongodb.py` gestiona:

- conexión a MongoDB
- inserción masiva de documentos embebidos
- comprobación de checksums
- eliminación de documentos previos por `documentId`

### 5. Ejecutar búsqueda vectorial

El servidor MCP se inicia con:

```bash
node mcp-server.js
```

Las herramientas disponibles son:

- **`mongodb_vector_search`**: Búsqueda semántica usando `$vectorSearch`.
  Parámetros:
  - `vector`: arreglo de números que representa el embedding de la consulta.
  - `limit`: número máximo de resultados, por defecto `5`.
  - `numCandidates`: cantidad de candidatos a evaluar, por defecto `50`.
  - `path`: campo vectorial dentro del documento, por defecto `embedding`.
  
  El pipeline usa `$vectorSearch` de MongoDB Atlas y luego proyecta:
  - `_id`
  - `title`
  - `content`
  - `score` usando `$meta: "vectorSearchScore"`

- **`find_by_document_id`**: Búsqueda exacta por ID de documento.
  Parámetros:
  - `documentId`: (Requerido) string que representa el ID del documento a buscar.
  
  Retorna los fragmentos o el documento que coincida con ese `documentId` usando un `find()` estándar de MongoDB.

## Ingesta de documentos

La forma más directa de procesar una carpeta es:

```bash
python3 ingest.py /ruta/a/documentos
```

Si no pasas una ruta, el script usa `DOCUMENTS_PATH` o la ruta por defecto configurada en el proyecto.

Ejemplo:

```bash
python3 ingest.py /Users/JACOLINV/Documents/docsEmb
```

## Ejemplo de uso de embeddings

Puedes generar un embedding para una consulta con Python:

```python
from embeddings import VoyageEmbedding

voyage = VoyageEmbedding(api_key="<tu_api_key>")
query_vector = voyage.embed_query("¿Cómo funciona Atlas Vector Search?")
print(len(query_vector))
```

## Requerimientos del índice vectorial en Atlas

Antes de usar la búsqueda real, debes crear un índice vectorial en MongoDB Atlas compatible con los embeddings generados. El proyecto usa `embedding` como campo vectorial por defecto en el servidor MCP.

Verifica que:

- El `path` del índice coincida con el campo que contiene el vector.
- La dimensión del índice coincida con la del embedding generado (`1024` en este proyecto).
- La métrica de similitud sea compatible con el modelo usado.
- El nombre del índice coincida con `VECTOR_INDEX_NAME`.

## Estructura de archivos

```text
.
├── chunker.py
├── embeddings.py
├── ingest.py
├── loaders.py
├── mcp-server.js
├── mongodb.py
├── package.json
├── README.md
├── SKILL.md
└── SKILL_old.md
```

### Descripción por archivo

- `ingest.py`: procesa documentos y genera embeddings para insertarlos en MongoDB.
- `loaders.py`: cargadores para Markdown, PDF e imágenes.
- `embeddings.py`: wrapper para Voyage AI y generación de embeddings.
- `chunker.py`: división del texto en chunks inteligentes.
- `mongodb.py`: operaciones de persistencia y validación en MongoDB.
- `mcp-server.js`: servidor MCP que expone la herramienta de búsqueda vectorial.
- `SKILL.md`: definición de la skill para uso del entorno de agentes.

## Validación

Para validar el proyecto de forma estática, ejecuta:

```bash
npm test
```

Este comando comprueba:

- sintaxis JavaScript de `mcp-server.js`
- compilación de archivos Python con `compileall`

## Solución de problemas

### Error de conexión a MongoDB

- Revisa que `MONGODB_URI` sea válida.
- Verifica que el cluster esté disponible y que expongas la base de datos correcta.
- Comprueba el nombre del índice vectorial.

### Error por falta de variables de entorno

- Asegúrate de cargar `.env` antes de ejecutar la ingesta.
- Verifica que `VOYAGE_API_KEY` y `MONGODB_URI` existan.

### Resultados vacíos o pobres

- Confirma que el modelo usado para documentos y consultas sea compatible.
- Revisa que la dimensión del vector coincida con la del índice.
- Mejora la calidad de los chunks o reduce la cantidad de contenido por bloque.

### Errores de modelo multimodal

- Algunas extensiones como PDF, JPG, JPEG y PNG requieren un modelo multimodal.
- Si usas un modelo no compatible, la ingesta puede fallar en `build_chunks()`.

## Resumen

Esta skill combina:

- carga de documentos,
- generación de embeddings,
- almacenamiento vectorial en MongoDB Atlas,
- recuperación semántica con `mongodb_vector_search`.

Es una base útil para construir un RAG local o un sistema de búsqueda por similitud sobre documentación y conocimiento digital.

## Referencias internas

- `SKILL.md`: especificación de la skill.
- `mcp-server.js`: herramienta de acceso a la búsqueda vectorial.
- `ingest.py`: flujo principal de ingesta y embeddings.

## Siguiente paso recomendado

1. Configura `.env` con tus credenciales reales.
2. Define el índice vectorial en Atlas.
3. Añade una carpeta de documentos de prueba.
4. Ejecuta `python3 ingest.py`.
5. Inicia el MCP server y prueba `mongodb_vector_search` con un embedding de consulta real.
