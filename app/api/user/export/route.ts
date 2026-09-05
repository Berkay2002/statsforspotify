import { NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";
import { convertToCSV, type ExportData } from "@/lib/export-data";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { user, supabase } = authResult;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    if (format !== "json" && format !== "csv") {
      return badRequestResponse("Invalid format. Must be json or csv");
    }

    // Use the database function to export user data
    const { data, error } = await supabase.rpc("export_user_data", {
      target_user_id: user.id,
    });

    if (error) {
      console.error("Export user data error:", error);
      return serverErrorResponse("Failed to export data");
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      console.error("Export user data returned unexpected shape:", data);
      return serverErrorResponse("Failed to export data");
    }

    const exportData = data as unknown as ExportData;

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "private, no-store",
          "Content-Disposition": "attachment; filename=spotify-stats-export.csv",
        },
      });
    }

    // Return JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "attachment; filename=spotify-stats-export.json",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return serverErrorResponse("Failed to export data");
  }
}
