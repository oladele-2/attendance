import { IconAlert, IconCheck } from "./icons";
import { errorMessage, noticeMessage } from "@/lib/notices";

export function FlashBanner({
  notice,
  error,
  className = "mb-4",
}: {
  notice?: string;
  error?: string;
  className?: string;
}) {
  if (!notice && !error) return null;
  if (error) {
    return (
      <div
        role="alert"
        className={`flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-[#a40606] ${className}`}
      >
        <IconAlert size={18} className="mt-0.5 shrink-0" />
        <span>{errorMessage(error)}</span>
      </div>
    );
  }
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-800 ${className}`}
    >
      <IconCheck size={18} className="mt-0.5 shrink-0" />
      <span>{noticeMessage(notice)}</span>
    </div>
  );
}
