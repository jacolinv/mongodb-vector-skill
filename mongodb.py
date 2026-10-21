from pymongo import MongoClient

class MongoDB:

    def __init__(self, uri, database, collection):
        self.client = MongoClient(uri)
        self.db = self.client[database]
        self.collection = self.db[collection]

    def get_all_checksums(self):
        return set(self.collection.distinct("checksum"))

    def check_checksum_exists(self, checksum):
        return self.collection.count_documents({"checksum": checksum}, limit=1) > 0

    def delete_document(self, document_id):
        result = self.collection.delete_many({"documentId": document_id})
        return result.deleted_count

    def insert_many(self, documents):
        if not documents:
            return None
        
        result = None
        for i, doc in enumerate(documents):
            # Check the raw size of the document before sending
            import bson
            try:
                bson_size = len(bson.BSON.encode(doc))
                if bson_size > 15000000: # Slightly under 16MB limit
                    print(f"Advertencia: El documento {doc.get('documentId', 'unknown')} es demasiado grande ({bson_size} bytes). Omitiendo.")
                    continue
                res = self.collection.insert_one(doc)
                if not result:
                    result = res
            except Exception as e:
                print(f"Error insertando documento {doc.get('documentId', 'unknown')}: {e}")
        return result
