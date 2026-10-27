import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/lib/admin-auth", () => ({
  getCurrentAdminUser: vi.fn(),
}));

import AdminRouteTemplate from "@/app/admin/(dashboard)/template";
import { getAdminRouteAccessDecision } from "@/app/admin/(dashboard)/admin-route-access";

describe("AdminRouteTemplate", () => {
  it("holds request-bound route checks behind a generic fallback", () => {
    const element = AdminRouteTemplate({ children: "protected-content" });

    expect(element.type).toBe(Suspense);
    expect(JSON.stringify(element.props.fallback)).not.toContain(
      "protected-content",
    );
  });

  it("sends anonymous users to login", () => {
    expect(getAdminRouteAccessDecision(false, false)).toBe("login");
  });

  it("forbids signed-in users without the destination capability", () => {
    expect(getAdminRouteAccessDecision(true, false)).toBe("forbidden");
  });

  it("allows a user with the destination capability", () => {
    expect(getAdminRouteAccessDecision(true, true)).toBe("allow");
  });
});
