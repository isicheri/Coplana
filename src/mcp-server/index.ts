import { MCPServer } from "@mastra/mcp"
import { studyPlannerTool } from "./tools/studyPlannerTool.js";
import { studyReminderTool } from "./tools/reminderTool.js";
import { quizGeneratorTool } from "./tools/quizGeneratorTool.js";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

export const server = new MCPServer({
  name: "Study Assistant MCP Server",
  version: "1.0.0",
  tools: { studyPlannerTool,studyReminderTool,quizGeneratorTool },
});


export async function startHttpServer(port: number = 4112) {
  const { createServer } = await import('http');

  const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${port}`;

  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '', baseUrl);

      // Handle CORS for web clients
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Health check endpoint
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          server: 'Study assistant MCP server',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      await server.startSSE({
        url,
        ssePath: '/mcp',
        messagePath: '/mcp/message',
        req,
        res,
      });
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  httpServer.listen(port, () => {
    console.log(`🚀 MCP server running on ${baseUrl}/mcp`);
    console.log(`📊 Health check available at ${baseUrl}/health`);
    console.log(`🔧 Available tools: studyPlannerTool`);
    console.log(`🔧 Available tools: studyReminderTool`);
    console.log(`🔧 Available tools: quizGeneratorTool`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down MCP server...');
    await server.close();
    httpServer.close(() => {
      console.log('MCP server shut down complete');
      process.exit(0);
    });
  });

  return httpServer;
}

// If this file is run directly, start the HTTP server
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const port = parseInt(process.env.MCP_PORT || '4112', 10);
  startHttpServer(port).catch(console.error);
}