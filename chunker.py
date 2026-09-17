import re

def split_sentences(text):
    """ Divide el texto en oraciones """
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = re.split(
        r"(?<=[.!?])\s+",
        text
    )
    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]

def chunk_text(
    text,
    chunk_size=1200,
    overlap_sentences=1
):
    # Divide el texto por oraciones y agrupa hasta alcanzar aproximadamente chunk_size caracteres
    # overlap_sentences indica cuántas oraciones del chunk anterior se reutilizan en el siguiente

    sentences = split_sentences(text)

    if not sentences:
        return []
    chunks = []
    current_chunk = []
    current_size = 0
    i = 0

    while i < len(sentences):
        sentence = sentences[i]
        sentence_size = len(sentence)
        # Si agregar esta oración excede el tamaño, se cierra el chunk actual
        if (
            current_chunk
            and current_size + sentence_size > chunk_size
        ):
            chunks.append(
                " ".join(current_chunk)
            )

            # Se conservan las últimas N oraciones como overlap
            current_chunk = current_chunk[
                -overlap_sentences:
            ]
            current_size = sum(
                len(s)
                for s in current_chunk
            )
        current_chunk.append(sentence)
        current_size += sentence_size + 1
        i += 1

    # Último chunk
    if current_chunk:
        chunks.append(
            " ".join(current_chunk)
        )
    return chunks