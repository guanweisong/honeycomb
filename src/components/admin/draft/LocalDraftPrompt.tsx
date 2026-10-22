"use client";

export function LocalDraftPrompt({
  pending,
  restore,
  discard,
}: {
  pending: { savedAt: number } | null;
  restore: () => void;
  discard: () => void;
}) {
  if (!pending) return null;
  return (
    <div
      role="status"
      className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
    >
      <p>
        发现未保存的本地草稿（{new Date(pending.savedAt).toLocaleString()}
        ）。仅保存在当前浏览器，不会自动发布或同步到服务器。
      </p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          className="font-medium underline"
          onClick={restore}
        >
          恢复草稿
        </button>
        <button type="button" className="underline" onClick={discard}>
          丢弃草稿
        </button>
      </div>
    </div>
  );
}
