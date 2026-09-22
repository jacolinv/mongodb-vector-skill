import os
from pathlib import Path
import mammoth
from markdownify import markdownify as md

def convert_docx_to_md(docx_path):
    with open(docx_path, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
        html = result.value
        messages = result.messages
        if messages:
            print(f"Messages for {docx_path}: {messages}")
        
        markdown_text = md(html, heading_style="ATX")
        
        md_path = docx_path.with_suffix('.md')
        with open(md_path, "w", encoding="utf-8") as md_file:
            md_file.write(markdown_text)
        print(f"Converted: {docx_path.name} -> {md_path.name}")
        
        # Opcionalmente, eliminar el docx
        os.remove(docx_path)

if __name__ == "__main__":
    target_dir = Path("/Users/JACOLINV/Downloads/1.-BRD_s/Pack 3")
    for docx_path in target_dir.rglob("*.docx"):
        convert_docx_to_md(docx_path)

