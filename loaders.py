import os
from pathlib import Path

import pymupdf
from PIL import Image


TEXT_EXTENSIONS = {".md", ".txt", ".csv", ".xml", ".json", ".js"}
OFFICE_EXTENSIONS = {".docx", ".xlsx"}
PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

SUPPORTED_EXTENSIONS = (
    TEXT_EXTENSIONS
    | OFFICE_EXTENSIONS
    | PDF_EXTENSIONS
    | IMAGE_EXTENSIONS
)

# Resolucion de rasterizado de paginas PDF antes de enviarlas al modelo multimodal
PDF_RENDER_DPI = int(
    os.getenv("PDF_RENDER_DPI", "150")
)

# Lado maximo de la imagen enviada a Voyage (controla el consumo de tokens)
IMAGE_MAX_SIDE = int(
    os.getenv("IMAGE_MAX_SIDE", "1568")
)


def _downscale(image: Image.Image) -> Image.Image:
    if max(image.size) <= IMAGE_MAX_SIDE:
        return image

    ratio = IMAGE_MAX_SIDE / max(image.size)

    new_size = (
        int(image.width * ratio),
        int(image.height * ratio)
    )

    return image.resize(new_size, Image.LANCZOS)


def load_markdown(path: Path):
    import io
    import re
    import base64
    import urllib.parse

    text = path.read_text(encoding="utf-8")
    blocks = []
    
    # 1. Extraer imágenes en Base64: ![alt](data:image/png;base64,...) o <img src="data:image/..." />
    base64_pattern = re.compile(r'!\[(.*?)\]\(data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=\s]+)\)|<img[^>]+src=["\']data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=\s]+)["\'][^>]*>', re.IGNORECASE)
    
    # 2. Extraer imágenes referenciadas por ruta relativa: ![alt](images/pic.png) o ![](./pic.png)
    file_ref_pattern = re.compile(r'!\[(.*?)\]\((?!data:image|http:\/\/|https:\/\/)([^)]+)\)|<img[^>]+src=["\'](?!data:image|http:\/\/|https:\/\/)([^"\']+)["\'][^>]*>', re.IGNORECASE)

    extracted_images = []

    # Procesar base64
    for match in base64_pattern.finditer(text):
        alt_text = match.group(1) or ""
        b64_str = match.group(2) or match.group(3)
        if b64_str:
            try:
                # Limpiar saltos de línea y espacios en la cadena base64
                clean_b64 = re.sub(r"\s+", "", b64_str)
                img_bytes = base64.b64decode(clean_b64)
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                label = f"{path.stem} - {alt_text}" if alt_text else f"{path.stem} - Imagen incrustada"
                extracted_images.append({
                    "modality": "image",
                    "text": label,
                    "image": _downscale(img),
                    "page": None
                })
            except Exception:
                continue

    # Procesar referencias de archivos locales
    for match in file_ref_pattern.finditer(text):
        alt_text = match.group(1) or ""
        rel_path_str = match.group(2) or match.group(4)
        if rel_path_str:
            # Quitar posibles parámetros o anchors tipo ?raw=true
            rel_path_clean = urllib.parse.unquote(rel_path_str.split("?")[0].split("#")[0].strip())
            img_path = (path.parent / rel_path_clean).resolve()
            if img_path.is_file() and img_path.suffix.lower() in IMAGE_EXTENSIONS:
                try:
                    img = Image.open(img_path).convert("RGB")
                    label = f"{path.stem} - {alt_text}" if alt_text else f"{path.stem} - {img_path.name}"
                    extracted_images.append({
                        "modality": "image",
                        "text": label,
                        "image": _downscale(img),
                        "page": None
                    })
                except Exception:
                    continue

    # Limpiar el texto de las cadenas gigantescas de base64 para evitar contaminar los chunks de texto
    clean_text = base64_pattern.sub(lambda m: f"![{m.group(1) or 'imagen'}]", text)
    
    # Bloque de texto principal
    blocks.append({
        "modality": "text",
        "text": clean_text.strip(),
        "image": None,
        "page": None
    })

    # Agregar las imágenes extraídas como bloques independientes
    blocks.extend(extracted_images)

    return blocks


def load_pdf(path: Path):
    """Cada pagina se devuelve como bloque multimodal: texto + imagen renderizada."""
    document = pymupdf.open(path)

    pages = []

    for page_number, page in enumerate(document, start=1):
        text = page.get_text()

        pixmap = page.get_pixmap(dpi=PDF_RENDER_DPI)

        image = Image.frombytes(
            "RGB",
            (pixmap.width, pixmap.height),
            pixmap.samples
        )

        pages.append({
            "modality": "multimodal",
            "text": text.strip(),
            "image": _downscale(image),
            "page": page_number
        })

    document.close()

    return pages


def load_image(path: Path):
    image = Image.open(path).convert("RGB")

    return [
        {
            "modality": "image",
            "text": path.stem.replace("_", " "),
            "image": _downscale(image),
            "page": None
        }
    ]


def load_office(path: Path):
    extension = path.suffix.lower()
    
    if extension == ".docx":
        import io
        import docx
        doc = docx.Document(path)
        blocks = []
        
        # 1. Extraer texto principal
        text_paragraphs = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
        full_text = "\n".join(text_paragraphs)
        if full_text:
            blocks.append({
                "modality": "text",
                "text": full_text,
                "image": None,
                "page": None
            })
            
        # 2. Extraer imágenes embebidas en el documento
        image_idx = 1
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                try:
                    img_data = rel.target_part.blob
                    image = Image.open(io.BytesIO(img_data)).convert("RGB")
                    blocks.append({
                        "modality": "image",
                        "text": f"{path.stem} - Imagen {image_idx}",
                        "image": _downscale(image),
                        "page": None
                    })
                    image_idx += 1
                except Exception as e:
                    # Si alguna imagen está corrupta o no es soportada por PIL, se omite
                    continue

        if not blocks:
            blocks.append({
                "modality": "text",
                "text": "",
                "image": None,
                "page": None
            })
        return blocks

    elif extension == ".xlsx":
        import openpyxl
        wb = openpyxl.load_workbook(path, data_only=True)
        lines = []
        for sheet in wb.worksheets:
            lines.append(f"--- Sheet: {sheet.title} ---")
            for row in sheet.iter_rows(values_only=True):
                # Filter out completely empty rows
                if not all(cell is None for cell in row):
                    lines.append(", ".join([str(cell) if cell is not None else "" for cell in row]))
        text = "\n".join(lines)
        
        return [
            {
                "modality": "text",
                "text": text,
                "image": None,
                "page": None
            }
        ]


def load_document(path: Path):

    extension = path.suffix.lower()

    if extension in PDF_EXTENSIONS:
        return load_pdf(path)

    if extension in TEXT_EXTENSIONS:
        return load_markdown(path)
        
    if extension in OFFICE_EXTENSIONS:
        return load_office(path)

    if extension in IMAGE_EXTENSIONS:
        return load_image(path)

    raise ValueError(
        f"Formato no soportado: {extension}"
    )
