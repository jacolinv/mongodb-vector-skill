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
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || "vector_index";

const server = new Server(
  {
    name: "mongodb-vector-search",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mongodb_vector_search",
        // Descripción hiper-directa para obligar al LLM
        description: "ÚNICA HERRAMIENTA PERMITIDA para realizar búsquedas semánticas y por vectores en MongoDB Atlas usando $vectorSearch.",
        inputSchema: {
          type: "object",
          properties: {
            vector: {
              type: "array",
              items: { type: "number" },
              description: "El arreglo de floats que representa el embedding de la consulta.",
            },
            limit: {
              type: "number",
              description: "Número máximo de documentos a retornar.",
              default: 5
            }
          },
          required: ["vector"], // Forzar que 'vector' sea obligatorio
        },
      },
    ],
  };
});

// Implement tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "mongodb_vector_search") {
    throw new Error(`Tool not found: ${request.params.name}`);
  }

  const { vector, limit = 5 } = request.params.arguments;

  if (!vector || !Array.isArray(vector)) {
    throw new Error("El parámetro 'vector' es requerido y debe ser un arreglo numérico.");
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding", // Cambia esto si el campo del vector en tus documentos tiene otro nombre
          queryVector: vector,
          numCandidates: Math.max(100, limit * 10), // numCandidates debe ser mayor que limit
          limit: limit
        }
      },
      {
        $project: {
          embedding: 0, // Excluimos el vector gigante en la respuesta para ahorrar memoria
          score: { $meta: "vectorSearchScore" } // Para saber el grado de similitud
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
    console.error("Error ejecutando $vectorSearch:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error ejecutando búsqueda vectorial: ${error.message}`,
        },
      ],
      isError: true,
    };
  } finally {
    await client.close();
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MongoDB Vector Search MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
