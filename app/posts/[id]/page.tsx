"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
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
  user_id: string | null;
  content: string;
};

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  const isOwner = session?.user?.id && post?.user_id === session.user.id;

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
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
    if (!postId) return;
    refreshData();
  }, [postId]);

  useEffect(() => {
    if (!postId || !session?.user?.id) {
      setLiked(false);
      return;
    }

    fetchLikedState();
  }, [postId, session?.user?.id]);

  async function refreshData() {
    setLoading(true);

    await Promise.all([fetchPost(), fetchComments(), fetchLikeCount()]);

    setLoading(false);
  }

  async function fetchPost() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error) {
      console.error("投稿取得エラー:", error.message);
      setPost(null);
      return;
    }

    setPost(data as Post);
  }

  async function fetchComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("コメント取得エラー:", error.message);
      setComments([]);
      return;
    }

    setComments((data as Comment[]) || []);
  }

  async function fetchLikeCount() {
    const { count, error } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) {
      console.error("いいね数取得エラー:", error.message);
      setLikeCount(0);
      return;
    }

    setLikeCount(count || 0);
  }

  async function fetchLikedState() {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("いいね状態取得エラー:", error.message);
      setLiked(false);
      return;
    }

    setLiked(Boolean(data));
  }

  async function handleToggleLike() {
    if (!session?.user?.id) {
      alert("いいねするにはログインしてください。");
      return;
    }

    if (!post) return;

    setLikeSubmitting(true);

    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id);

        if (error) {
          alert("いいね解除に失敗しました: " + error.message);
          return;
        }

        setLiked(false);
      } else {
        const { error } = await supabase.from("likes").insert([
          {
            post_id: post.id,
            user_id: session.user.id,
          },
        ]);

        if (error) {
          alert("いいねに失敗しました: " + error.message);
          return;
        }

        setLiked(true);
      }

      await fetchLikeCount();
    } finally {
      setLikeSubmitting(false);
    }
  }

  async function handleCreateComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!session?.user?.id) {
      alert("コメントするにはログインしてください。");
      return;
    }

    if (!commentText.trim()) {
      alert("コメントを入力してください。");
      return;
    }

    setCommentSubmitting(true);

    const { error } = await supabase.from("comments").insert([
      {
        post_id: postId,
        user_id: session.user.id,
        content: commentText.trim(),
      },
    ]);

    if (error) {
      alert("コメント投稿に失敗しました: " + error.message);
      setCommentSubmitting(false);
      return;
    }

    setCommentText("");
    await fetchComments();
    setCommentSubmitting(false);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("コメントを削除しますか？")) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      alert("コメント削除に失敗しました: " + error.message);
      return;
    }

    await fetchComments();
  }

  async function handleDeletePost() {
    if (!post) return;
    if (!confirm("本当にこの投稿を削除しますか？")) return;

    const { error } = await supabase.from("posts").delete().eq("id", post.id);

    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }

    alert("削除しました");
    window.location.href = "/";
  }

  const tags = useMemo(() => {
    if (!post?.tags) return [];

    return post.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [post?.tags]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070a] text-white">
        <Header session={session} />
        <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
            読み込み中...
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#07070a] text-white">
        <Header session={session} />
        <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
            投稿が見つかりません。
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <Header session={session} />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#15151c] shadow-2xl shadow-black/30">
          <img
            src={post.image_url}
            alt={post.title}
            className="max-h-[720px] w-full object-contain bg-black"
          />

          <div className="border-t border-white/10 bg-[#15151c] p-5 md:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Realm Detail
            </p>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span>❤️ {likeCount}</span>
              <span>•</span>
              <span>{formatDate(post.created_at)}</span>
            </div>

            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleToggleLike}
                disabled={likeSubmitting}
                className={`rounded-full px-5 py-3 text-sm font-black transition disabled:opacity-50 ${
                  liked
                    ? "bg-[#b91c1c] text-white hover:bg-red-700"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {liked ? "❤️ いいね済み" : "♡ いいね"}
              </button>

              {isOwner && (
                <>
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    編集
                  </Link>

                  <button
                    onClick={handleDeletePost}
                    className="rounded-full border border-red-500/30 bg-red-950/30 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-900/40"
                  >
                    削除
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Prompt
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-gray-300">
              {post.prompt || "プロンプトはありません。"}
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Comments
            </p>

            <form onSubmit={handleCreateComment} className="mt-5 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  session?.user
                    ? "コメントを書く"
                    : "コメントするにはログインしてください"
                }
                disabled={!session?.user || commentSubmitting}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!session?.user || commentSubmitting}
                className="w-full rounded-2xl bg-[#b91c1c] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                {commentSubmitting ? "投稿中..." : "コメントする"}
              </button>
            </form>

            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-[#0d0d12] p-5 text-center text-sm text-gray-500">
                  まだコメントがありません。
                </p>
              ) : (
                comments.map((comment) => {
                  const canDeleteComment =
                    session?.user?.id && session.user.id === comment.user_id;

                  return (
                    <div
                      key={comment.id}
                      className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>

                        {canDeleteComment && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs font-bold text-red-300 hover:underline"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Header({ session }: { session: Session | null }) {
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました: " + error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b10]/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b91c1c] text-sm font-black text-white shadow-lg shadow-red-900/40">
            SR
          </div>

          <div className="leading-tight">
            <div className="text-lg font-black tracking-tight text-white">
              Sosaku Realm
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-red-200/60">
              Prompt Creative Realm
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-100 transition hover:bg-white/10"
          >
            ホームへ
          </Link>

          {session?.user && (
            <>
              <Link
                href="/mypage"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-100 transition hover:bg-white/10"
              >
                マイページ
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-100 transition hover:bg-white/10"
              >
                ログアウト
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}