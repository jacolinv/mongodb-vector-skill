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
