"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  created_at: string;
  title: string;
  tags: string;
  image_url: string;
  prompt: string;
};

export default function PostDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const fetchLikesCount = async () => {
    const { count, error } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id);

    if (error) {
      console.error("いいね数取得エラー:", error.message);
      return;
    }

    setLikesCount(count || 0);
  };

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("投稿詳細取得エラー:", error.message);
        setPost(null);
        setLoading(false);
        return;
      }

      setPost(data);
      setLoading(false);
    };

    if (id) {
      fetchPost();
      fetchLikesCount();
    }
  }, [id]);

  const handleLike = async () => {
    if (liking) return;

    setLiking(true);

    const { error } = await supabase.from("likes").insert([
      {
        post_id: id,
      },
    ]);

    if (error) {
      console.error("いいね保存エラー:", error.message);
      alert("いいねに失敗しました。");
      setLiking(false);
      return;
    }

    await fetchLikesCount();
    setLiking(false);
  };

  if (loading) {
    return (
      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px",
          minHeight: "100vh",
          backgroundColor: "#f7f7f7",
          color: "#111",
        }}
      >
        <p>読み込み中...</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px",
          minHeight: "100vh",
          backgroundColor: "#f7f7f7",
          color: "#111",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginBottom: "20px",
            textDecoration: "none",
            color: "#111",
            fontWeight: "bold",
          }}
        >
          ← 一覧に戻る
        </Link>

        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "12px", color: "#111" }}>
          投稿が見つかりません
        </h1>
        <p style={{ color: "#333" }}>
          この投稿は削除されたか、URLが間違っている可能性があります。
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
        color: "#111",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginBottom: "20px",
          textDecoration: "none",
          color: "#111",
          fontWeight: "bold",
        }}
      >
        ← 一覧に戻る
      </Link>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <img
          src={post.image_url}
          alt={post.title}
          style={{
            width: "100%",
            maxHeight: "600px",
            objectFit: "contain",
            borderRadius: "12px",
            background: "#eee",
          }}
        />

        <h1 style={{ fontSize: "30px", fontWeight: "bold", marginTop: "20px", color: "#111" }}>
          {post.title}
        </h1>

        <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
          投稿日: {new Date(post.created_at).toLocaleString("ja-JP")}
        </p>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleLike}
            disabled={liking}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: liking ? "#999" : "#111",
              color: "#fff",
              fontSize: "14px",
              cursor: liking ? "not-allowed" : "pointer",
            }}
          >
            {liking ? "送信中..." : "♡ いいね"}
          </button>

          <p style={{ fontSize: "15px", color: "#333", margin: 0 }}>
            いいね数: <strong>{likesCount}</strong>
          </p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#111" }}>
            タグ
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#333",
              whiteSpace: "pre-wrap",
              lineHeight: "1.7",
            }}
          >
            {post.tags}
          </p>
        </div>

        <div style={{ marginTop: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#111" }}>
            プロンプト
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#333",
              whiteSpace: "pre-wrap",
              lineHeight: "1.8",
            }}
          >
            {post.prompt}
          </p>
        </div>
      </div>
    </main>
  );
}