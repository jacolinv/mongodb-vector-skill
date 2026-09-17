from pymongo import MongoClient

class MongoDB:

    def __init__(self, uri, database, collection):
        self.client = MongoClient(uri)
        self.db = self.client[database]
        self.collection = self.db[collection]

    def insert_many(self, documents):
        if documents:
            return self.collection.insert_many(documents)

    def get_document_checksum(self, document_id):
        existing = self.collection.find_one(
            {"documentId": document_id},
            {"checksum": 1}
        )

        if not existing:
            return None

        return existing.get("checksum")

    def delete_document(self, document_id):
        self.collection.delete_many({
            "documentId": document_id
        })
