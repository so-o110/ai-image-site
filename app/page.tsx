"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  created_at: string;
  title: string;
  tags: string;
  image_url: string;
  prompt: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("投稿取得エラー:", error.message);
      return;
    }

    setPosts(data || []);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("image")
        .upload(fileName, imageFile);

      if (uploadError) {
        console.error("アップロードエラー:", uploadError.message);
        alert("画像のアップロードに失敗しました。");
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
        },
      ]);

      if (insertError) {
        console.error("DB保存エラー:", insertError.message);
        alert("投稿の保存に失敗しました。");
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

      await fetchPosts();
      alert("投稿できました。");
    } catch (error) {
      console.error("予期しないエラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "24px" }}>
        AI画像投稿アプリ
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "40px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
          新規投稿
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>
            タイトル
          </label>
          <input
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
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>
            タグ
          </label>
          <input
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
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>
            プロンプト
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="生成に使ったプロンプトを入力"
            disabled={uploading}
            rows={5}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>
            画像
          </label>
          <input
            id="image"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            disabled={uploading}
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: uploading ? "#999" : "#111",
            color: "#fff",
            fontSize: "14px",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "投稿中..." : "投稿する"}
        </button>
      </form>

      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        投稿一覧
      </h2>

      {posts.length === 0 ? (
        <p>まだ投稿がありません。</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <img
                src={post.image_url}
                alt={post.title}
                style={{
                  width: "100%",
                  height: "260px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />

              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginTop: "12px" }}>
                {post.title}
              </h3>

              <p style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
                タグ: {post.tags}
              </p>

              <div style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  プロンプト
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#333",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.6",
                  }}
                >
                  {post.prompt}
                </p>
              </div>

              <p style={{ fontSize: "12px", color: "#888", marginTop: "12px" }}>
                {new Date(post.created_at).toLocaleString("ja-JP")}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}