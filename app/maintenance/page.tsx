import { prisma } from "../../graphql/prismaClient";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  let message = "網站維修中，請稍後再試。";

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "maintenanceMode" },
    });
    if (config) {
      const value = config.value as { message?: string };
      if (value.message) {
        message = value.message;
      }
    }
  } catch {
    // 使用預設訊息
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">
          <svg
            className="mx-auto w-24 h-24 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.42 15.17l-4.655 2.45a1 1 0 01-1.45-1.054l.89-5.19-3.77-3.674a1 1 0 01.555-1.706l5.21-.757 2.33-4.723a1 1 0 011.79 0l2.33 4.723 5.21.757a1 1 0 01.555 1.706l-3.77 3.674.89 5.19a1 1 0 01-1.45 1.054l-4.655-2.45z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">系統維護中</h1>
        <p className="text-gray-600 text-lg mb-8 whitespace-pre-line">{message}</p>
        <div className="inline-flex items-center gap-2 text-sm text-gray-400">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          維護作業進行中...
        </div>
      </div>
    </div>
  );
}
