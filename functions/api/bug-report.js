const PAPERCLIP_COMPANY_ID = "93c330a2-1eb0-4f8e-9fd1-808d7fa772c5";
const PAPERCLIP_BASE_URL = "https://paperclip.casazza.io";
const PAPERCLIP_FALLBACK_UI = "https://paperclip.casazza.io/STI/issues";
const ADMIN_FEEDBACK_PREFIX = "admin-feedback:";

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const sanitizeSeverity = (severity) => {
  const value = asString(severity);
  if (value === "low" || value === "medium" || value === "high" || value === "urgent") {
    return value;
  }
  return "medium";
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const isAdminSubmission = (payload, request, env) => {
  const token = request.headers.get("x-admin-bug-token") || "";
  if (env.ADMIN_BUG_REPORT_TOKEN && token === env.ADMIN_BUG_REPORT_TOKEN) return true;

  // Admin UI is deliberately explicit (`?admin=1`). Regular users never set
  // this and are routed to a human-admin-friendly queue instead of Paperclip.
  return payload.adminMode === true || payload.adminMode === "true";
};

const formatDiagnostics = (diagnostics) => {
  if (!diagnostics) return "{}";
  if (typeof diagnostics === "string") return diagnostics;
  return JSON.stringify(diagnostics, null, 2);
};

async function createPaperclipIssue(payload, env) {
  const apiKey = env.PAPERCLIP_ADMIN_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 202,
      body: {
        destination: "paperclip-pending-admin-key",
        fallback: PAPERCLIP_FALLBACK_UI,
      },
    };
  }

  const severity = sanitizeSeverity(payload.severity);
  const titleRoute = asString(payload.route) || "unknown route";
  const title = `[site bug] ${severity.toUpperCase()} ${titleRoute}`.slice(0, 160);
  const description = [
    "Admin-submitted Stitch & Ash site bug.",
    "",
    `Route: ${titleRoute}`,
    `Severity: ${severity}`,
    `Contact: ${asString(payload.email) || "not provided"}`,
    "",
    "Report:",
    asString(payload.description),
    "",
    "Diagnostics:",
    "```json",
    formatDiagnostics(payload.diagnostics),
    "```",
  ].join("\n");

  const response = await fetch(`${PAPERCLIP_BASE_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      title,
      description,
      priority: severity === "urgent" || severity === "high" ? "high" : "medium",
      status: "todo",
      originKind: "site_bug_report",
      labels: ["site-bug", "stitch-ash", "admin-submitted"],
    }),
  });

  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }

  if (!response.ok) return { ok: false, status: response.status, body: result };
  return { ok: true, status: 201, body: result };
}

async function storeHumanAdminReport(payload, env) {
  const id = `${ADMIN_FEEDBACK_PREFIX}${Date.now()}:${crypto.randomUUID()}`;
  const report = {
    id,
    kind: "human-admin-feedback",
    description: asString(payload.description),
    email: asString(payload.email),
    route: asString(payload.route),
    diagnostics: payload.diagnostics ?? null,
    createdAt: new Date().toISOString(),
  };

  await env.STITCH_BUG_REPORTS?.put(id, JSON.stringify(report), {
    metadata: {
      route: report.route,
      email: report.email,
      kind: report.kind,
    },
  });

  return report;
}

export async function onRequestPost({ request, env }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const description = asString(payload.description);
  if (description.length < 10) {
    return json({ error: "Please describe the bug in at least 10 characters." }, 400);
  }

  if (isAdminSubmission(payload, request, env)) {
    const result = await createPaperclipIssue(payload, env);
    if (!result.ok) {
      return json(
        {
          error: "Could not create Paperclip issue; report was not sent to engineering.",
          details: result.body,
        },
        result.status,
      );
    }

    const issue = result.body.issue ?? result.body;
    return json({
      destination: "paperclip-software-development",
      identifier: issue.identifier,
      id: issue.id,
    }, 201);
  }

  const report = await storeHumanAdminReport(payload, env);
  return json({
    destination: "human-admin-queue",
    id: report.id,
  }, 202);
}
