# Portfolio MCP Server for Cloudflare Workers

A Model Context Protocol (MCP) server that exposes portfolio data through a read-only API, deployed on Cloudflare Workers. This allows AI assistants like Claude to browse and explore portfolio projects and skills.

## 🌟 Features

- **Read-only public API** - Safe for public consumption
- **MCP Protocol compliant** - Works with Claude Desktop and other MCP clients
- **Server-sent Events (SSE)** support for streamable HTTP transport
- **Cloudflare Workers deployment** - Fast global edge deployment
- **Django REST API integration** - Connects to existing Django backend
- **Cloudflare Access authentication** - Secure API access

## 🔧 Available Tools

### Public Tools (Exposed)
- `list_projects` - Retrieve all portfolio projects with details
- `list_skills` - Retrieve all skills and expertise information

### Private Tools (Hidden but implemented)
- `create_project` - Create new portfolio projects
- `get_project` - Get specific project by ID
- `update_project` - Update existing projects  
- `delete_project` - Remove projects

## 🚀 Quick Start

### Prerequisites
- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Existing Django REST API with portfolio data

### Deployment

1. **Clone and configure**
   ```bash
   git clone https://github.com/oskarcode/portfolio-mcp-server.git
   cd portfolio-mcp-server
   ```

2. **Update wrangler.toml**
   ```toml
   name = "your-mcp-server-name"
   main = "src/index.js"
   compatibility_date = "2024-01-01"
   account_id = "your-cloudflare-account-id"

   [vars]
   API_BASE = "https://your-django-api.com/api/"
   ```

3. **Set secrets (optional)**
   ```bash
   wrangler secret put CF_ACCESS_CLIENT_ID
   wrangler secret put CF_ACCESS_CLIENT_SECRET
   ```

4. **Deploy**
   ```bash
   wrangler deploy
   ```

### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "your-portfolio-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-mcp-server.your-subdomain.workers.dev"
      ]
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

## 🛠 Usage Examples

### Test via curl

```bash
# Check server status
curl https://your-mcp-server.workers.dev

# List available tools
curl -X POST https://your-mcp-server.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Get all projects
curl -X POST https://your-mcp-server.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_projects",
      "arguments": {}
    }
  }'
```

### Claude Desktop Usage

After setup, you can ask Claude:
- "Show me all the projects in the portfolio"
- "What skills are listed in the portfolio?"
- "Tell me about the most recent projects"

## 📁 Project Structure

```
portfolio-mcp-server/
├── src/
│   └── index.js           # Main MCP server implementation
├── wrangler.toml         # Cloudflare Workers configuration
├── .gitignore           # Git ignore file
└── README.md            # This documentation
```

## 🔒 Security Features

- **Public tool filtering** - Only safe read-only tools are exposed
- **Error handling** - Graceful error responses for blocked operations
- **Cloudflare Access** - Optional authentication for API access
- **CORS support** - Proper cross-origin headers

## 🧩 Architecture

```
Claude Desktop → mcp-remote → Cloudflare Workers → Django REST API
```

1. **Claude Desktop** uses `mcp-remote` to connect to the MCP server
2. **Cloudflare Workers** hosts the MCP server with global edge deployment
3. **Django REST API** provides the actual portfolio data
4. **MCP Protocol** ensures standardized communication

## 📊 API Response Format

### Project Object
```json
{
  "id": 1,
  "title": "Project Name",
  "description": "Project description",
  "link": "https://project-url.com",
  "use_case": "Project use case",
  "frontend": "Technology stack",
  "backend": "Backend technologies", 
  "hosting": "Hosting platform",
  "created_date": "2025-06-07",
  "skills": [...]
}
```

### Skill Object
```json
{
  "id": 1,
  "skill": "Skill name",
  "example": "Detailed example of expertise",
  "links": [
    {
      "id": 1,
      "url": "https://example.com",
      "link_name": "Example Link"
    }
  ]
}
```

## 🔧 Configuration Options

### Environment Variables

- `API_BASE` - Base URL of your Django REST API
- `CF_ACCESS_CLIENT_ID` - Cloudflare Access client ID (optional)
- `CF_ACCESS_CLIENT_SECRET` - Cloudflare Access client secret (optional)

### Customization

To modify exposed tools, edit the `publicTools` array in `src/index.js`:

```javascript
const publicTools = ['list_projects', 'list_skills', 'your_new_tool'];
```

To add new tools, implement them in the `tools` object and add to the schema in `tools/list`.

## 🚨 Troubleshooting

### Common Issues

1. **"Tool not available" errors**
   - Ensure tool names match exactly
   - Check `publicTools` array includes your tool

2. **Connection timeouts**
   - Verify Cloudflare Workers deployment
   - Check API_BASE URL is accessible

3. **Authentication errors**
   - Verify Cloudflare Access credentials
   - Test Django API endpoints directly

### Debug Mode

Add logging to `src/index.js`:

```javascript
console.log('Request:', JSON.stringify(requestData));
console.log('Response:', JSON.stringify(responseData));
```

View logs with:
```bash
wrangler tail
```

## 📈 Performance

- **Cold start**: ~100ms (JavaScript Workers)
- **Response time**: ~50-200ms (depending on Django API)
- **Global edge**: Deployed to 300+ Cloudflare locations
- **Concurrent requests**: Scales automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 🔄 Django to MCP Conversion Template

This template helps you convert any Django REST API to an MCP server. See the complete documentation for detailed examples and implementation patterns.
