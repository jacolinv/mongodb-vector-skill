import os
import sys
import re
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb import MongoDB
from embeddings import VoyageEmbedding
from ingest import process_file, DEFAULT_DOCUMENTS_PATH, find_documents

def main():
    parser = argparse.ArgumentParser(description="Fuerza la ingestión de una carpeta, eliminando documentos previos.")
    parser.add_argument("documents_path", type=Path, nargs="?", default=DEFAULT_DOCUMENTS_PATH, help="Ruta de la carpeta")
    args = parser.parse_args()

    target_path = args.documents_path.expanduser().resolve()
    
    if not target_path.exists():
        print(f"Error: La ruta {target_path} no existe.")
        sys.exit(1)

    load_dotenv()
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("Error: MONGODB_URI no está definido en .env")
        sys.exit(1)

    database = os.getenv("MONGODB_DB") or "knowledgeVectors"
    collection = os.getenv("MONGODB_COLLECTION") or "knowledge"
    voyage_api_key = os.getenv("VOYAGE_API_KEY")
    
    mongo = MongoDB(uri=mongo_uri, database=database, collection=collection)
    voyage = VoyageEmbedding(voyage_api_key)
    
    # Sobreescribir el chequeo para forzar la inserción
    mongo.check_checksum_exists = lambda x: False
    
    files = find_documents(target_path)
    print(f"Borrando registros previos y forzando ingestión de {len(files)} archivos en {target_path.name}...")
    
    for file in files:
        base_path = target_path.parent if target_path.is_file() else target_path
        
        # Eliminar cualquier residuo previo basado en el nombre base del archivo
        base_name_escaped = re.escape(file.stem)
        result = mongo.collection.delete_many({"documentId": {"$regex": base_name_escaped}})
        
        process_file(file, target_path, voyage, mongo, force_replacement=(result.deleted_count > 0))

if __name__ == "__main__":
    main()

