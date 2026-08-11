import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDidItLandServer } from "./server";

const server = createDidItLandServer();
const transport = new StdioServerTransport();

await server.connect(transport);
