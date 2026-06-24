"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

interface MaintenanceModeData {
  enabled: boolean;
  message: string;
}

const QUERY = `
  query {
    maintenanceMode {
      id
      enabled
      message
    }
  }
`;

const MUTATION = `
  mutation UpdateMaintenanceMode($input: UpdateMaintenanceModeInput!) {
    updateMaintenanceMode(input: $input) {
      id
      enabled
      message
    }
  }
`;

export const MaintenanceMode = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [data, setData] = useState<MaintenanceModeData>({
    enabled: false,
    message: "網站維修中，請稍後再試。",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: QUERY }),
        });
        const result = await res.json();

        if (result.data?.maintenanceMode) {
          setData({
            enabled: result.data.maintenanceMode.enabled,
            message: result.data.maintenanceMode.message || "網站維修中，請稍後再試。",
          });
        }
      } catch (err) {
        console.error("載入維護模式設定失敗:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, []);

  // 點擊開關直接儲存
  const handleToggle = async () => {
    const newEnabled = !data.enabled;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const response = await graphqlRequest<{ updateMaintenanceMode: MaintenanceModeData }>(
        MUTATION,
        { input: { enabled: newEnabled, message: data.message } },
        session
      );
      const updated = response.updateMaintenanceMode;
      setData({ enabled: updated.enabled, message: updated.message });
      setStatusMessage({
        type: "success",
        text: updated.enabled ? "維護模式已啟用，前台將顯示維護頁面" : "維護模式已關閉，前台恢復正常",
      });
    } catch (err) {
      setStatusMessage({ type: "error", text: "操作失敗：" + err });
    } finally {
      setIsLoading(false);
    }
  };

  // 儲存訊息內容
  const handleSaveMessage = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const response = await graphqlRequest<{ updateMaintenanceMode: MaintenanceModeData }>(
        MUTATION,
        { input: { enabled: data.enabled, message: data.message } },
        session
      );
      const updated = response.updateMaintenanceMode;
      setData({ enabled: updated.enabled, message: updated.message });
      setStatusMessage({ type: "success", text: "維護訊息已更新" });
    } catch (err) {
      setStatusMessage({ type: "error", text: "更新失敗：" + err });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-700">處理中...</p>
          </div>
        </div>
      )}

      <div className="text-3xl font-bold mb-6">維護模式設定</div>

      {/* 狀態提示 */}
      {statusMessage && (
        <div className={`p-4 rounded-lg mb-6 ${
          statusMessage.type === "success"
            ? "bg-green-100 text-green-800 border border-green-300"
            : "bg-red-100 text-red-800 border border-red-300"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* 開關區塊 - 點擊直接生效 */}
      <div className={`p-6 rounded-lg mb-6 border-2 ${
        data.enabled
          ? "bg-red-50 border-red-300"
          : "bg-green-50 border-green-300"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">
              {data.enabled ? "維護模式已啟用" : "網站正常運作中"}
            </h2>
            <p className="text-sm text-gray-600">
              {data.enabled
                ? "前台所有頁面將顯示「系統維護中」訊息，後台仍可正常操作。"
                : "前台網站正常對外開放中。"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`relative inline-flex h-14 w-28 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 disabled:opacity-50 ${
              data.enabled
                ? "bg-red-500 focus:ring-red-300"
                : "bg-gray-300 focus:ring-gray-200"
            }`}
          >
            <span
              className={`inline-block h-12 w-12 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                data.enabled ? "translate-x-[3.75rem]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">點擊開關即時切換維護模式（立即生效）</p>
      </div>

      {/* 維護訊息設定 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">維護訊息</h2>
        <p className="text-sm text-gray-500 mb-3">此訊息將顯示在維護頁面上，告知訪客網站目前的狀態。</p>
        <textarea
          value={data.message}
          onChange={(e) => setData((prev) => ({ ...prev, message: e.target.value }))}
          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300 min-h-[120px] resize-y"
          placeholder="請輸入維護訊息..."
        />
        <button
          onClick={handleSaveMessage}
          disabled={isLoading}
          className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          儲存訊息
        </button>
      </div>
    </div>
  );
};
