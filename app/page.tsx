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
  const [showPostForm, setShowPostForm] = useState(false);

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

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });

      return copied;
    }

    copied.sort((a, b) => {
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });

    return copied;
  }, [filteredPosts, likesCountMap, sortType]);

  const heroPost = sortedPosts[0];
  const gridPosts = sortedPosts;

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
    <div className="min-h-screen bg-[#07070a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b10]/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button className="rounded-full p-2 text-gray-300 transition hover:bg-white/10 hover:text-white">
              ☰
            </button>

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
          </div>

          <div className="mx-6 hidden max-w-2xl flex-1 md:block">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="タイトル・タグ・プロンプトで検索"
              className="w-full rounded-full border border-white/10 bg-[#17171f] px-5 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70"
            />
          </div>

          <div className="flex items-center gap-2">
            {session?.user && (
              <button
                onClick={() => setShowPostForm((prev) => !prev)}
                className="rounded-full bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                投稿する
              </button>
            )}

            {session?.user ? (
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
            ) : (
              <span className="hidden text-sm text-gray-400 md:inline">
                未ログイン
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="検索"
            className="w-full rounded-full border border-white/10 bg-[#17171f] px-5 py-2 text-sm text-white outline-none placeholder:text-gray-500"
          />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#0b0b10] p-4 md:block">
          <nav className="space-y-2">
            <Link
              href="/"
              className="block rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
            >
              ホーム
            </Link>

            <button
              onClick={() => setSortType("new")}
              className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-white/10 ${
                sortType === "new"
                  ? "bg-[#b91c1c] text-white"
                  : "text-gray-300"
              }`}
            >
              新着
            </button>

            <button
              onClick={() => setSortType("likes")}
              className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-white/10 ${
                sortType === "likes"
                  ? "bg-[#b91c1c] text-white"
                  : "text-gray-300"
              }`}
            >
              人気
            </button>

            <Link
              href="/mypage"
              className="block rounded-xl px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              マイページ
            </Link>
          </nav>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#15151c] p-4 text-sm">
            <p className="mb-2 font-bold text-white">アカウント</p>

            {authLoading ? (
              <p className="text-gray-400">確認中...</p>
            ) : session?.user ? (
              <p className="break-all text-gray-400">{session.user.email}</p>
            ) : (
              <p className="text-gray-400">ログインしてください</p>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {heroPost && (
            <section className="relative min-h-[360px] overflow-hidden border-b border-white/10 md:min-h-[460px]">
              <img
                src={heroPost.image_url}
                alt={heroPost.title}
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#07070a] via-[#07070a]/85 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-transparent to-[#07070a]/30" />

              <div className="relative z-10 flex min-h-[360px] max-w-4xl flex-col justify-end px-5 pb-10 pt-20 md:min-h-[460px] md:px-10">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
                  Featured Realm
                </p>

                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                  {heroPost.title}
                </h1>

                <p className="mt-4 max-w-2xl line-clamp-3 text-sm leading-7 text-gray-300 md:text-base">
                  {heroPost.prompt}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/posts/${heroPost.id}`}
                    className="rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-gray-200"
                  >
                    詳細・コメントを見る
                  </Link>

                  <span className="rounded-full border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white backdrop-blur">
                    ❤️ {likesCountMap[heroPost.id] || 0}
                  </span>
                </div>
              </div>
            </section>
          )}

          <div className="p-4 md:p-8">
            {!session?.user && (
              <section className="mb-8 rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30">
                <h2 className="mb-4 text-xl font-black text-white">
                  アカウント
                </h2>

                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      authMode === "login"
                        ? "bg-[#b91c1c] text-white"
                        : "border border-white/10 bg-white/5 text-gray-300"
                    }`}
                  >
                    ログイン
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      authMode === "signup"
                        ? "bg-[#b91c1c] text-white"
                        : "border border-white/10 bg-white/5 text-gray-300"
                    }`}
                  >
                    新規登録
                  </button>
                </div>

                <form onSubmit={handleAuth} className="grid gap-3 md:grid-cols-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレス"
                    disabled={authSubmitting}
                    className="rounded-xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500"
                  />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード"
                    disabled={authSubmitting}
                    className="rounded-xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500"
                  />

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="rounded-xl bg-[#b91c1c] px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:bg-gray-600"
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
              </section>
            )}

            {session?.user && showPostForm && (
              <section className="mb-8 rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">新規投稿</h2>
                  <button
                    onClick={() => setShowPostForm(false)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-200 hover:bg-white/10"
                  >
                    閉じる
                  </button>
                </div>

                <PostForm userId={session.user.id} onPostCreated={refreshData} />
              </section>
            )}

            <section className="mb-8">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      selectedTag === tag
                        ? "bg-[#b91c1c] text-white"
                        : "border border-white/10 bg-[#15151c] text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                ))}

                <select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value as SortType)}
                  className="ml-auto rounded-full border border-white/10 bg-[#15151c] px-4 py-2 text-sm font-bold text-white outline-none"
                >
                  <option value="new">新着順</option>
                  <option value="likes">いいね順</option>
                </select>
              </div>

              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Realm Feed
                  </h2>
                  <p className="text-sm text-gray-400">
                    プロンプトから生まれた創作を見つける場所
                  </p>
                </div>

                <p className="text-sm text-gray-500">{sortedPosts.length}件</p>
              </div>

              {sortedPosts.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#15151c] p-10 text-center text-gray-400">
                  投稿がありません。
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {gridPosts.map((post) => {
                    const isOwner = session?.user?.id === post.user_id;
                    const likeCount = likesCountMap[post.id] || 0;

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

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                            <span>❤️ {likeCount}</span>
                            <span>•</span>
                            <span className="line-clamp-1">{post.tags}</span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                            {post.prompt}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            <Link
                              href={`/posts/${post.id}`}
                              className="font-bold text-red-300 hover:text-red-200 hover:underline"
                            >
                              詳細・コメント
                            </Link>

                            {isOwner && (
                              <>
                                <Link
                                  href={`/posts/${post.id}/edit`}
                                  className="font-bold text-gray-300 hover:text-white hover:underline"
                                >
                                  編集
                                </Link>

                                <button
                                  onClick={() => handleDelete(post.id)}
                                  className="font-bold text-red-400 hover:text-red-300 hover:underline"
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
          </div>
        </main>
      </div>
    </div>
  );
}