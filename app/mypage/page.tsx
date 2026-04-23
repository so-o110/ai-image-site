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

type LikesCountMap = {
  [postId: string]: number;
};

export default function MyPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likesCountMap, setLikesCountMap] = useState<LikesCountMap>({});
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      setAuthLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMyPosts = async (userId: string) => {
    setLoadingPosts(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("自分の投稿取得に失敗しました: " + error.message);
      setLoadingPosts(false);
      return;
    }

    setPosts((data as Post[]) || []);
    setLoadingPosts(false);
  };

  const fetchLikesCounts = async () => {
    const { data, error } = await supabase.from("likes").select("post_id");

    if (error) {
      console.error("いいね取得エラー:", error.message);
      return;
    }

    const nextMap: LikesCountMap = {};

    for (const like of data || []) {
      const postId = like.post_id as string;
      nextMap[postId] = (nextMap[postId] || 0) + 1;
    }

    setLikesCountMap(nextMap);
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setPosts([]);
      setLoadingPosts(false);
      return;
    }

    fetchMyPosts(session.user.id);
    fetchLikesCounts();
  }, [session]);

  const handleDelete = async (postId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }

    alert("削除しました");

    if (session?.user?.id) {
      await fetchMyPosts(session.user.id);
    }
    await fetchLikesCounts();
  };

  if (authLoading) {
    return (
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
        <p>認証状態を確認中...</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "24px 16px 48px",
          minHeight: "100vh",
          backgroundColor: "#f7f7f7",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            marginBottom: "24px",
            color: "#111",
          }}
        >
          マイページ
        </h1>

        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "16px", color: "#111", marginBottom: "16px" }}>
            マイページを見るにはログインしてください。
          </p>

          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            トップへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
        minHeight: "100vh",
        backgroundColor: "#f7f7f7",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              margin: 0,
              color: "#111",
            }}
          >
            マイページ
          </h1>
          <p style={{ marginTop: "8px", color: "#555" }}>
            ログイン中: {session.user.email}
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: "8px",
            background: "#111",
            color: "#fff",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          トップへ戻る
        </Link>
      </div>

      <section
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "8px",
            color: "#111",
          }}
        >
          自分の投稿
        </h2>
        <p style={{ color: "#555", margin: 0 }}>投稿数: {posts.length}件</p>
      </section>

      {loadingPosts ? (
        <p style={{ color: "#333" }}>投稿を読み込み中...</p>
      ) : posts.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <p style={{ color: "#333", marginBottom: "16px" }}>
            まだ投稿がありません。
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            投稿しに行く
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "12px",
                  background: "#fff",
                  height: "100%",
                  cursor: "pointer",
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

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#111",
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {post.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#111",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ❤️ {likesCountMap[post.id] || 0}
                  </p>
                </div>

                <p style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
                  タグ: {post.tags}
                </p>

                <div style={{ marginTop: "10px" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: "bold",
                      marginBottom: "6px",
                      color: "#111",
                    }}
                  >
                    プロンプト
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#333",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {post.prompt}
                  </p>
                </div>

                <p style={{ fontSize: "12px", color: "#888", marginTop: "12px" }}>
                  {new Date(post.created_at).toLocaleString("ja-JP")}
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(post.id);
                  }}
                  style={{
                    marginTop: "8px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#e53935",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  削除
                </button>

                <p
                  style={{
                    marginTop: "12px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: "#111",
                  }}
                >
                  詳細を見る →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}