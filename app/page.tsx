"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import PostForm from "@/app/components/PostForm";

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

type SortType = "new" | "likes";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [likesCountMap, setLikesCountMap] = useState<LikesCountMap>({});
  const [sortType, setSortType] = useState<SortType>("new");
  const [selectedTag, setSelectedTag] = useState("すべて");
  const [searchText, setSearchText] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("投稿取得エラー:", error.message);
      alert(`投稿取得エラー: ${error.message}`);
      return;
    }

    setPosts((data as Post[]) || []);
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

  const refreshData = async () => {
    await fetchPosts();
    await fetchLikesCounts();
  };

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

  useEffect(() => {
    refreshData();
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();

    for (const post of posts) {
      const splitTags = post.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      for (const tag of splitTags) {
        tagSet.add(tag);
      }
    }

    return ["すべて", ...Array.from(tagSet)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (selectedTag !== "すべて") {
        const splitTags = post.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

        if (!splitTags.includes(selectedTag)) {
          return false;
        }
      }

      if (searchText.trim()) {
        const keyword = searchText.toLowerCase().trim();
        const titleText = post.title.toLowerCase();
        const promptText = post.prompt.toLowerCase();
        const tagsText = post.tags.toLowerCase();

        const matchesTitle = titleText.includes(keyword);
        const matchesPrompt = promptText.includes(keyword);
        const matchesTags = tagsText.includes(keyword);

        if (!matchesTitle && !matchesPrompt && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [posts, selectedTag, searchText]);

  const sortedPosts = useMemo(() => {
    const copied = [...filteredPosts];

    if (sortType === "likes") {
      copied.sort((a, b) => {
        const likeA = likesCountMap[a.id] || 0;
        const likeB = likesCountMap[b.id] || 0;

        if (likeB !== likeA) {
          return likeB - likeA;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return copied;
    }

    copied.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return copied;
  }, [filteredPosts, likesCountMap, sortType]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      alert("メールアドレスを入力してください。");
      return;
    }

    if (!password.trim()) {
      alert("パスワードを入力してください。");
      return;
    }

    setAuthSubmitting(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          alert(`新規登録エラー: ${error.message}`);
          return;
        }

        alert("新規登録しました。確認メールが届いていたら確認してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          alert(`ログインエラー: ${error.message}`);
          return;
        }

        alert("ログインしました。");
      }

      setEmail("");
      setPassword("");
    } catch (error) {
      console.error(error);
      alert("認証エラーが発生しました。");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(`ログアウトエラー: ${error.message}`);
      return;
    }

    alert("ログアウトしました。");
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }

    alert("削除しました");
    await refreshData();
  };

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "32px 16px 80px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "24px" }}>AI画像投稿アプリ</h1>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "32px",
          backgroundColor: "#fff",
        }}
      >
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>アカウント</h2>

        {authLoading ? (
          <p>認証状態を確認中...</p>
        ) : session?.user ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0 }}>ログイン中: {session.user.email}</p>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Link
                href="/mypage"
                style={{
                  textDecoration: "none",
                  color: "#111",
                  fontWeight: "bold",
                }}
              >
                マイページ
              </Link>

              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #111",
                  background: "#fff",
                  color: "#111",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                ログアウト
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: authMode === "login" ? "1px solid #111" : "1px solid #ccc",
                  background: authMode === "login" ? "#111" : "#fff",
                  color: authMode === "login" ? "#fff" : "#111",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                ログイン
              </button>

              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: authMode === "signup" ? "1px solid #111" : "1px solid #ccc",
                  background: authMode === "signup" ? "#111" : "#fff",
                  color: authMode === "signup" ? "#fff" : "#111",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                新規登録
              </button>
            </div>

            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="email"
                  style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={authSubmitting}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    color: "#111",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="password"
                  style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                >
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上推奨"
                  disabled={authSubmitting}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    color: "#111",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                style={{
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: authSubmitting ? "#999" : "#111",
                  color: "#fff",
                  cursor: authSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {authSubmitting
                  ? authMode === "signup"
                    ? "登録中..."
                    : "ログイン中..."
                  : authMode === "signup"
                  ? "新規登録する"
                  : "ログインする"}
              </button>
            </form>
          </>
        )}
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>新規投稿</h2>

        {!session?.user ? (
          <p style={{ color: "#666" }}>投稿するにはログインが必要です。</p>
        ) : (
          <PostForm userId={session.user.id} onPostCreated={refreshData} />
        )}
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "32px",
          backgroundColor: "#fff",
        }}
      >
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>検索・絞り込み</h2>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="タイトル・タグ・プロンプトで検索"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#fff",
              color: "#111",
              boxSizing: "border-box",
            }}
          />

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#fff",
              color: "#111",
              boxSizing: "border-box",
            }}
          >
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#fff",
              color: "#111",
              boxSizing: "border-box",
            }}
          >
            <option value="new">新着順</option>
            <option value="likes">いいね順</option>
          </select>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>投稿一覧</h2>

        {sortedPosts.length === 0 ? (
          <p>投稿がありません。</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {sortedPosts.map((post) => {
              const isOwner = session?.user?.id === post.user_id;
              const likeCount = likesCountMap[post.id] || 0;

              return (
                <article
                  key={post.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                  }}
                >
                  <Link
                    href={`/posts/${post.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <img
                      src={post.image_url}
                      alt={post.title}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        display: "block",
                        backgroundColor: "#eee",
                      }}
                    />
                  </Link>

                  <div style={{ padding: "16px" }}>
                    <Link
                      href={`/posts/${post.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>{post.title}</h3>
                    </Link>

                    <p style={{ margin: "0 0 8px", color: "#666", fontSize: "14px" }}>
                      いいね: {likeCount}
                    </p>

                    <p style={{ margin: "0 0 12px", color: "#444", fontSize: "14px" }}>
                      {post.tags}
                    </p>

                    <p
                      style={{
                        margin: "0 0 12px",
                        color: "#666",
                        fontSize: "13px",
                        lineHeight: 1.6,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {post.prompt}
                    </p>

                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <Link
                        href={`/posts/${post.id}`}
                        style={{
                          textDecoration: "none",
                          color: "#111",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        詳細を見る
                      </Link>

                      {isOwner && (
                        <>
                          <Link
                            href={`/posts/${post.id}/edit`}
                            style={{
                              textDecoration: "none",
                              color: "#111",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            編集
                          </Link>

                          <button
                            onClick={() => handleDelete(post.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              color: "#c00",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}