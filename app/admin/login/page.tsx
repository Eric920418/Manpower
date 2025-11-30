"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("帳號或密碼錯誤");
      } else {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error('登入錯誤:', err);
      setError('登入失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">佑羲人力管理系統</h1>
          <p className="text-gray-500 text-sm">Youshi HR Management</p>
        </div>

        {/* 錯誤訊息顯示 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <span className="text-xl mr-2">❌</span>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Email 帳號
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@youshi-hr.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
              isLoading
                ? "bg-blue-400 text-white cursor-wait"
                : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-md hover:shadow-lg"
            }`}
          >
            {isLoading ? "登入中..." : "登入"}
          </button>
        </form>

        {/* 測試帳號提示（開發環境） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-2">開發測試帳號：</p>
            <div className="space-y-1 text-xs text-blue-700">
              <p>📧 <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">admin@youshi-hr.com</span></p>
              <p>🔑 <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">admin123</span></p>
              <p className="text-blue-600 mt-2">角色：超級管理員（全權限）</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>© 2025 佑羲人力. 版權所有.</p>
        </div>
      </div>
    </div>
  );
}
