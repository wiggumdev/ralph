import type {
  PermissionRequest,
  PermissionResponse,
  PermissionSummary,
} from "#parsers/permission-types";
import type { LoopContext } from "../types";

/** Queue a permission request and show it if none currently displayed */
export function queuePermission(
  ctx: LoopContext,
  request: PermissionRequest,
  resolve: (response: PermissionResponse) => void
): Partial<LoopContext> {
  const id = request.toolCall.toolCallId;
  const pending = new Map(ctx.pendingPermissions);
  pending.set(id, { request, resolve });

  // Show immediately if nothing currently shown
  if (!ctx.currentPermissionId) {
    return {
      pendingPermissions: pending,
      currentPermissionId: id,
    };
  }

  return { pendingPermissions: pending };
}

/** Resolve current permission and show next if any */
export function resolvePermission(
  ctx: LoopContext,
  response: PermissionResponse
): Partial<LoopContext> {
  if (!ctx.currentPermissionId) {
    return {};
  }

  const pending = new Map(ctx.pendingPermissions);
  const current = pending.get(ctx.currentPermissionId);
  if (current) {
    current.resolve(response);
    pending.delete(ctx.currentPermissionId);
  }

  // Show next pending permission if any
  const nextEntry = pending.entries().next();
  if (nextEntry.done) {
    return {
      pendingPermissions: pending,
      currentPermissionId: null,
    };
  }

  const [nextId] = nextEntry.value;
  return {
    pendingPermissions: pending,
    currentPermissionId: nextId,
  };
}

/** Track a permission (from auto-approval or manual response) */
export function trackPermission(
  ctx: LoopContext,
  formattedName: string,
  status: "allowed" | "denied"
): Partial<LoopContext> {
  const tracked = new Map(ctx.trackedPermissions);
  const key = `${status}:${formattedName}`;
  const existing = tracked.get(key);
  if (existing) {
    tracked.set(key, { ...existing, count: existing.count + 1 });
  } else {
    tracked.set(key, { formattedName, status, count: 1 });
  }

  return {
    trackedPermissions: tracked,
    permissionSummary: getPermissionSummary(tracked),
  };
}

/** Get current permission request to display */
export function getCurrentPermissionRequest(
  ctx: LoopContext
): PermissionRequest | null {
  if (!ctx.currentPermissionId) {
    return null;
  }
  return ctx.pendingPermissions.get(ctx.currentPermissionId)?.request ?? null;
}

/** Build permission summary from tracked permissions */
function getPermissionSummary(
  tracked: Map<
    string,
    { formattedName: string; status: "allowed" | "denied"; count: number }
  >
): PermissionSummary[] {
  return Array.from(tracked.values()).map((p) => ({ ...p }));
}
