"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<Post | null>(null);

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

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

      const fetchedPost = data as Post;
      setPost(fetchedPost);
      setTitle(fetchedPost.title);
      setTags(fetchedPost.tags);
      setPrompt(fetchedPost.prompt);

      setLoading(false);
    };

    if (id) {
      loadPage();
    }
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      alert("編集するにはログインしてください。");
      return;
    }

    if (!post) {
      alert("投稿データが見つかりません。");
      return;
    }

    if (session.user.id !== post.user_id) {
      alert("自分の投稿だけ編集できます。");
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

    setSaving(true);

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          title: title.trim(),
          tags: tags.trim(),
          prompt: prompt.trim(),
        })
        .eq("id", id);

      if (error) {
        console.error("更新エラー:", error.message);
        alert(`更新に失敗しました: ${error.message}`);
        return;
      }

      alert("投稿を更新しました。");
      router.push(`/posts/${id}`);
      router.refresh();
    } catch (error) {
      console.error("予期しないエラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setSaving(false);
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

  const isOwner = session?.user?.id === post.user_id;

  if (!isOwner) {
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
          <Link href={`/posts/${id}`} style={{ color: "#111", textDecoration: "none" }}>
            ← 投稿詳細に戻る
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
            投稿編集
          </h1>
          <p>自分の投稿だけ編集できます。</p>
        </section>
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
        <Link href={`/posts/${id}`} style={{ color: "#111", textDecoration: "none" }}>
          ← 投稿詳細に戻る
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
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>
          投稿編集
        </h1>

        <form onSubmit={handleUpdate}>
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
              disabled={saving}
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
              disabled={saving}
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

          <div style={{ marginBottom: "16px" }}>
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
              disabled={saving}
              rows={6}
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

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: saving ? "#999" : "#111",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {saving ? "保存中..." : "更新する"}
            </button>

            <Link
              href={`/posts/${id}`}
              style={{
                padding: "12px 18px",
                borderRadius: "8px",
                border: "1px solid #111",
                textDecoration: "none",
                color: "#111",
                fontWeight: "bold",
                backgroundColor: "#fff",
              }}
            >
              キャンセル
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}