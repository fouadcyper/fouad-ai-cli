import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
const server = new McpServer({ name: 'fouad-mock', version: '0.1.0' });
server.registerTool(
  'echo',
  { description: 'Echo safe test input', inputSchema: { text: z.string() } },
  async ({ text }) => ({ content: [{ type: 'text', text }] }),
);
await server.connect(new StdioServerTransport());
