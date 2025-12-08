#!/bin/bash

echo "=== 重啟 Manpower 專案 ==="

cd /var/www/Manpower

echo "1. 停止 PM2 服務..."
pm2 stop manpower

echo "2. 刪除 .next 目錄..."
rm -rf .next

echo "3. 重新建置專案..."
pnpm build

if [ $? -eq 0 ]; then
    echo "4. 啟動服務..."
    pm2 start manpower
    echo "=== 重啟完成 ==="
    pm2 list
else
    echo "建置失敗，請檢查錯誤訊息"
    exit 1
fi
