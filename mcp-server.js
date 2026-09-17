import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "knowledgeVectors";
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || "knowledge";
const INDEX_NAME = process.env.VECTOR_INDEX_NAME || "vector_index";

const server = new Server(
  {
    name: "mongodb-vector-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define las herramientas disponibles para el Agente
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mongodb_vector_search",
        description:
          "Realiza una búsqueda vectorial usando el pipeline aggregate de MongoDB Atlas Vector Search.",
        inputSchema: {
          type: "object",
          properties: {
            vector: {
              type: "array",
              items: { type: "number" },
              description: "Arreglo de floats (embeddings) para la consulta.",
            },
            limit: {
              type: "number",
              description: "Cantidad máxima de resultados a retornar.",
              default: 5,
            },
            numCandidates: {
              type: "number",
              description: "Candidatos a considerar en la búsqueda approx.",
              default: 50,
            },
            path: {
              type: "string",
              description: "Campo del documento que contiene el vector/embedding.",
              default: "embedding",
            },
          },
          required: ["vector"],
        },
      },
    ],
  };
});

// Maneja la ejecución de la herramienta
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "mongodb_vector_search") {
    const { vector, limit = 5, numCandidates = 50, path = "embedding" } = request.params.arguments;
    let client;

    try {
      client = new MongoClient(MONGO_URI);
      await client.connect();
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      // Agregación con operador $vectorSearch de MongoDB Atlas
      const pipeline = [
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: path,
            queryVector: vector,
            numCandidates: numCandidates,
            limit: limit,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
        {
            $sort:{
                score:-1
            }
        }
      ];

      const results = await collection.aggregate(pipeline).toArray();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error al ejecutar vectorSearch en MongoDB: ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  throw new Error(`Herramienta no encontrada: ${request.params.name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);
