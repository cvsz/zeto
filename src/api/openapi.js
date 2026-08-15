const document = {
  openapi: "3.1.0",
  info: { title: "Zeto API", version: "2.0.0-alpha.1" },
  paths: {
    "/v1/providers": {
      get: {
        summary: "List publishing providers and capabilities",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Provider capabilities" } },
      },
    },
    "/v1/factory-runs": {
      post: {
        summary: "Start or replay the canonical M01-M10 content factory",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          202: {
            description: "Run accepted and processed to completion or approval",
          },
          422: { description: "Validation error" },
        },
      },
    },
    "/v1/factory-runs/{runId}/approve": {
      post: {
        summary: "Approve and resume a paused factory run",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Run resumed" } },
      },
    },
    "/v1/brands": {
      get: {
        summary: "List brands",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Brands" } },
      },
      post: {
        summary: "Create a brand",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          201: { description: "Created" },
          422: { description: "Validation error" },
        },
      },
    },
    "/v1/workflows": {
      post: {
        summary: "Create a workflow definition",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Created" },
          422: { description: "Validation error" },
        },
      },
    },
    "/v1/workflows/{workflowId}/runs": {
      post: {
        summary: "Start or replay an idempotent workflow run",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "workflowId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 202: { description: "Accepted" } },
      },
    },
    "/v1/workflow-runs/{runId}": {
      get: {
        summary: "Inspect a workflow run and its steps",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Workflow run" },
          404: { description: "Not found" },
        },
      },
    },
    "/v1/workflow-runs": {
      get: {
        summary: "List recent workflow runs for a brand",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Workflow runs" } },
      },
    },
    "/v1/workflow-runs/{runId}/cancel": {
      post: {
        summary: "Cancel a workflow run",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Cancelled" } },
      },
    },
    "/v1/metrics": {
      post: {
        summary: "Ingest validated daily provider metrics",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Stored" },
          422: { description: "Validation error" },
        },
      },
    },
    "/v1/analytics/control-room": {
      get: {
        summary: "Read current and prior-period control room metrics",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Analytics report" } },
      },
    },
    "/v1/mentions": {
      post: {
        summary: "Ingest and classify a social mention",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Mention and escalation" },
          422: { description: "Validation error" },
        },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
  },
};

module.exports = { openApiDocument: document };
