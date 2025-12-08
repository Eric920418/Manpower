#!/bin/bash

# 重啟腳本 - 用於更新代碼後重新建置並啟動服務
# 使用方式: ./restart.sh

set -e

echo "=========================================="
echo "開始重啟流程..."
echo "=========================================="

cd /var/www/Manpower

# 1. 停止 PM2 管理的程序
echo ""
echo "[1/5] 停止 PM2 程序..."
pm2 stop manpower 2>/dev/null || echo "manpower 程序未運行"

# 2. 刪除舊的建置檔案
echo ""
echo "[2/5] 刪除 .next 目錄..."
rm -rf .next
echo "已刪除 .next 目錄"

# 3. 安裝依賴（如果有更新）
echo ""
echo "[3/5] 檢查並安裝依賴..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 4. 重新建置
echo ""
echo "[4/5] 開始建置專案..."
pnpm build

# 5. 使用 PM2 啟動
echo ""
echo "[5/5] 啟動服務..."
pm2 start manpower 2>/dev/null || pm2 start pnpm --name "manpower" -- start
pm2 save

echo ""
echo "=========================================="
echo "重啟完成！"
echo "=========================================="
pm2 status
echo ""
echo "查看日誌: pm2 logs manpower"
