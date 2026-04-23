"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Comment = {
  id: string;
  created_at: string;
  post_id: string;
  user_id: string;
  content: string;
};

export default function PostDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);

  const [session, setSession] = useState<Session | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const fetchPost = async () => {
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
  };

  const fetchLikesCount = async () => {
    const { data, error } = await supabase
      .from("likes")
      .select("post_id")
      .eq("post_id", id);

    if (error) {
      console.error("いいね数取得エラー:", error);
      alert(`いいね数取得エラー: ${error.message}`);
      return;
    }

    setLikesCount(data?.length || 0);
  };

  const fetchLikedByMe = async (userId: string) => {
    const { data, error } = await supabase
      .from("likes")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("いいね状態取得エラー:", error);
      alert(`いいね状態取得エラー: ${error.message}`);
      return;
    }

    setLikedByMe(!!data);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("コメント取得エラー:", error.message);
      alert(`コメント取得エラー: ${error.message}`);
      return;
    }

    setComments((data as Comment[]) || []);
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

      if (currentSession?.user && id) {
        await fetchLikedByMe(currentSession.user.id);
      } else {
        setLikedByMe(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);

      if (currentSession?.user && id) {
        await fetchLikedByMe(currentSession.user.id);
      } else {
        setLikedByMe(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    const loadPage = async () => {
      if (!id) return;

      setLoading(true);
      await fetchPost();
      await fetchLikesCount();
      await fetchComments();
      setLoading(false);
    };

    loadPage();
  }, [id]);

  const handleLike = async () => {
    if (liking) return;

    if (!session?.user) {
      alert("いいねするにはログインしてください。");
      return;
    }

    setLiking(true);

    try {
      if (likedByMe) {
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", session.user.id);

        if (deleteError) {
          console.error("いいね解除エラー:", deleteError);
          alert(`いいね解除に失敗しました: ${deleteError.message}`);
          return;
        }

        setLikedByMe(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        alert("いいねを解除しました。");
        return;
      }

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
        setLikedByMe(true);
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

      setLikedByMe(true);
      setLikesCount((prev) => prev + 1);
      alert("いいねしました。");
    } catch (error) {
      console.error("予期しないエラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setLiking(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      alert("コメントするにはログインしてください。");
      return;
    }

    if (!commentText.trim()) {
      alert("コメントを入力してください。");
      return;
    }

    setCommentSubmitting(true);

    try {
      const { error } = await supabase.from("comments").insert([
        {
          post_id: id,
          user_id: session.user.id,
          content: commentText.trim(),
        },
      ]);

      if (error) {
        console.error("コメント投稿エラー:", error.message);
        alert(`コメント投稿に失敗しました: ${error.message}`);
        return;
      }

      setCommentText("");
      await fetchComments();
      alert("コメントを投稿しました。");
    } catch (error) {
      console.error("予期しないエラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("コメント削除エラー:", error.message);
      alert(`コメント削除に失敗しました: ${error.message}`);
      return;
    }

    await fetchComments();
    alert("コメントを削除しました。");
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
          marginBottom: "24px",
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
                backgroundColor: liking
                  ? "#999"
                  : likedByMe
                  ? "#d11a2a"
                  : "#111",
                color: "#fff",
                cursor: liking ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {liking
                ? "送信中..."
                : likedByMe
                ? "♥ いいね済み（押すと解除）"
                : "♡ いいね"}
            </button>

            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
              いいね数: {likesCount}
            </p>

            {session?.user?.id === post.user_id && (
              <Link
                href={`/posts/${post.id}/edit`}
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border: "1px solid #111",
                  textDecoration: "none",
                  color: "#111",
                  fontWeight: "bold",
                  backgroundColor: "#fff",
                }}
              >
                編集する
              </Link>
            )}
          </div>
        </div>
      </article>

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
          コメント
        </h2>

        <form onSubmit={handleCommentSubmit} style={{ marginBottom: "24px" }}>
          {!session?.user && (
            <p style={{ marginBottom: "12px", color: "#666" }}>
              コメントするにはログインが必要です。
            </p>
          )}

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="コメントを入力"
            disabled={commentSubmitting || !session?.user}
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#fff",
              color: "#111",
              resize: "vertical",
              marginBottom: "12px",
            }}
          />

          <button
            type="submit"
            disabled={commentSubmitting || !session?.user}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor:
                commentSubmitting || !session?.user ? "#999" : "#111",
              color: "#fff",
              cursor:
                commentSubmitting || !session?.user ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {commentSubmitting ? "投稿中..." : "コメントする"}
          </button>
        </form>

        {comments.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>まだコメントはありません。</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {comments.map((comment) => (
              <article
                key={comment.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: "10px",
                  padding: "16px",
                  backgroundColor: "#fafafa",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    marginBottom: "10px",
                  }}
                >
                  {new Date(comment.created_at).toLocaleString("ja-JP")}
                </p>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    marginBottom: session?.user?.id === comment.user_id ? "12px" : "0",
                  }}
                >
                  {comment.content}
                </div>

                {session?.user?.id === comment.user_id && (
                  <button
                    onClick={() => handleCommentDelete(comment.id)}
                    style={{
                      padding: "8px 12px",
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
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}