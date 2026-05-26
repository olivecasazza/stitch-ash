import { n as defineEventHandler, Q as readBody, l as createError, x as getHeader } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'lru-cache';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'vue-router';
import 'node:url';
import 'zod';
import '@iconify/utils';
import 'consola';

const PAPERCLIP_COMPANY_ID = "93c330a2-1eb0-4f8e-9fd1-808d7fa772c5";
const PAPERCLIP_BASE_URL = "https://paperclip.casazza.io";
const PAPERCLIP_FALLBACK_UI = "https://paperclip.casazza.io/STI/issues";
const ADMIN_FEEDBACK_PREFIX = "admin-feedback:";
const asString = (value) => typeof value === "string" ? value.trim() : "";
const sanitizeSeverity = (severity) => {
  const value = asString(severity);
  if (value === "low" || value === "medium" || value === "high" || value === "urgent") {
    return value;
  }
  return "medium";
};
const isAdminSubmission = (payload, event, env) => {
  const token = getHeader(event, "x-admin-bug-token") || "";
  if (env.ADMIN_BUG_REPORT_TOKEN && token === env.ADMIN_BUG_REPORT_TOKEN) return true;
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
        fallback: PAPERCLIP_FALLBACK_UI
      }
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
    "```"
  ].join("\n");
  const response = await fetch(`${PAPERCLIP_BASE_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      title,
      description,
      priority: severity === "urgent" || severity === "high" ? "high" : "medium",
      status: "todo",
      originKind: "site_bug_report",
      labels: ["site-bug", "stitch-ash", "admin-submitted"]
    })
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
  var _a;
  const id = `${ADMIN_FEEDBACK_PREFIX}${Date.now()}:${crypto.randomUUID()}`;
  const report = {
    id,
    kind: "human-admin-feedback",
    description: asString(payload.description),
    email: asString(payload.email),
    route: asString(payload.route),
    diagnostics: (_a = payload.diagnostics) != null ? _a : null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (env.STITCH_BUG_REPORTS) {
    await env.STITCH_BUG_REPORTS.put(id, JSON.stringify(report), {
      metadata: {
        route: report.route,
        email: report.email,
        kind: report.kind
      }
    });
  }
  return report;
}
const bugReport = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const env = (_b = (_a = event.context.cloudflare) == null ? void 0 : _a.env) != null ? _b : process.env;
  let payload;
  try {
    payload = await readBody(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid JSON payload"
    });
  }
  const description = asString(payload == null ? void 0 : payload.description);
  if (description.length < 10) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please describe the bug in at least 10 characters."
    });
  }
  if (isAdminSubmission(payload, event, env)) {
    const result = await createPaperclipIssue(payload, env);
    if (!result.ok) {
      throw createError({
        statusCode: result.status,
        statusMessage: "Could not create Paperclip issue; report was not sent to engineering.",
        data: result.body
      });
    }
    const issue = (_c = result.body.issue) != null ? _c : result.body;
    return {
      destination: "paperclip-software-development",
      identifier: issue.identifier,
      id: issue.id
    };
  }
  const report = await storeHumanAdminReport(payload, env);
  return {
    destination: "human-admin-queue",
    id: report.id
  };
});

export { bugReport as default };
//# sourceMappingURL=bug-report.mjs.map
