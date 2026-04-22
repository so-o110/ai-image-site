"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PostForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ];

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const resetForm = () => {
    setTitle("");
    setTags("");
    setPrompt("");
    setFile(null);
    setPreviewUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!file) {
      setMessage("画像を選択してください");
      setLoading(false);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("PNG / JPG / JPEG / WEBP 形式の画像のみ投稿できます");
      setLoading(false);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("画像サイズは5MB以下にしてください");
      setLoading(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (uploadError) {
      setMessage("アップロード失敗: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase.from("posts").insert([
      {
        title,
        tags,
        prompt,
        image_url: imageUrl,
      },
    ]);

    if (insertError) {
      setMessage("投稿失敗: " + insertError.message);
      setLoading(false);
      return;
    }

    setMessage("投稿しました");
    resetForm();
    router.refresh();
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="mb-4 text-xl font-bold text-black">新しい投稿</h2>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-black">
          タイトル
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-black"
          placeholder="例: 幻想の街"
          required
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-black">
          タグ
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-black"
          placeholder="例: fantasy, city, night"
          required
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-black">
          プロンプト
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-black"
          rows={5}
          placeholder="例: masterpiece, best quality, fantasy city, cinematic lighting..."
          required
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-black">
          画像（PNG / JPG / JPEG / WEBP、5MB以下）
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const selectedFile = e.target.files[0];
              setFile(selectedFile);
              setMessage("");
            }
          }}
          className="w-full text-black"
          required
        />
      </div>

      {previewUrl && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-black">プレビュー</p>
          <img
            src={previewUrl}
            alt="preview"
            className="h-64 w-full rounded-lg object-cover border"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "投稿中..." : "投稿する"}
      </button>

      {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
    </form>
  );
}