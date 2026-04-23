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
  user_id: string | null;
};

export default function PostDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [session, setSession] = useState<any>(null);

  const fetchLikesCount = async () => {
    const { data, error } = await supabase
      .from("likes")
      .select("post_id, user_id")
      .eq("post_id", id);

    if (error) {
      console.error("いいね数取得エラー:", error);
      alert(`いいね数取得エラー: ${error.message}`);
      return;
    }

    setLikesCount(data?.length || 0);
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
    };

    loadSession();
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("投稿取得エラー:", error.message);
        alert(`投稿取得エラー: ${error.message}`);
        setLoading(false);
        return;
      }

      setPost(data as Post);
      setLoading(false);
    };

    if (id) {
      fetchPost();
      fetchLikesCount();
    }
  }, [id]);

  const handleLike = async () => {
    if (liking) return;

    if (!session?.user) {
      alert("いいねするにはログインしてください。");
      return;
    }

    setLiking(true);

    try {
      const { data: existingLike, error: checkError } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (checkError) {
        console.error("いいね確認エラー:", checkError);
        alert(`いいね状態の確認に失敗しました: ${checkError.message}`);
        return;
      }

      if (existingLike) {
        alert("この投稿にはすでにいいねしています。");
        return;
      }

      const { error: insertError } = await supabase.from("likes").insert([
        {
          post_id: id,
          user_id: session.user.id,
        },
      ]);

      if (insertError) {
        console.error("いいね保存エラー:", insertError);
        alert(`いいねに失敗しました: ${insertError.message}`);
        return;
      }

      await fetchLikesCount();
      alert("いいねしました。");
    } catch (error) {
      console.error("予期しないエラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setLiking(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 16px 80px",
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
          padding: "24px 16px 80px",
        }}
      >
        <p>投稿が見つかりませんでした。</p>
        <Link href="/" style={{ color: "#111" }}>
          ← 一覧に戻る
        </Link>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#111",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#111", textDecoration: "none" }}>
          ← 一覧に戻る
        </Link>
      </div>

      <article
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <img
          src={post.image_url}
          alt={post.title}
          style={{
            width: "100%",
            maxHeight: "560px",
            objectFit: "contain",
            display: "block",
            backgroundColor: "#eee",
          }}
        />

        <div style={{ padding: "24px" }}>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              marginBottom: "12px",
            }}
          >
            {post.title}
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#666",
              marginBottom: "12px",
            }}
          >
            投稿日時: {new Date(post.created_at).toLocaleString("ja-JP")}
          </p>

          <p
            style={{
              fontSize: "15px",
              color: "#333",
              marginBottom: "16px",
              wordBreak: "break-word",
            }}
          >
            タグ: {post.tags}
          </p>

          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              プロンプト
            </h2>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                backgroundColor: "#fafafa",
                border: "1px solid #e5e5e5",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              {post.prompt}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleLike}
              disabled={liking}
              style={{
                padding: "12px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: liking ? "#999" : "#111",
                color: "#fff",
                cursor: liking ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {liking ? "送信中..." : "♡ いいね"}
            </button>

            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
              いいね数: {likesCount}
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}