// Simple JavaScript MCP Server for Portfolio Management
// Cloudflare Workers implementation

async function makeApiRequest(method, endpoint, data = null, env) {
  const url = `${env.API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add Cloudflare Access headers if available
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
    headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
  }
  
  try {
    const options = {
      method: method,
      headers: headers
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return { error: `Request failed: ${error.message}` };
  }
}

// MCP Tool implementations
const tools = {
  async create_project(args, env) {
    const { title, description, link, use_case, frontend, backend, hosting, skill_ids } = args;
    
    const payload = { title, description, link };
    if (use_case) payload.use_case = use_case;
    if (frontend) payload.frontend = frontend;
    if (backend) payload.backend = backend;
    if (hosting) payload.hosting = hosting;
    if (skill_ids) payload.skill_ids = skill_ids;
    
    return await makeApiRequest('POST', 'projects/', payload, env);
  },
  
  async list_projects(args, env) {
    return await makeApiRequest('GET', 'projects/', null, env);
  },
  
  async list_skills(args, env) {
    return await makeApiRequest('GET', 'skills/', null, env);
  },
  
  async get_project(args, env) {
    const { project_id } = args;
    return await makeApiRequest('GET', `projects/${project_id}/`, null, env);
  },
  
  async update_project(args, env) {
    const { project_id, ...updateData } = args;
    const payload = {};
    
    // Only include non-null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== null && updateData[key] !== undefined) {
        payload[key] = updateData[key];
      }
    });
    
    return await makeApiRequest('PUT', `projects/${project_id}/`, payload, env);
  },
  
  async delete_project(args, env) {
    const { project_id } = args;
    return await makeApiRequest('DELETE', `projects/${project_id}/`, null, env);
  }
};

// MCP Protocol handler
async function handleMcpRequest(requestData, env) {
  try {
    const { method, params = {}, id } = requestData;
    
    if (method === 'tools/call') {
      const toolName = params.name;
      const arguments_ = params.arguments || {};
      
      // Only allow public read-only tools
      const publicTools = ['list_projects', 'list_skills'];
      
      if (!publicTools.includes(toolName)) {
        return {
          jsonrpc: "2.0",
          id: id,
          error: { code: -32601, message: `Tool not available: ${toolName}` }
        };
      }
      
      if (tools[toolName]) {
        const result = await tools[toolName](arguments_, env);
        return {
          jsonrpc: "2.0",
          id: id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result) }]
          }
        };
      } else {
        return {
          jsonrpc: "2.0",
          id: id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` }
        };
      }
    }
    
    if (method === 'tools/list') {
      // Only expose read-only list tools for public use
      const toolList = [
        {
          name: "list_projects",
          description: "List all projects in the portfolio",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "list_skills",
          description: "List all skills in the portfolio",
          inputSchema: { type: "object", properties: {} }
        }
      ];
      
      return {
        jsonrpc: "2.0",
        id: id,
        result: { tools: toolList }
      };
    }
    
    if (method === 'initialize') {
      return {
        jsonrpc: "2.0",
        id: id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "portfolio-mcp-server",
            version: "1.0.0"
          }
        }
      };
    }
    
    return {
      jsonrpc: "2.0",
      id: id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
    
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: requestData.id || null,
      error: { code: -32000, message: `Server error: ${error.message}` }
    };
  }
}

// Helper functions for responses
function createJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
    }
  });
}

function createSseResponse(data) {
  const sseData = `data: ${JSON.stringify(data)}\n\n`;
  return new Response(sseData, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
    }
  });
}

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Check if client wants SSE format
      const acceptHeader = request.headers.get('Accept') || '';
      const wantsSSE = acceptHeader.includes('text/event-stream') || path === '/sse';
      
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
          }
        });
      }
      
      // Handle GET request for server info or SSE connection
      if (request.method === 'GET') {
        if (path === '/sse') {
          // SSE connection establishment
          const connectionData = { type: "connection_established" };
          return createSseResponse(connectionData);
        } else {
          // Server info
          const info = {
            name: "portfolio-mcp-server",
            version: "1.0.0",
            description: "Portfolio MCP Server (JavaScript)",
            status: "running"
          };
          return wantsSSE ? createSseResponse(info) : createJsonResponse(info);
        }
      }
      
      // Handle POST requests for MCP protocol
      if (request.method === 'POST') {
        const requestData = await request.json();
        const responseData = await handleMcpRequest(requestData, env);
        
        return wantsSSE ? createSseResponse(responseData) : createJsonResponse(responseData);
      }
      
      // Method not allowed
      const errorResponse = { error: "Method not allowed" };
      return wantsSSE ? createSseResponse(errorResponse) : createJsonResponse(errorResponse, 405);
      
    } catch (error) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Server error: ${error.message}` }
      };
      return createJsonResponse(errorResponse, 500);
    }
  }
};