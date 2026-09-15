---
name: mongodb-vector-search
description: Realiza búsquedas vectoriales y de similitud en un namespace de MongoDB usando $vectorSearch mediante un MCP server.
---

## REGLA DE ORO
NUNCA intentes construir consultas de MongoDB con `$match`, `$text` o búsquedas de texto tradicionales. 
CUALQUIER búsqueda de similitud o contexto DEBE ejecutarse utilizando la herramienta MCP `mongodb_vector_search`.

## Instrucciones de uso para el Agente:
1. Convierte la pregunta o intención del usuario en un vector/embedding (arreglo de números floats).
2. Llama a la herramienta MCP `mongodb_vector_search` pasando el parámetro `vector`.
3. El servidor MCP ejecutará la agregación con `$vectorSearch` internamente en MongoDB Atlas.

### Parámetros de la herramienta:
- `vector`: (Requerido) [Array de Floats] El vector generado a buscar.
- `limit`: (Opcional) [Número] Cantidad de resultados.
