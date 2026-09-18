import os

import voyageai

TEXT_MODEL = os.getenv(
    "VOYAGE_TEXT_MODEL",
    "voyage-4-large"
)

MULTIMODAL_MODEL = os.getenv(
    "VOYAGE_MULTIMODAL_MODEL",
    "voyage-multimodal-3.5"
)

EMBEDDING_DIMENSIONS = 1024

# Enrutamiento de modelo por extension.
# IMPORTANTE: todos los tipos deben apuntar al mismo modelo si comparten el mismo
# indice vectorial; embeddings de modelos distintos no son comparables entre si.
MODEL_BY_EXTENSION = {
    ".pdf": MULTIMODAL_MODEL,
    ".jpg": MULTIMODAL_MODEL,
    ".jpeg": MULTIMODAL_MODEL,
    ".png": MULTIMODAL_MODEL,
    ".md": MULTIMODAL_MODEL,
    ".txt": MULTIMODAL_MODEL,
    ".csv": MULTIMODAL_MODEL,
    ".xml": MULTIMODAL_MODEL
}

# Modelo usado para embeber la pregunta del usuario
QUERY_MODEL = MULTIMODAL_MODEL


def model_for_extension(extension):
    extension = extension.lower()

    if extension not in MODEL_BY_EXTENSION:
        raise ValueError(
            f"Sin modelo configurado para: {extension}"
        )

    return MODEL_BY_EXTENSION[extension]


def is_multimodal(model):
    return "multimodal" in model


class VoyageEmbedding:
    def __init__(self, api_key):
        self.client = voyageai.Client(
            api_key=api_key
        )

    def embed_documents(self, contents, model=TEXT_MODEL):
        """contents: lista de chunks.

        Cada chunk es una lista de partes (str y/o PIL.Image) si el modelo es
        multimodal, o un str si el modelo es solo texto.
        """
        if is_multimodal(model):
            response = self.client.multimodal_embed(
                inputs=contents,
                model=model,
                input_type="document",
                truncation=True
            )
            return response.embeddings

        response = self.client.embed(
            contents,
            model=model,
            input_type="document",
            output_dimension=EMBEDDING_DIMENSIONS
        )
        return response.embeddings

    def embed_query(self, text, model=QUERY_MODEL):
        if is_multimodal(model):
            response = self.client.multimodal_embed(
                inputs=[[text]],
                model=model,
                input_type="query",
                truncation=True
            )
            return response.embeddings[0]

        response = self.client.embed(
            [text],
            model=model,
            input_type="query",
            output_dimension=EMBEDDING_DIMENSIONS
        )
        return response.embeddings[0]



