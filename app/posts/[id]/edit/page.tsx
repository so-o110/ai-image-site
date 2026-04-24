"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function EditPostPage() {
  const params = useParams();
  const postId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [post, setPost] = useState<Post | null>(null);

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    fetchPost();
  }, [postId]);

  async function fetchPost() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error) {
      console.error("投稿取得エラー:", error.message);
      setPost(null);
      setLoading(false);
      return;
    }

    const fetchedPost = data as Post;

    setPost(fetchedPost);
    setTitle(fetchedPost.title || "");
    setTags(fetchedPost.tags || "");
    setPrompt(fetchedPost.prompt || "");

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!session?.user?.id) {
      alert("ログインしてください。");
      return;
    }

    if (!post) {
      alert("投稿が見つかりません。");
      return;
    }

    if (post.user_id !== session.user.id) {
      alert("この投稿を編集する権限がありません。");
      return;
    }

    if (!title.trim()) {
      alert("タイトルを入力してください。");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title: title.trim(),
        tags: tags.trim(),
        prompt: prompt.trim(),
      })
      .eq("id", post.id);

    if (error) {
      alert("保存に失敗しました: " + error.message);
      setSaving(false);
      return;
    }

    alert("保存しました");
    window.location.href = `/posts/${post.id}`;
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました: " + error.message);
      return;
    }

    window.location.href = "/";
  }

  const isOwner = session?.user?.id && post?.user_id === session.user.id;

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
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

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#15151c] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-transparent to-transparent" />

          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Edit Realm Entry
            </p>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Edit Post
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              投稿した創作のタイトル・タグ・プロンプトを編集します。
            </p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
            読み込み中...
          </div>
        ) : !post ? (
          <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
            投稿が見つかりません。
          </div>
        ) : !session?.user ? (
          <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
            編集するにはログインしてください。
          </div>
        ) : !isOwner ? (
          <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
            この投稿を編集する権限がありません。
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
                Current Visual
              </p>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="aspect-video w-full object-cover"
                />
              </div>

              <Link
                href={`/posts/${post.id}`}
                className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-gray-100 transition hover:bg-white/10"
              >
                詳細ページへ戻る
              </Link>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-200">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-200">
                    タグ
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    カンマ区切りで入力
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-200">
                    プロンプト
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={10}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#b91c1c] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                >
                  {saving ? "保存中..." : "保存する"}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}