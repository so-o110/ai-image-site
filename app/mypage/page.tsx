"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  title: string;
  image_url: string;
  tags: string[] | string | null;
  prompt: string | null;
  created_at: string;
  likes_count: number | null;
  user_id: string;
  author_name?: string | null;
};

type UserInfo = {
  id: string;
  email?: string;
};

export default function MyPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAndPosts();
  }, []);

  async function fetchUserAndPosts() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUser(null);
      setPosts([]);
      setLoading(false);
      return;
    }

    setUser({
      id: user.id,
      email: user.email,
    });

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("自分の投稿取得エラー:", error.message);
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts((data as Post[]) || []);
    setLoading(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました: " + error.message);
      return;
    }

    window.location.href = "/";
  }

  function normalizeTags(tags: string[] | string | null | undefined): string[] {
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }

    if (typeof tags === "string") {
      return tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }

  const filteredPosts = useMemo(() => {
    const search = searchText.toLowerCase();

    return posts.filter((post) => {
      const normalizedTags = normalizeTags(post.tags);

      return (
        post.title.toLowerCase().includes(search) ||
        (post.prompt || "").toLowerCase().includes(search) ||
        normalizedTags.some((tag) => tag.toLowerCase().includes(search))
      );
    });
  }, [posts, searchText]);

  const totalLikes = useMemo(() => {
    return posts.reduce((sum, post) => sum + (post.likes_count ?? 0), 0);
  }, [posts]);

  if (!loading && !user) {
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

            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-100 transition hover:bg-white/10"
            >
              ホームへ
            </Link>
          </div>
        </header>

        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full rounded-3xl border border-white/10 bg-[#15151c] p-8 text-center shadow-2xl shadow-black/30">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Access Denied
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              Login Required
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              マイページを表示するにはログインしてください。
            </p>

            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex rounded-full bg-[#b91c1c] px-6 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                ホームへ戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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

            <Link
              href="/upload"
              className="rounded-full bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
            >
              投稿する
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-100 transition hover:bg-white/10"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#15151c] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
                My Realm
              </p>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Personal Creative Realm
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                自分が投稿した創作を管理し、成長の記録を確認できます。
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Operator
              </p>
              <p className="mt-2 max-w-[320px] break-all text-sm text-gray-300">
                {user?.email}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#15151c] p-6 shadow-2xl shadow-black/30">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
                Realm Stats
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Posts
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {posts.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Likes
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {totalLikes}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#15151c] p-6 shadow-2xl shadow-black/30">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
                Control Panel
              </p>

              <div className="mt-5 space-y-3">
                <Link
                  href="/upload"
                  className="block rounded-2xl bg-[#b91c1c] px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
                >
                  新しく投稿する
                </Link>

                <Link
                  href="/"
                  className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-200 transition hover:bg-white/10"
                >
                  ホームを見る
                </Link>
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
                  Personal Feed
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  My Posts
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  自分が投稿したコンテンツ一覧
                </p>
              </div>

              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="自分の投稿を検索"
                className="w-full rounded-full border border-white/10 bg-[#0d0d12] px-5 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70 md:w-[320px]"
              />
            </div>

            <div className="mt-6 text-sm text-gray-500">
              {filteredPosts.length}件
            </div>

            {loading ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-[#0d0d12] py-10 text-center text-gray-400">
                読み込み中...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-[#0d0d12] p-10 text-center text-gray-400">
                まだ投稿がありません
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPosts.map((post) => {
                  const tags = normalizeTags(post.tags);

                  return (
                    <article key={post.id} className="group">
                      <Link
                        href={`/posts/${post.id}`}
                        className="block overflow-hidden rounded-2xl bg-[#18181d] shadow-xl shadow-black/30"
                      >
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                        />
                      </Link>

                      <div className="mt-3">
                        <Link
                          href={`/posts/${post.id}`}
                          className="line-clamp-2 text-base font-black text-white hover:underline"
                        >
                          {post.title}
                        </Link>

                        <div className="mt-2 text-sm text-gray-500">
                          ❤️ {post.likes_count ?? 0} ・{" "}
                          {formatDate(post.created_at)}
                        </div>

                        {tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {post.prompt && (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                            {post.prompt}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}