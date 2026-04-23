"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type PostFormProps = {
  userId: string;
  onPostCreated: () => Promise<void>;
};

export default function PostForm({ userId, onPostCreated }: PostFormProps) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("タイトルを入力してください。");
      return;
    }

    if (!tags.trim()) {
      alert("タグを入力してください。");
      return;
    }

    if (!prompt.trim()) {
      alert("プロンプトを入力してください。");
      return;
    }

    if (!imageFile) {
      alert("画像を選択してください。");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      alert("PNG / JPG / JPEG / WEBP の画像だけアップロードできます。");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      alert("画像サイズは5MB以下にしてください。");
      return;
    }

    setUploading(true);

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("image")
        .upload(fileName, imageFile);

      if (uploadError) {
        alert(`画像のアップロードに失敗しました: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("image")
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase.from("posts").insert([
        {
          title: title.trim(),
          tags: tags.trim(),
          prompt: prompt.trim(),
          image_url: imageUrl,
          user_id: userId,
        },
      ]);

      if (insertError) {
        alert(`投稿の保存に失敗しました: ${insertError.message}`);
        return;
      }

      setTitle("");
      setTags("");
      setPrompt("");
      setImageFile(null);

      const fileInput = document.getElementById("image") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }

      await onPostCreated();
      alert("投稿できました。");
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました。");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "32px",
        backgroundColor: "#fff",
      }}
    >
      <h2 style={{ fontSize: "22px", marginBottom: "20px" }}>新規投稿</h2>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="post-title"
          style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
        >
          タイトル
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="作品タイトルを入力"
          disabled={uploading}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            backgroundColor: "#fff",
            color: "#111",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="post-tags"
          style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
        >
          タグ
        </label>
        <input
          id="post-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="例: anime, girl, fantasy"
          disabled={uploading}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            backgroundColor: "#fff",
            color: "#111",
          }}
        />
        <p style={{ marginTop: "8px", fontSize: "13px", color: "#666" }}>
          タグはカンマ区切りで入力してください
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="post-prompt"
          style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
        >
          プロンプト
        </label>
        <textarea
          id="post-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="画像生成に使ったプロンプトを入力"
          disabled={uploading}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
            backgroundColor: "#fff",
            color: "#111",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="image"
          style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
        >
          画像（PNG / JPG / JPEG / WEBP、5MB以下）
        </label>
        <input
          id="image"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setImageFile(e.target.files[0]);
            } else {
              setImageFile(null);
            }
          }}
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        style={{
          padding: "12px 20px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: uploading ? "#999" : "#111",
          color: "#fff",
          cursor: uploading ? "not-allowed" : "pointer",
          fontWeight: "bold",
        }}
      >
        {uploading ? "投稿中..." : "投稿する"}
      </button>
    </form>
  );
}