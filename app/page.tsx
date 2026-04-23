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

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

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
        padding: "24px 16px 48px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
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
        AI画像投稿アプリ
      </h1>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "16px",
          padding: "20px",
          background: "#fff",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "16px",
            color: "#111",
          }}
        >
          アカウント
        </h2>

        {authLoading ? (
          <p style={{ color: "#333" }}>認証状態を確認中...</p>
        ) : session?.user ? (
          <div>
            <p style={{ color: "#111", marginBottom: "12px" }}>
              ログイン中: {session.user.email}
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link
                href="/mypage"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "#111",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                マイページ
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#444",
                  color: "#fff",
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
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
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
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    color: "#111",
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
                    fontWeight: "bold",
                    marginBottom: "8px",
                    color: "#111",
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
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: "8px",
                  background: authSubmitting ? "#999" : "#111",
                  color: "#fff",
                  fontSize: "14px",
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
          border: "1px solid #ddd",
          borderRadius: "16px",
          padding: "20px",
          background: "#fff",
          marginBottom: "32px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "16px",
            color: "#111",
          }}
        >
          新規投稿
        </h2>

        {!session?.user && (
          <p
            style={{
              marginBottom: "16px",
              color: "#b00020",
              fontWeight: "bold",
            }}
          >
            投稿するにはログインが必要です。
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#111",
              }}
            >
              タイトル
            </label>
            <input
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

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#111",
              }}
            >
              タグ
            </label>
            <input
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
            <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              タグはカンマ区切りで入力してください
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#111",
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
                resize: "vertical",
                backgroundColor: "#fff",
                color: "#111",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#111",
              }}
            >
              画像
            </label>
            <input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              disabled={uploading || !session?.user}
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              style={{ color: "#111" }}
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !session?.user}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              background: uploading || !session?.user ? "#999" : "#111",
              color: "#fff",
              fontSize: "14px",
              cursor: uploading || !session?.user ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {uploading ? "投稿中..." : "投稿する"}
          </button>
        </form>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              margin: 0,
              color: "#111",
            }}
          >
            投稿一覧
          </h2>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setSortType("new")}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: sortType === "new" ? "1px solid #111" : "1px solid #ccc",
                background: sortType === "new" ? "#111" : "#fff",
                color: sortType === "new" ? "#fff" : "#111",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              新しい順
            </button>

            <button
              type="button"
              onClick={() => setSortType("likes")}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: sortType === "likes" ? "1px solid #111" : "1px solid #ccc",
                background: sortType === "likes" ? "#111" : "#fff",
                color: sortType === "likes" ? "#fff" : "#111",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              いいね順
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="検索（タイトル・プロンプト・タグ）"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#fff",
              color: "#111",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "10px",
              color: "#111",
            }}
          >
            タグで絞り込み
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: selectedTag === tag ? "1px solid #111" : "1px solid #ccc",
                  background: selectedTag === tag ? "#111" : "#fff",
                  color: selectedTag === tag ? "#fff" : "#111",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {sortedPosts.length === 0 ? (
          <p style={{ color: "#333" }}>この条件に合う投稿はまだありません。</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {sortedPosts.map((post) => (
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

                  <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                    投稿者: {post.user_id ? post.user_id.slice(0, 8) : "不明"}
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

                  {session?.user?.id === post.user_id && (
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
                  )}

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
      </section>
    </main>
  );
}