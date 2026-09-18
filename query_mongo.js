import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "knowledgeVectors");
    const coll = db.collection(process.env.MONGODB_COLLECTION || "knowledge");
    
    const results = await coll.find({ documentId: "BRD Business Reports.docx.pdf" }).sort({ chunkIndex: 1 }).toArray();
    let text = "";
    for (const r of results) {
       if (r.text) text += r.text + "\n\n";
    }
    console.log(text.substring(0, 10000));
  } finally {
    await client.close();
  }
}
run().catch(console.error);
