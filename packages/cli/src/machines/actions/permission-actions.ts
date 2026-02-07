import type {
  PermissionRequest,
  PermissionResponse,
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

/** Get current permission request to display */
export function getCurrentPermissionRequest(
  ctx: LoopContext
): PermissionRequest | null {
  if (!ctx.currentPermissionId) {
    return null;
  }
  return ctx.pendingPermissions.get(ctx.currentPermissionId)?.request ?? null;
}
