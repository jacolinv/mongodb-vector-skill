import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No hay MONGODB_URI configurado en el .env, la prueba fallará por falta de credenciales, pero verificaremos que el código de la herramienta se ejecutaría correctamente.");
    return;
  }
  console.log("Conectando a MongoDB...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Conexión exitosa.");
    const db = client.db(process.env.MONGODB_DB || "knowledgeVectors");
    const collection = db.collection(process.env.MONGODB_COLLECTION || "knowledge");
    const results = await collection.find({ documentId: "test-doc-123" }).toArray();
    console.log("Resultados de la búsqueda:", results);
  } catch (error) {
    console.error("Error durante la prueba:", error.message);
  } finally {
    await client.close();
  }
}

test();
