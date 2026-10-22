import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "knowledgeVectors";
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || "knowledge";
const INDEX_NAME = process.env.VECTOR_INDEX_NAME || "vector_index";

const ATLASSIAN_DOMAIN_RAW = process.env.ATLASSIAN_DOMAIN || "";
const ATLASSIAN_USER = process.env.ATLASSIAN_USER || "";
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || "";

const CONFLUENCE_ALLOWED_SPACES = (process.env.CONFLUENCE_ALLOWED_SPACES || "CU")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const JIRA_ALLOWED_PROJECTS = (process.env.JIRA_ALLOWED_PROJECTS || "CM,CPI,CUD,CUQ")
  .split(",")
  .map((p) => p.trim().toUpperCase())
  .filter(Boolean);

function applyAtlassianScopeFilter(rawQuery, fieldName, allowedList, defaultOrderBy = "") {
  if (!allowedList || allowedList.length === 0) return rawQuery;
  const inClause = `${fieldName} IN (${allowedList.map((v) => `"${v}"`).join(", ")})`;
  const trimmed = (rawQuery || "").trim();
  if (!trimmed) {
    return defaultOrderBy ? `${inClause} ${defaultOrderBy}` : inClause;
  }

  const orderMatch = trimmed.match(/\bORDER\s+BY\b/i);
  if (orderMatch) {
    const idx = orderMatch.index;
    const filterPart = trimmed.slice(0, idx).trim();
    const orderPart = trimmed.slice(idx).trim();
    return filterPart
      ? `${inClause} AND (${filterPart}) ${orderPart}`
      : `${inClause} ${orderPart}`;
  }

  return `${inClause} AND (${trimmed})`;
}

let atlassianDomain = ATLASSIAN_DOMAIN_RAW;
const domainMatch = atlassianDomain.match(/https?:\/\/([^/]+)/);
if (domainMatch) atlassianDomain = domainMatch[1];

const atlassianAuthHeader = `Basic ${Buffer.from(`${ATLASSIAN_USER}:${ATLASSIAN_API_TOKEN}`).toString("base64")}`;

function stripHtml(html) {
  if (!html) return "";
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&aacute;": "á",
    "&eacute;": "é",
    "&iacute;": "í",
    "&oacute;": "ó",
    "&uacute;": "ú",
    "&Aacute;": "Á",
    "&Eacute;": "É",
    "&Iacute;": "Í",
    "&Oacute;": "Ó",
    "&Uacute;": "Ú",
    "&ntilde;": "ñ",
    "&Ntilde;": "Ñ",
    "&uuml;": "ü",
    "&Uuml;": "Ü",
    "&iquest;": "¿",
    "&iexcl;": "¡",
    "&rarr;": "→",
    "&larr;": "←",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&ndash;": "–",
    "&mdash;": "—",
  };
  return html
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-zA-Z0-9#]+;/g, (match) => entities[match] || match)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let cachedCloudId = null;
let useAtlassianGateway = false;

async function getAtlassianCloudId() {
  if (cachedCloudId) return cachedCloudId;
  const res = await fetch(`https://${atlassianDomain}/_edge/tenant_info`);
  if (!res.ok) return null;
  const data = await res.json();
  cachedCloudId = data.cloudId || null;
  return cachedCloudId;
}

async function atlassianGet(endpoint, queryParams = {}) {
  const buildUrl = (base) => {
    const url = new URL(`${base}${endpoint}`);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  };

  const fetchFromGateway = async () => {
    const cloudId = await getAtlassianCloudId();
    if (!cloudId) return null;
    const product = endpoint.startsWith("/wiki") ? "confluence" : "jira";
    const gatewayBase = `https://api.atlassian.com/ex/${product}/${cloudId}`;
    return fetch(buildUrl(gatewayBase), {
      method: "GET",
      headers: {
        Authorization: atlassianAuthHeader,
        Accept: "application/json",
      },
    });
  };

  let response;
  if (useAtlassianGateway) {
    response = await fetchFromGateway();
  } else {
    response = await fetch(buildUrl(`https://${atlassianDomain}`), {
      method: "GET",
      headers: {
        Authorization: atlassianAuthHeader,
        Accept: "application/json",
      },
    });

    // Fallback automático a api.atlassian.com si se usa un API Token con Scopes
    if (response.status === 401) {
      const gwResponse = await fetchFromGateway();
      if (gwResponse) {
        useAtlassianGateway = true;
        response = gwResponse;
      }
    }
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Atlassian API Error (${response.status}): ${text}`);
  }
  const parsed = JSON.parse(text);

  // Jira en el dominio directo devuelve 200 con issues:[] ante tokens con scopes; verificar por Gateway
  if (
    !useAtlassianGateway &&
    endpoint.startsWith("/rest/api/") &&
    Array.isArray(parsed.issues) &&
    parsed.issues.length === 0
  ) {
    const gwResponse = await fetchFromGateway();
    if (gwResponse && gwResponse.ok) {
      useAtlassianGateway = true;
      return JSON.parse(await gwResponse.text());
    }
  }

  return parsed;
}

const server = new Server(
  {
    name: "mongodb-vector-mcp",
    version: "1.7.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define las herramientas disponibles para el Agente (MongoDB + Confluence + Jira)
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
      {
        name: "find_by_document_id",
        description: "Realiza una búsqueda por documento utilizando documentId.",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",
              description: "El ID del documento a buscar.",
            },
          },
          required: ["documentId"],
        },
      },
      {
        name: "search_confluence",
        description:
          "Busca páginas en Confluence utilizando CQL (restringido automáticamente a los espacios de Comercio Unificado configurados en CONFLUENCE_ALLOWED_SPACES, ej. CU).",
        inputSchema: {
          type: "object",
          properties: {
            cql: {
              type: "string",
              description:
                "Consulta en formato CQL. Ejemplos: text ~ 'término', type = 'page' ORDER BY lastmodified DESC",
            },
            limit: {
              type: "number",
              description: "Número máximo de resultados (default 5)",
              default: 5,
            },
          },
          required: ["cql"],
        },
      },
      {
        name: "read_confluence_page",
        description:
          "Lee el contenido completo de una página específica de Confluence dado su ID (solo páginas dentro de los espacios permitidos de Comercio Unificado).",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "El ID numérico de la página de Confluence",
            },
          },
          required: ["pageId"],
        },
      },
      {
        name: "search_jira_issues",
        description:
          "Busca tickets (issues) en Jira utilizando JQL (restringido automáticamente a los proyectos de Comercio Unificado configurados en JIRA_ALLOWED_PROJECTS: CM, CPI, CUD, CUQ).",
        inputSchema: {
          type: "object",
          properties: {
            jql: {
              type: "string",
              description:
                "Consulta en formato JQL. Ejemplo: updated >= -30d ORDER BY updated DESC o text ~ 'término'",
            },
            limit: {
              type: "number",
              description: "Número máximo de resultados (default 5)",
              default: 5,
            },
          },
          required: ["jql"],
        },
      },
      {
        name: "read_jira_issue",
        description:
          "Obtiene el detalle completo de un ticket de Jira dada su clave (restringido a los proyectos de Comercio Unificado: CM, CPI, CUD, CUQ).",
        inputSchema: {
          type: "object",
          properties: {
            issueKey: {
              type: "string",
              description: "La clave o ID del ticket de Jira (ej. CM-120, CUD-45)",
            },
          },
          required: ["issueKey"],
        },
      },
    ],
  };
});

// Maneja la ejecución de la herramienta
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "mongodb_vector_search") {
    const { vector, limit = 5, numCandidates = 50, path: vectorPath = "embedding" } = args;
    let client;

    try {
      client = new MongoClient(MONGO_URI);
      await client.connect();
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      const pipeline = [
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: vectorPath,
            queryVector: vector,
            numCandidates: numCandidates,
            limit: limit,
          },
        },
        {
          $project: {
            _id: 0,
            documentId: 1,
            text: 1,
            page: 1,
            chunkIndex: 1,
            fileType: 1,
            version: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
        {
          $sort: {
            score: -1,
          },
        },
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

  if (name === "find_by_document_id") {
    const { documentId } = args;
    let client;

    try {
      client = new MongoClient(MONGO_URI);
      await client.connect();
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      const results = await collection.find({ documentId: documentId }).toArray();

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
            text: `Error al ejecutar find_by_document_id en MongoDB: ${error.message}`,
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

  try {
    if (name === "search_confluence") {
      const cql = applyAtlassianScopeFilter(
        args.cql || 'type = "page" ORDER BY lastmodified DESC',
        "space",
        CONFLUENCE_ALLOWED_SPACES,
        "ORDER BY lastmodified DESC"
      );
      const limit = args.limit || 5;

      const data = await atlassianGet(`/wiki/rest/api/content/search`, {
        cql,
        limit,
        expand: "space,history,history.lastUpdated,version",
      });

      const results = (data.results || []).map((page) => {
        const versionNum = page.version?.number || 1;
        const actionType =
          versionNum === 1 ? "Creado (v1)" : `Modificado (v${versionNum})`;
        const created = page.history?.createdDate || "N/A";
        const updated =
          page.version?.when || page.history?.lastUpdated?.when || "N/A";
        return `ID: ${page.id} | Titulo: ${page.title} | Espacio: ${page.space?.name || "N/A"} (${page.space?.key || "N/A"}) | Accion: ${actionType} | Creado: ${created} | Actualizado: ${updated} | Url: https://${atlassianDomain}/wiki${page._links?.webui || ""}`;
      });

      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? results.join("\n")
                : `No se encontraron resultados en Confluence dentro de los espacios permitidos (${CONFLUENCE_ALLOWED_SPACES.join(", ")}).`,
          },
        ],
      };
    }

    if (name === "read_confluence_page") {
      const pageId = String(args.pageId).trim();

      if (CONFLUENCE_ALLOWED_SPACES.length > 0) {
        const checkCql = applyAtlassianScopeFilter(
          `id = ${pageId}`,
          "space",
          CONFLUENCE_ALLOWED_SPACES
        );
        const checkData = await atlassianGet(`/wiki/rest/api/content/search`, {
          cql: checkCql,
          limit: 1,
        });
        if (!checkData.results || checkData.results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Acceso restringido: La página ${pageId} no pertenece a los espacios permitidos de Comercio Unificado (${CONFLUENCE_ALLOWED_SPACES.join(", ")}) o no existe.`,
              },
            ],
            isError: true,
          };
        }
      }

      const data = await atlassianGet(`/wiki/api/v2/pages/${pageId}`, {
        "body-format": "storage",
      });

      const htmlContent = data.body?.storage?.value || "";
      const title = data.title;
      const textContent = stripHtml(htmlContent);

      return {
        content: [
          {
            type: "text",
            text: `--- PAGINA CONFLUENCE: ${title} (ID: ${pageId}) ---\n\n${textContent}`,
          },
        ],
      };
    }

    if (name === "search_jira_issues") {
      const jql = applyAtlassianScopeFilter(
        args.jql || "updated >= -30d ORDER BY updated DESC",
        "project",
        JIRA_ALLOWED_PROJECTS,
        "ORDER BY updated DESC"
      );
      const limit = args.limit || 5;

      const data = await atlassianGet(`/rest/api/3/search/jql`, {
        jql,
        maxResults: limit,
        fields: "summary,status,assignee,issuetype,priority,updated,created,project",
      });

      const issues = data.issues || [];
      const results = issues.map((issue) => {
        const f = issue.fields || {};
        return (
          `Clave: ${issue.key} | Proyecto: ${f.project?.name || "N/A"} (${f.project?.key || "N/A"}) | Tipo: ${f.issuetype?.name || "N/A"} | Estado: ${f.status?.name || "N/A"} | ` +
          `Asignado: ${f.assignee?.displayName || "Sin asignar"} | Actualizado: ${f.updated || "N/A"} | ` +
          `Resumen: ${f.summary || "Sin título"} | Url: https://${atlassianDomain}/browse/${issue.key}`
        );
      });

      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? results.join("\n")
                : `No se encontraron tickets en Jira dentro de los proyectos permitidos de Comercio Unificado (${JIRA_ALLOWED_PROJECTS.join(", ")}).`,
          },
        ],
      };
    }

    if (name === "read_jira_issue") {
      const issueKey = String(args.issueKey).trim().toUpperCase();
      const prefix = issueKey.split("-")[0];

      if (
        JIRA_ALLOWED_PROJECTS.length > 0 &&
        !JIRA_ALLOWED_PROJECTS.includes(prefix)
      ) {
        return {
          content: [
            {
              type: "text",
              text: `Acceso restringido: El ticket ${issueKey} pertenece al proyecto '${prefix}', fuera de los proyectos permitidos de Comercio Unificado (${JIRA_ALLOWED_PROJECTS.join(", ")}).`,
            },
          ],
          isError: true,
        };
      }

      const data = await atlassianGet(`/rest/api/3/issue/${issueKey}`, {
        expand: "renderedFields",
      });

      const f = data.fields || {};
      const rf = data.renderedFields || {};
      const descriptionText = rf.description
        ? stripHtml(rf.description)
        : typeof f.description === "string"
          ? f.description
          : JSON.stringify(f.description || "Sin descripción");

      const comments = (rf.comment?.comments || f.comment?.comments || [])
        .slice(-5)
        .map((c) => {
          const body = typeof c.body === "string" ? stripHtml(c.body) : JSON.stringify(c.body);
          return `[${c.created || ""}] ${c.author?.displayName || "Usuario"}: ${body}`;
        });

      const output = [
        `--- TICKET JIRA: ${data.key} ---`,
        `Resumen: ${f.summary || "Sin título"}`,
        `Tipo: ${f.issuetype?.name || "N/A"} | Estado: ${f.status?.name || "N/A"} | Prioridad: ${f.priority?.name || "N/A"}`,
        `Reportador: ${f.reporter?.displayName || "N/A"} | Asignado: ${f.assignee?.displayName || "Sin asignar"}`,
        `Creado: ${f.created || "N/A"} | Actualizado: ${f.updated || "N/A"}`,
        `URL: https://${atlassianDomain}/browse/${data.key}`,
        `\n--- DESCRIPCIÓN ---\n${descriptionText}`,
        comments.length > 0 ? `\n--- ÚLTIMOS COMENTARIOS ---\n${comments.join("\n\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error ejecutando la herramienta ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  throw new Error(`Herramienta no encontrada: ${name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);
