import type { AccessArea, StaffMember, StaffRole } from "@printflow/shared";
import { canAnyRoleAccess } from "@printflow/shared";
import type { NextFunction, Request, Response } from "express";
import { state, publicStaff } from "../store.js";
import { verifyStaffToken } from "./app-auth.js";
import { config } from "../config.js";

declare module "express-serve-static-core" {
  interface Request {
    staff?: StaffMember;
  }
}

export function requireAccess(area: AccessArea) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = await staffFromRequest(req);
      if (!staff) {
        return res.status(401).json({ error: "Staff authentication required", requiredAccess: area });
      }
      if (!staff.active) {
        return res.status(403).json({ error: "Staff member is inactive", requiredAccess: area });
      }
      const hasExplicitAccess = staff.accessAreas.includes(area);
      const hasRoleAccess = canAnyRoleAccess(staff.roles, area);
      if (!hasExplicitAccess && !hasRoleAccess) {
        return res.status(403).json({ error: "Access denied", requiredAccess: area, roles: staff.roles });
      }
      req.staff = staff;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function rolesFromRequest(req: Request): StaffRole[] {
  const raw = String(req.header("x-staff-roles") ?? req.header("x-staff-role") ?? "");
  return raw.split(",").map((role) => role.trim()).filter(Boolean) as StaffRole[];
}

export async function staffFromRequest(req: Request): Promise<StaffMember | null> {
  const token = bearerToken(req);
  if (token) {
    const payload = verifyStaffToken(token);
    const profile = state.staff.find((member) => member.id === payload.sub && member.email.toLowerCase() === payload.email.toLowerCase());
    if (!profile) throw Object.assign(new Error("Staff profile not found for authenticated user."), { statusCode: 403 });
    return publicStaff(profile);
  }

  if (config.nodeEnv === "production") return null;

  const roles = rolesFromRequest(req);
  if (roles.length === 0) return null;
  return {
    id: "local-dev-staff",
    name: String(req.header("x-staff-name") ?? "Local staff"),
    email: "local@printflow.dev",
    role: roles[0]!,
    roles,
    active: true,
    accessAreas: [],
    createdAt: new Date().toISOString()
  };
}

function bearerToken(req: Request): string | null {
  const authorization = req.header("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}
