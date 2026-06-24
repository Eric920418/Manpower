import { prisma } from "../../../graphql/prismaClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "maintenanceMode" },
    });

    if (!config) {
      return NextResponse.json({ enabled: false });
    }

    const value = config.value as { enabled?: boolean };
    return NextResponse.json({ enabled: value.enabled ?? false });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
