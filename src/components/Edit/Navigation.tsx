"use client";
import { useState, useEffect } from "react";
import { graphqlRequest } from "@/utils/graphqlClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const NAVIGATIONS_QUERY = `
  query {
    navigations {
      id
      label
      url
      parentId
      order
      isActive
      icon
      target
      children {
        id
        label
        url
        order
        isActive
        icon
        target
      }
    }
  }
`;

const REORDER_NAVIGATIONS = `
  mutation ReorderNavigations($ids: [Int!]!) {
    reorderNavigations(ids: $ids)
  }
`;

interface Navigation {
  id: number;
  label: string;
  url: string | null;
  parentId: number | null;
  order: number;
  isActive: boolean;
  icon: string | null;
  target: string;
  children?: Navigation[];
}

// 可拖拽的導航項目組件
function SortableNavItem({
  nav,
  level = 0,
}: {
  nav: Navigation;
  level?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: nav.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const indent = level * 2;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
        style={{ marginLeft: `${indent}rem` }}
      >
        {/* 拖拽手柄 */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        >
          <span className="material-symbols-outlined">drag_indicator</span>
        </button>

        {/* 導航資訊 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {nav.icon && (
              <span className="material-symbols-outlined text-gray-600">
                {nav.icon}
              </span>
            )}
            <span className="font-semibold text-gray-900">{nav.label}</span>
            {!nav.isActive && (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                停用
              </span>
            )}
            {nav.parentId && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                子項目
              </span>
            )}
          </div>
          {nav.url && (
            <div className="mt-1 text-sm text-gray-500">連結: {nav.url}</div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            排序: {nav.order} | 目標: {nav.target}
          </div>
        </div>
      </div>

      {/* 遞迴渲染子項目 */}
      {nav.children && nav.children.length > 0 && (
        <div className="mt-2">
          {nav.children.map((child) => (
            <SortableNavItem key={child.id} nav={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditNavigation() {
  const [navigations, setNavigations] = useState<Navigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 配置拖拽傳感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖動 8px 後才觸發，避免與點擊衝突
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 載入導航資料
  const loadNavigations = async () => {
    try {
      setLoading(true);
      const result = await graphqlRequest<{ navigations: Navigation[] }>(
        NAVIGATIONS_QUERY,
        {}
      );
      setNavigations(result.navigations);
      setError(null);
    } catch (err) {
      console.error("載入導航失敗:", err);
      setError(err instanceof Error ? err.message : "載入導航失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNavigations();
  }, []);

  // 處理拖拽結束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = navigations.findIndex((nav) => nav.id === active.id);
    const newIndex = navigations.findIndex((nav) => nav.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 立即更新 UI
    const reorderedNavs = arrayMove(navigations, oldIndex, newIndex);
    setNavigations(reorderedNavs);

    try {
      // 提取所有頂層導航的 ID（按新順序）
      const ids = reorderedNavs.map((nav) => nav.id);

      // 呼叫後端 API 更新順序
      await graphqlRequest(REORDER_NAVIGATIONS, { ids });

      // 重新載入以確保資料同步
      await loadNavigations();
    } catch (err) {
      console.error("更新排序失敗:", err);
      alert(err instanceof Error ? err.message : "更新排序失敗");
      // 失敗時恢復原始順序
      await loadNavigations();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">載入中...</div>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">導航選單排序</h1>
          <p className="mt-2 text-gray-600">
            拖動左側手柄圖標調整導航選單順序
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* 導航列表 */}
        <div className="space-y-3">
          {navigations.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
              目前沒有導航項目
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={navigations.map((nav) => nav.id)}
                strategy={verticalListSortingStrategy}
              >
                {navigations.map((nav) => (
                  <SortableNavItem key={nav.id} nav={nav} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
