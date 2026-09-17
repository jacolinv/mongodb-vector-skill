---
name: mongodb-vector-search
description: "Use this skill to ingest Markdown, PDF, and image knowledge into MongoDB Atlas and perform semantic vector search through the local MCP server. Trigger for MongoDB $vectorSearch, embeddings, Voyage AI, Atlas Search indexes, MCP vector retrieval, or validating this workspace."
argument-hint: "Describe the knowledge source, query, or validation you need."
user-invocable: true
---

# MongoDB Vector Search

## Purpose

Use this workspace to prepare multimodal knowledge, generate embeddings, persist documents in MongoDB Atlas, and retrieve relevant documents through the `mongodb_vector_search` MCP tool.

## When to Use

- Build or validate a semantic-search or retrieval-augmented-generation workflow.
- Ingest `.md`, `.pdf`, `.jpg`, `.jpeg`, or `.png` sources.
- Generate document or query embeddings with Voyage AI.
- Diagnose configuration, embedding-dimension, index, or MCP server problems.

## Prerequisites

1. Install Node dependencies with `npm install`.
2. Install the Python dependencies required by `loaders.py`, `embeddings.py`, and `mongodb.py` in the selected Python environment.
3. Configure a local `.env` file without committing secrets:
   - `MONGODB_URI`
   - `MONGODB_DB` (defaults to `knowledgeVectors`)
   - `MONGODB_COLLECTION` (defaults to `knowledge`)
   - `VECTOR_INDEX_NAME` (defaults to `vector_index`)
   - `VOYAGE_API_KEY` for embedding ingestion or query generation
4. Create an Atlas Vector Search index whose `path`, dimensions, and similarity metric match the generated embeddings. The default embedding dimension in `embeddings.py` is `1024`.

## Procedure

### 1. Inspect the request

Identify whether the task is ingestion, query embedding, vector retrieval, or validation. Preserve the same embedding model and dimension for documents and queries that share an index. Do not invent a MongoDB query when the user only asks for static validation.

### 2. Prepare source content

Use `loaders.py` to load supported files. Markdown is returned as text, PDFs as page-level text plus rendered images, and images as RGB inputs. Use `chunker.py` for text segmentation when the source is larger than one embedding input.

### 3. Generate embeddings

Use `VoyageEmbedding` from `embeddings.py`. Route documents through `model_for_extension()` when the source extension matters, and use `embed_query()` for the user query. Keep the model family, `input_type`, and dimension compatible with the Atlas index.

### 4. Persist knowledge

Store each chunk with its embedding and enough metadata to identify the source, document, and page. Use `MongoDB` from `mongodb.py` for insert and checksum-based update workflows. Avoid storing credentials or unbounded raw payloads in metadata.

To ingest a folder recursively, run:

```bash
python ingest.py /path/to/documents
```

The path is optional; without it, `ingest.py` uses `DOCUMENTS_PATH`. Supported files are `.md`, `.pdf`, `.jpg`, `.jpeg`, and `.png`.

### 5. Run vector retrieval

Start the MCP server with `node mcp-server.js`. Invoke `mongodb_vector_search` with:

- `vector`: required numeric embedding array.
- `limit`: maximum results; defaults to `5`.
- `numCandidates`: approximate-search candidate count; defaults to `50`.
- `path`: embedding field; defaults to `embedding`.

The server uses the Atlas `$vectorSearch` aggregation stage, projects `_id`, `title`, `content`, and the vector score, then sorts by descending score.

### 6. Interpret failures

- Module or import errors: verify `package.json` has `"type": "module"` and dependencies are installed.
- Missing environment values: verify `.env` is loaded and `MONGODB_URI` is present.
- Atlas index errors: verify the index name, vector field, dimensions, and similarity configuration.
- Empty or poor results: verify document/query model compatibility, embedding dimensions, chunk quality, and `numCandidates`.
- Connection cleanup errors: inspect server logs and MongoDB driver connectivity before changing the aggregation pipeline.

## Validation Checklist

Run these checks before reporting the workspace as ready:

1. `npm test` passes, including JavaScript syntax and Python compilation checks.
2. The skill file is at `.github/skills/mongodb-vector-search/SKILL.md`, and its `name` matches the directory.
3. Frontmatter is enclosed by two `---` markers and includes a meaningful `description`.
4. Static validation does not require MongoDB Atlas or Voyage credentials.
5. Live retrieval is tested separately only when valid credentials and an Atlas index are available.

## Expected Report

Report the checks performed, their result, the files or configuration involved, any live dependencies that were not exercised, and the exact next action for unresolved issues. Distinguish static validation from live Atlas or Voyage testing.