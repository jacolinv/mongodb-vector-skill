---
name: mongodb-vector-skill
description: Realiza búsquedas vectoriales y de similitud en un namespace de MongoDB usando $vectorSearch mediante un MCP server.
---

# MongoDB Vector Search Skill

Esta habilidad le permite al Agente de IA consultar información en MongoDB Atlas utilizando búsquedas semánticas o por embeddings vectoriales.

## Requisitos Previos

1. Asegúrate de tener las siguientes variables de entorno configuradas en tu archivo `.env`:
   - `MONGODB_URI`: Tu cadena de conexión a MongoDB Atlas.
   - `MONGODB_DB`: El nombre del database (Namespace).
   - `MONGODB_COLLECTION`: La colección objetivo (Namespace).
   - `VECTOR_INDEX_NAME`: El nombre del índice Search Index de vectores configurado en Atlas.

2. El cliente o entorno debe estar ejecutando el servidor MCP correspondiente (`node mcp-server.js`).

## Cómo usar esta herramienta

Cuando necesites buscar contextos o documentos similares en la base de datos:

1. Convierte o pasa el vector de embeddings del texto o consulta deseada.
2. Invoca la herramienta `mongodb_vector_search` proporcionando el argumento `vector`.
3. Procesa los resultados retornados por el pipeline `$vectorSearch`.

### Parámetros aceptados por la herramienta:
- `vector`: (Requerido) Arreglo de números representando el embedding.
- `limit`: (Opcional) Número máximo de resultados (Por defecto: 5).
- `numCandidates`: (Opcional) Número de nodos vecinos evaluados en el algoritmo HNSW (Por defecto: 50).
- `path`: (Opcional) Nombre del campo donde vive el vector en el documento (Por defecto: "embedding").
