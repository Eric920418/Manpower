"use client";

import { ToastProvider } from "@/components/UI/Toast";
import { TaskReminderProvider } from "@/components/Admin/TaskReminderProvider";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <TaskReminderProvider>
        {children}
      </TaskReminderProvider>
    </ToastProvider>
  );
}
