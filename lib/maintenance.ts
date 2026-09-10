// Temporary deployment switch for the reviewed database maintenance window.
// Restore false after the migration has passed its production checks.
export const rankingStorageMaintenance = true;

export function blocksMaintenanceRequest(pathname: string, method: string): boolean {
  return pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method);
}
