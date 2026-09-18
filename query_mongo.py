import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_DB", "knowledgeVectors")
coll_name = os.getenv("MONGODB_COLLECTION", "knowledge")

client = MongoClient(uri)
db = client[db_name]
coll = db[coll_name]

# Fetch chunks for the document
chunks = coll.find({"documentId": "BRD Business Reports.docx.pdf"}).sort("chunkIndex", 1)

text_content = ""
for chunk in chunks:
    if "text" in chunk:
        text_content += chunk["text"] + "\n\n"

print(text_content[:4000]) # Print the first 4000 characters to get an idea of the document
print(f"\n--- Total length: {len(text_content)} chars ---")
