/**
 * OpenAPI 3.1 specification for Paradigm Absolute API.
 * Serves at /api-docs (JSON) and /api-docs/ui (Swagger UI via CDN).
 */

export const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Paradigm Absolute API',
    version: '2.0.0',
    description: 'Genetic Operating Environment for Digital Creation — 27 domain engines, 17 gene types, 12 functor bridges.',
    contact: { name: 'Paradigm Team' },
  },
  servers: [
    { url: '/api', description: 'Local API' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Seed: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          $domain: { type: 'string', enum: ['character','sprite','music','narrative','level','item','spell','quest','dialogue','animation','vfx','ui','terrain','biome','faction','economy','lore','cutscene','shader','physics','ai_behavior','sound_design','architecture','vehicle','fullgame','cinematic','agent'] },
          $name: { type: 'string' },
          $lineage: { type: 'object', properties: { generation: { type: 'integer' }, operation: { type: 'string' }, parents: { type: 'array', items: { type: 'string' } } } },
          $hash: { type: 'string' },
          $fitness: { type: 'object', properties: { overall: { type: 'number', minimum: 0, maximum: 1 } } },
          genes: { type: 'object', additionalProperties: { type: 'object', properties: { type: { type: 'string' }, value: {} } } },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' }, code: { type: 'string' } } } },
        },
      },
      PaginatedSeeds: {
        type: 'object',
        properties: {
          seeds: { type: 'array', items: { $ref: '#/components/schemas/Seed' } },
          pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' }, hasNext: { type: 'boolean' }, hasPrev: { type: 'boolean' } } },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: { tags: ['Auth'], summary: 'Register a new user', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username','password'], properties: { username: { type: 'string', minLength: 3 }, password: { type: 'string', minLength: 8 } } } } } }, responses: { '200': { description: 'User created + JWT pair' }, '400': { description: 'Validation error' } } },
    },
    '/auth/login': {
      post: { tags: ['Auth'], summary: 'Authenticate user', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username','password'], properties: { username: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '200': { description: 'JWT pair' }, '401': { description: 'Invalid credentials' } } },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Refresh access token', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } }, responses: { '200': { description: 'New token pair' }, '401': { description: 'Invalid refresh token' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoke tokens', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Logged out' } } },
    },
    '/seeds': {
      get: { tags: ['Seeds'], summary: 'List seeds (paginated)', parameters: [ { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } }, { name: 'domain', in: 'query', schema: { type: 'string' } }, { name: 'sort', in: 'query', schema: { type: 'string', enum: ['created','fitness','domain'] } } ], responses: { '200': { description: 'Paginated seeds', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedSeeds' } } } } } },
      post: { tags: ['Seeds'], summary: 'Create seed', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain','name'], properties: { domain: { type: 'string' }, name: { type: 'string' }, genes: { type: 'object' } } } } } }, responses: { '200': { description: 'Created seed' }, '400': { description: 'Validation error' }, '401': { description: 'Unauthorized' } } },
    },
    '/seeds/{id}': {
      get: { tags: ['Seeds'], summary: 'Get seed by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Seed' }, '404': { description: 'Not found' } } },
      delete: { tags: ['Seeds'], summary: 'Delete seed', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } } },
    },
    '/seeds/generate': {
      post: { tags: ['Seeds'], summary: 'Generate seed from prompt', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prompt','domain'], properties: { prompt: { type: 'string' }, domain: { type: 'string' } } } } } }, responses: { '200': { description: 'Generated seed' } } },
    },
    '/seeds/{id}/mutate': {
      post: { tags: ['Operations'], summary: 'Mutate seed genes', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { rate: { type: 'number', minimum: 0, maximum: 1, default: 0.1 } } } } } }, responses: { '200': { description: 'Mutated seed' } } },
    },
    '/seeds/{id}/evolve': {
      post: { tags: ['Operations'], summary: 'Evolve seed population', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { population_size: { type: 'integer', minimum: 2, maximum: 100, default: 8 }, generations: { type: 'integer', minimum: 1, maximum: 50, default: 3 } } } } } }, responses: { '200': { description: 'Evolved population' } } },
    },
    '/seeds/breed': {
      post: { tags: ['Operations'], summary: 'Breed two seeds', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['parent_a_id','parent_b_id'], properties: { parent_a_id: { type: 'string', format: 'uuid' }, parent_b_id: { type: 'string', format: 'uuid' } } } } } }, responses: { '200': { description: 'Offspring seed' } } },
    },
    '/seeds/{id}/compose': {
      post: { tags: ['Operations'], summary: 'Compose seed to target domain', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['target_domain'], properties: { target_domain: { type: 'string' } } } } } }, responses: { '200': { description: 'Composed seed + path' } } },
    },
    '/seeds/{id}/grow': {
      post: { tags: ['Operations'], summary: 'Grow seed via domain engine', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Grown artifact' } } },
    },
    '/agent/query': {
      post: { tags: ['Agent'], summary: 'Query the GSPL agent', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string' }, message: { type: 'string' } } } } } }, responses: { '200': { description: 'Agent response' } } },
    },
    '/seeds/{id}/sign': {
      post: { tags: ['Sovereignty'], summary: 'Sign seed with ECDSA key', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['private_key'], properties: { private_key: { type: 'string' } } } } } }, responses: { '200': { description: 'Sovereignty data + verification' } } },
    },
    '/seeds/{id}/mint': {
      post: { tags: ['Sovereignty'], summary: 'Mint seed as ERC-721 NFT', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['owner_address'], properties: { owner_address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }, private_key: { type: 'string' }, ipfs_gateway: { type: 'string', format: 'uri' } } } } } }, responses: { '200': { description: 'Mint result or dry run' } } },
    },
    '/domains': {
      get: { tags: ['Metadata'], summary: 'List all 27 domains', responses: { '200': { description: 'Domain list' } } },
    },
    '/gene-types': {
      get: { tags: ['Metadata'], summary: 'List all 17 gene types', responses: { '200': { description: 'Gene type info' } } },
    },
    '/engines': {
      get: { tags: ['Metadata'], summary: 'List all engines', responses: { '200': { description: 'Engine list' } } },
    },
    '/composition/graph': {
      get: { tags: ['Metadata'], summary: 'Get functor bridge graph', responses: { '200': { description: 'Nodes + edges' } } },
    },
  },
};

/**
 * Returns a self-contained HTML page that loads Swagger UI from CDN.
 */
export function swaggerUIHTML(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Paradigm API — Swagger UI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css" />
  <style>body { margin: 0; background: #1a1a2e; } .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${specUrl}',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
    });
  </script>
</body>
</html>`;
}
