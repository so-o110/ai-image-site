"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type SortType = "new" | "likes";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [likesCountMap, setLikesCountMap] = useState<LikesCountMap>({});

  const [sortType, setSortType] = useState<SortType>("new");
  const [selectedTag, setSelectedTag] = useState("すべて");
  const [searchText, setSearchText] = useState("");

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleAuth = async (e: React.FormEvent) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      alert("投稿するにはログインしてください。");
      return;
    }

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
      const fileName = `${session.user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("image")
        .upload(fileName, imageFile);

      if (uploadError) {
        console.error("アップロードエラー:", uploadError.message);
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
          user_id: session.user.id,
        },
      ]);

      if (insertError) {
        console.error("DB保存エラー:", insertError.message);
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

      await refreshData();
      alert("投稿できました。");
    } catch (error) {
      console.error("予期しないエラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setUploading(false);
    }
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
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#111",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "24px" }}>
        AI画像投稿アプリ
      </h1>

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
          アカウント
        </h2>

        {authLoading ? (
          <p>認証状態を確認中...</p>
        ) : session?.user ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <p style={{ margin: 0 }}>ログイン中: {session.user.email}</p>

            <Link
              href="/mypage"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #111",
                textDecoration: "none",
                color: "#111",
                fontWeight: "bold",
                backgroundColor: "#fff",
              }}
            >
              マイページ
            </Link>

            <button
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ログアウト
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <button
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
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  メールアドレス
                </label>
                <input
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
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  パスワード
                </label>
                <input
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

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
          新規投稿
        </h2>

        {!session?.user && (
          <p style={{ marginBottom: "16px", color: "#555" }}>
            投稿するにはログインが必要です。
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "bold",
              }}
            >
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="作品タイトルを入力"
              disabled={uploading || !session?.user}
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

          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "bold",
              }}
            >
              タグ
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例: anime, girl, fantasy"
              disabled={uploading || !session?.user}
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
            <p style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
              タグはカンマ区切りで入力してください
            </p>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "bold",
              }}
            >
              プロンプト
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="生成に使ったプロンプトを入力"
              disabled={uploading || !session?.user}
              rows={5}
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
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "bold",
              }}
            >
              画像
            </label>
            <input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              disabled={uploading || !session?.user}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
              }}
            />
            <p style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
              PNG / JPG / JPEG / WEBP、5MB以下
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading || !session?.user}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: uploading || !session?.user ? "#999" : "#111",
              color: "#fff",
              cursor: uploading || !session?.user ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {uploading ? "投稿中..." : "投稿する"}
          </button>
        </form>
      </section>

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
          検索・絞り込み
        </h2>

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
            }}
          >
            <option value="new">新着順</option>
            <option value="likes">いいね順</option>
          </select>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
          投稿一覧
        </h2>

        {sortedPosts.length === 0 ? (
          <p>投稿がまだありません。</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {sortedPosts.map((post) => (
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
                        marginBottom: "8px",
                        wordBreak: "break-word",
                      }}
                    >
                      タグ: {post.tags}
                    </p>

                    <p
                      style={{
                        fontSize: "14px",
                        color: "#333",
                        marginBottom: "0",
                      }}
                    >
                      いいね: {likesCountMap[post.id] || 0}
                    </p>
                  </div>
                </Link>

                {session?.user?.id === post.user_id && (
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
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}