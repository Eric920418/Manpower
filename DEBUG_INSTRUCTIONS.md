# 權限問題診斷步驟

## 當前狀態
- ✅ 資料庫中用戶角色正確：SUPER_ADMIN
- ✅ permissions.ts 已明確列出所有 44 項權限
- ✅ 開發伺服器已重啟
- ✅ .next 快取已清理
- ✅ 已加入詳細除錯日誌

## 請執行以下步驟：

### 1. 完全清除瀏覽器快取並登出
1. 開啟 Chrome/Safari 開發者工具（F12 或 Cmd+Option+I）
2. 切換到 Console 標籤
3. 前往 http://localhost:3000/admin/dashboard
4. 點擊「登出」按鈕
5. 在開發者工具中，右鍵點擊重新整理按鈕，選擇「清空快取並強制重新整理」
   或使用快捷鍵：
   - Mac: Cmd + Shift + R
   - Windows/Linux: Ctrl + Shift + F5

### 2. 重新登入
1. 使用以下帳號登入：
   - Email: admin@youshi-hr.com
   - 密碼: admin123

### 2.5. 測試 Session API
登入後，在瀏覽器中訪問：http://localhost:3000/api/debug/session

這個 API 會返回：
- 當前 session 資料
- 用戶角色
- 所有權限列表
- 是否包含 FILE_READ 權限

預期結果應該是：
```json
{
  "session": {
    "user": {
      "id": "...",
      "email": "admin@youshi-hr.com",
      "role": "SUPER_ADMIN",
      ...
    }
  },
  "permissions": {
    "role": "SUPER_ADMIN",
    "count": 44,
    "list": [...],
    "hasFileRead": true
  }
}
```

### 3. 查看 Console 日誌
登入後，你應該會在 Console 看到類似以下的日誌：
```
🔑 usePermission Hook: {
  hasSession: true,
  sessionUser: { id: "...", email: "admin@youshi-hr.com", role: "SUPER_ADMIN" },
  userRole: "SUPER_ADMIN",
  userRoleType: "string"
}
```

### 4. 前往檔案管理頁面
1. 前往 http://localhost:3000/admin/files
2. 觀察 Console 中的除錯日誌
3. 特別注意以下幾個日誌：
   - `🔑 usePermission Hook:` - 顯示 session 和 role
   - `👤 usePermission.can 被調用:` - 顯示正在檢查的權限
   - `🔍 hasPermission 檢查:` - 顯示權限檢查的詳細過程

### 5. 如果仍然沒有權限
請複製 Console 中的所有日誌並提供給我，特別是：
- usePermission Hook 的輸出
- usePermission.can 的輸出
- hasPermission 檢查的輸出
- 頁面上顯示的「調試信息」區塊內容

## 預期的正確輸出

如果權限系統正常運作，你應該看到：
```
🔍 hasPermission 檢查: {
  userRole: "SUPER_ADMIN",
  permission: "file:read",
  rolePermissions: [...], // 包含 44 項權限的陣列
  permissionsCount: 44,
  includesFileRead: true,
  result: true
}
```

## 可能的問題

### A. userRole 為 undefined
- 原因：Session 未正確傳遞
- 解決：確認已完全登出並重新登入

### B. rolePermissions 陣列為空或不包含 FILE_READ
- 原因：permissions.ts 沒有正確載入
- 解決：需要檢查 TypeScript 編譯和模組匯入

### C. result 為 false 但 includesFileRead 為 true
- 原因：邏輯錯誤
- 解決：需要檢查 hasPermission 函數實作

## 完成後
將 Console 的輸出截圖或複製文字提供給我，我會根據日誌找出問題所在。
