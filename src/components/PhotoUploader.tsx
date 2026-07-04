"use client";

import { useRef, useState } from "react";

type Photo = { id: string; url: string };

export function PhotoUploader({
  profileId,
  initialPhotos,
  onDone,
}: {
  profileId: string;
  initialPhotos: Photo[];
  onDone?: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("profileId", profileId);
      form.append("file", file);
      const res = await fetch("/api/photos", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "업로드에 실패했어요");
        break;
      }
      setPhotos((prev) => [...prev, data.photo]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(id: string) {
    const res = await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative aspect-[4/5] overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-blue px-2 py-0.5 text-[10px] font-extrabold text-white">
                대표
              </span>
            )}
            <button
              onClick={() => remove(p.id)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}
        {photos.length < 10 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#D9CFBF] text-sub"
          >
            <span className="text-2xl">{uploading ? "⏳" : "＋"}</span>
            <span className="text-xs font-bold">{uploading ? "올리는 중" : "사진 추가"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <p className="mt-2 text-xs text-sub">대표 1장 필수, 최대 10장 · 자동으로 리사이징돼요</p>
      {error && <p className="mt-2 text-sm font-semibold text-thread">{error}</p>}
      {onDone && (
        <button
          onClick={onDone}
          disabled={photos.length === 0}
          className="mt-4 w-full rounded-2xl bg-blue py-4 text-base font-extrabold text-white disabled:opacity-40"
        >
          완료 🎉
        </button>
      )}
    </div>
  );
}
