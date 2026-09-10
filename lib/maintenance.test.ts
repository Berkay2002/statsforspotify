import { describe, expect, test } from "bun:test";
import { blocksMaintenanceRequest } from "./maintenance";

describe("database maintenance request gate", () => {
  test("blocks snapshot, account and other API mutations", () => {
    for (const path of ["/api/snapshot", "/api/user/delete-data", "/api/user/delete-account", "/api/friends/follow"]) {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        expect(blocksMaintenanceRequest(path, method)).toBe(true);
      }
    }
  });
  test("keeps read requests and authentication callbacks available", () => {
    expect(blocksMaintenanceRequest("/api/rankings/history", "GET")).toBe(false);
    expect(blocksMaintenanceRequest("/auth/callback", "GET")).toBe(false);
    expect(blocksMaintenanceRequest("/dashboard", "GET")).toBe(false);
    expect(blocksMaintenanceRequest("/api/snapshot", "OPTIONS")).toBe(false);
  });
});
