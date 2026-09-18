import argparse
import hashlib
import os
from pathlib import Path
from dotenv import load_dotenv
from loaders import load_document, SUPPORTED_EXTENSIONS
from chunker import chunk_text
from embeddings import (
    VoyageEmbedding,
    model_for_extension,
    is_multimodal
)
from mongodb import MongoDB

load_dotenv()

DEFAULT_DOCUMENTS_PATH = Path(
    os.getenv("DOCUMENTS_PATH", "/ Users/<TU_USUARIO>/Documents/docsEmb")
)

CHUNK_SIZE = int(
    os.getenv("CHUNK_SIZE", "1200")
)

CHUNK_OVERLAP_SENTENCES = int(
    os.getenv(
        "CHUNK_OVERLAP_SENTENCES",
        "1"
    )
)

EMBED_BATCH_SIZE = int(
    os.getenv("EMBED_BATCH_SIZE", "8")
)

def file_checksum(path):
    """MD5 usado solo como detector de cambios, no como control de seguridad."""
    digest = hashlib.md5(usedforsecurity=False)

    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)

    return digest.hexdigest()


def build_chunks(path, document_id, blocks, multimodal, checksum):
    """Convierte los bloques del loader en chunks listos para embeber."""
    chunks = []

    for block in blocks:
        modality = block["modality"]

        if modality == "text":
            # Markdown: se sigue segmentando por oraciones
            texts = chunk_text(
                block["text"],
                chunk_size=CHUNK_SIZE,
                overlap_sentences=CHUNK_OVERLAP_SENTENCES
            )
            parts_list = [[text] for text in texts]
        else:
            # PDF (pagina) o imagen: un chunk por bloque, texto + imagen
            parts = []

            if block["text"]:
                parts.append(block["text"][:CHUNK_SIZE * 4])

            parts.append(block["image"])
            parts_list = [parts]

        for index, parts in enumerate(parts_list):
            text_parts = [
                part
                for part in parts
                if isinstance(part, str)
            ]

            has_image = len(text_parts) < len(parts)

            if has_image and not multimodal:
                raise ValueError(
                    f"{path.suffix} requiere un modelo multimodal"
                )

            chunks.append({
                "documentId": document_id,
                "checksum": checksum,
                "source": {
                    "type": "local",
                    "path": str(path)
                },
                "fileType": path.suffix.lower(),
                "modality": modality,
                "page": block["page"],
                "chunkIndex": index,
                "text": " ".join(text_parts),
                "hasImage": has_image,
                "_parts": parts
            })

    return chunks


def embed_chunks(chunks, model, multimodal, voyage):
    for start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[start:start + EMBED_BATCH_SIZE]

        if multimodal:
            contents = [
                chunk["_parts"]
                for chunk in batch
            ]
        else:
            contents = [
                chunk["text"]
                for chunk in batch
            ]

        embeddings = voyage.embed_documents(
            contents,
            model=model
        )

        for chunk, embedding in zip(batch, embeddings):
            chunk["embedding"] = embedding
            chunk["embeddingModel"] = model
            del chunk["_parts"]


def process_file(path, documents_path, voyage, mongo):
    print(f"Procesando: {path}")

    document_id = str(
        path.relative_to(documents_path)
    )

    checksum = file_checksum(path)

    # Validar si este archivo ya se ingirió previamente (independientemente de la ruta)
    if mongo.check_checksum_exists(checksum):
        print(f"Sin cambios o archivo duplicado (MD5 {checksum} ya existe), se omite.")
        return

    model = model_for_extension(path.suffix)
    multimodal = is_multimodal(model)

    blocks = load_document(path)

    all_chunks = build_chunks(
        path,
        document_id,
        blocks,
        multimodal,
        checksum
    )

    if not all_chunks:
        print("Sin contenido, se omite.")
        return

    print(
        f"Chunks generados: {len(all_chunks)} "
        f"(modelo: {model})"
    )

    embed_chunks(all_chunks, model, multimodal, voyage)

    mongo.delete_document(
        document_id
    )
    mongo.insert_many(
        all_chunks
    )
    print(f"Insertados: {len(all_chunks)}")

def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Vectoriza documentos y los inserta en MongoDB Atlas."
    )
    parser.add_argument(
        "documents_path",
        nargs="?",
        type=Path,
        default=DEFAULT_DOCUMENTS_PATH,
        help=(
            "Carpeta raíz con archivos .md, .pdf, .jpg, .jpeg o .png. "
            "Por defecto usa DOCUMENTS_PATH."
        )
    )
    return parser.parse_args(argv)


def find_documents(documents_path):
    return sorted(
        path
        for path in documents_path.rglob("*")
        if path.is_file()
        and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def main(argv=None):
    args = parse_args(argv)
    documents_path = args.documents_path.expanduser().resolve()

    if not documents_path.is_dir():
        raise SystemExit(
            f"La carpeta de documentos no existe o no es un directorio: "
            f"{documents_path}"
        )

    voyage_api_key = os.getenv("VOYAGE_API_KEY")
    mongo_uri = os.getenv("MONGODB_URI")
    database = (
        os.getenv("MONGODB_DB")
        or os.getenv("MONGODB_DATABASE")
        or "knowledgeVectors"
    )
    collection = os.getenv("MONGODB_COLLECTION") or "knowledge"

    missing = [
        name
        for name, value in {
            "VOYAGE_API_KEY": voyage_api_key,
            "MONGODB_URI": mongo_uri
        }.items()
        if not value
    ]
    if missing:
        raise SystemExit(
            "Faltan variables de entorno requeridas: "
            + ", ".join(missing)
        )

    voyage = VoyageEmbedding(voyage_api_key)
    mongo = MongoDB(
        uri=mongo_uri,
        database=database,
        collection=collection
    )

    files = find_documents(documents_path)

    print(f"Documentos encontrados: {len(files)}")
    for file in files:
        process_file(file, documents_path, voyage, mongo)

if __name__ == "__main__":
    main()
