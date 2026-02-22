# Privacy & Data Handling

## Remote Endpoint

When using the hosted endpoint, your queries are processed by:

- **Vercel** (serverless infrastructure) — see Vercel's privacy policy
- **Your AI client** (Claude, ChatGPT, etc.) — see their respective privacy policies

No query data is logged, stored, or retained by the MCP server itself. The server
is stateless — each request is processed and discarded.

## Local Installation

For maximum privacy, use the local npm package:

    npx @ansvar/international-financial-regulation-mcp

This runs entirely on your machine. No network requests are made except to your
local AI client.

## Data Collection

This MCP server:
- Does **not** collect, store, or transmit user queries
- Does **not** use cookies, analytics, or tracking
- Does **not** require authentication or user accounts
- Contains **only** publicly available data from authoritative sources
