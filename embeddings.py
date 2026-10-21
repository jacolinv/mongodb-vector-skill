import os
import voyageai
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

TEXT_MODEL = os.getenv("VOYAGE_TEXT_MODEL", "voyage-4-large")
MULTIMODAL_MODEL = os.getenv("VOYAGE_MULTIMODAL_MODEL", "voyage-multimodal-3.5")
EMBEDDING_DIMENSIONS = 1024

MODEL_BY_EXTENSION = {
    ".pdf": MULTIMODAL_MODEL,
    ".jpg": MULTIMODAL_MODEL,
    ".jpeg": MULTIMODAL_MODEL,
    ".png": MULTIMODAL_MODEL,
    ".md": MULTIMODAL_MODEL,
    ".txt": MULTIMODAL_MODEL,
    ".csv": MULTIMODAL_MODEL,
    ".xml": MULTIMODAL_MODEL,
    ".json": MULTIMODAL_MODEL,
    ".js": MULTIMODAL_MODEL,
    ".docx": MULTIMODAL_MODEL,
    ".xlsx": MULTIMODAL_MODEL,
    ".java": MULTIMODAL_MODEL,
    ".properties": MULTIMODAL_MODEL,
    ".xsd": MULTIMODAL_MODEL,
    ".rptdesign": MULTIMODAL_MODEL,
    ".mf": MULTIMODAL_MODEL,
    ".xslt": MULTIMODAL_MODEL,
    ".nfo": MULTIMODAL_MODEL,
    ".wsdl": MULTIMODAL_MODEL,
    ".css": MULTIMODAL_MODEL,
    ".pom": MULTIMODAL_MODEL,
    ".rptconfig": MULTIMODAL_MODEL,
    ".tld": MULTIMODAL_MODEL,
    ".jsonl": MULTIMODAL_MODEL,
    ".htd": MULTIMODAL_MODEL,
    ".rpttemplate": MULTIMODAL_MODEL,
    ".rptlibrary": MULTIMODAL_MODEL,
    ".providers": MULTIMODAL_MODEL,
    ".mex": MULTIMODAL_MODEL
}

QUERY_MODEL = MULTIMODAL_MODEL

def model_for_extension(extension):
    extension = extension.lower()
    if extension not in MODEL_BY_EXTENSION:
        raise ValueError(f"Sin modelo configurado para: {extension}")
    return MODEL_BY_EXTENSION[extension]

def is_multimodal(model):
    return "multimodal" in model

class VoyageEmbedding:
    def __init__(self, api_key):
        self.api_key = api_key
        import requests
        self.requests = requests

    @retry(
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    def embed_documents(self, contents, model=TEXT_MODEL):
        if is_multimodal(model):
            formatted_inputs = []
            for parts in contents:
                formatted_parts = []
                for part in parts:
                    if isinstance(part, str):
                        formatted_parts.append({"type": "text", "text": part})
                    else:
                        import io
                        import base64
                        buffered = io.BytesIO()
                        part.save(buffered, format="JPEG")
                        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                        formatted_parts.append({"type": "image_base64", "image_base64": f"data:image/jpeg;base64,{img_str}"})
                formatted_inputs.append({"content": formatted_parts})
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "inputs": formatted_inputs,
                "model": model,
                "input_type": "document"
            }
            resp = self.requests.post("https://ai.mongodb.com/v1/multimodalembeddings", headers=headers, json=payload, timeout=300)
            if resp.status_code != 200:
                raise Exception(f"API Error {resp.status_code}: {resp.text}")
            return [d["embedding"] for d in resp.json()["data"]]

        # Fallback to standard embeddings if text model is used
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "input": contents,
            "model": model,
            "input_type": "document"
        }
        resp = self.requests.post("https://ai.mongodb.com/v1/embeddings", headers=headers, json=payload, timeout=300)
        if resp.status_code != 200:
            raise Exception(f"API Error {resp.status_code}: {resp.text}")
        return [d["embedding"] for d in resp.json()["data"]]

    def embed_query(self, text, model=QUERY_MODEL):
        return self.embed_documents([[text]] if is_multimodal(model) else [text], model=model)[0]
