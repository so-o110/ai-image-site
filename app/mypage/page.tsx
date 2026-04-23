"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
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

export default function MyPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchMyPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("自分の投稿取得エラー:", error.message);
      alert(`自分の投稿取得エラー: ${error.message}`);
      return;
    }

    setPosts((data as Post[]) || []);
  };

  useEffect(() => {
    const loadPage = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

      if (currentSession?.user) {
        await fetchMyPosts(currentSession.user.id);
      }

      setLoading(false);
    };

    loadPage();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);

      if (currentSession?.user) {
        await fetchMyPosts(currentSession.user.id);
      } else {
        setPosts([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDelete = async (postId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      alert(`削除に失敗しました: ${error.message}`);
      return;
    }

    alert("削除しました。");

    if (session?.user?.id) {
      await fetchMyPosts(session.user.id);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "24px 16px 80px",
        }}
      >
        <p>読み込み中...</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "24px 16px 80px",
          color: "#111",
          backgroundColor: "#f7f7f7",
          minHeight: "100vh",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <Link href="/" style={{ color: "#111", textDecoration: "none" }}>
            ← トップに戻る
          </Link>
        </div>

        <section
          style={{
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "12px" }}>
            マイページ
          </h1>
          <p>マイページを見るにはログインしてください。</p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#111",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#111", textDecoration: "none" }}>
          ← トップに戻る
        </Link>
      </div>

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "12px" }}>
          マイページ
        </h1>
        <p style={{ margin: 0 }}>ログイン中: {session.user.email}</p>
      </section>

      <section>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
          自分の投稿
        </h2>

        {posts.length === 0 ? (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <p style={{ margin: 0 }}>まだ投稿がありません。</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {posts.map((post) => (
              <article
                key={post.id}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <Link
                  href={`/posts/${post.id}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <img
                    src={post.image_url}
                    alt={post.title}
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                      display: "block",
                      backgroundColor: "#eee",
                    }}
                  />

                  <div style={{ padding: "16px" }}>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        marginBottom: "8px",
                      }}
                    >
                      {post.title}
                    </h3>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        marginBottom: "8px",
                      }}
                    >
                      {new Date(post.created_at).toLocaleString("ja-JP")}
                    </p>

                    <p
                      style={{
                        fontSize: "14px",
                        color: "#333",
                        marginBottom: "0",
                        wordBreak: "break-word",
                      }}
                    >
                      タグ: {post.tags}
                    </p>
                  </div>
                </Link>

                <div style={{ padding: "0 16px 16px" }}>
                  <button
                    onClick={() => handleDelete(post.id)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#d11a2a",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}