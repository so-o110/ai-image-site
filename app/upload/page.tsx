"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserInfo = {
  id: string;
  email?: string;
};

export default function UploadPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUser(null);
      return;
    }

    setUser({
      id: user.id,
      email: user.email,
    });
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました: " + error.message);
      return;
    }

    window.location.href = "/";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) {
      alert("先にログインしてください");
      return;
    }

    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    if (!imageFile) {
      alert("画像を選択してください");
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      alert("画像サイズは5MB以下にしてください");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(imageFile.type)) {
      alert("jpg / png / webp の画像を選んでください");
      return;
    }

    setUploading(true);

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("image")
        .upload(filePath, imageFile);

      if (uploadError) {
        alert("画像アップロードに失敗しました: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("image")
        .getPublicUrl(filePath);

      const image_url = publicUrlData.publicUrl;

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { error: insertError } = await supabase.from("posts").insert([
        {
          title: title.trim(),
          prompt: prompt.trim() || "",
          image_url,
          tags: tagsArray.join(", "),
          user_id: user.id,
        },
      ]);

      if (insertError) {
        alert("投稿の保存に失敗しました: " + insertError.message);
        setUploading(false);
        return;
      }

      alert("投稿しました");

      setTitle("");
      setTags("");
      setPrompt("");
      setImageFile(null);
      setPreviewUrl("");

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("投稿中にエラーが発生しました");
    }

    setUploading(false);
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

            {user && (
              <button
                onClick={handleLogout}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-100 transition hover:bg-white/10"
              >
                ログアウト
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#15151c] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-transparent to-transparent" />

          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Upload Gate
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              New Realm Entry
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              プロンプトから生まれた創作をSosaku Realmに登録します。
            </p>
          </div>
        </section>

        {!user && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-[#15151c] p-6 text-gray-300">
            投稿するにはログインが必要です。ホーム画面からログインしてください。
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-200">
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="作品タイトルを入力"
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
                  placeholder="anime, fantasy, original"
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
                  placeholder="生成に使ったプロンプトを入力"
                  rows={8}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-red-500/70"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-200">
                  画像
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="block w-full rounded-2xl border border-white/10 bg-[#0d0d12] px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded-full file:border-0 file:bg-[#b91c1c] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-700"
                />
                <p className="mt-2 text-xs text-gray-500">
                  jpg / png / webp、5MB以下
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading || !user}
                className="w-full rounded-2xl bg-[#b91c1c] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                {uploading ? "アップロード中..." : "Sosaku Realm に登録"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#15151c] p-5 shadow-2xl shadow-black/30 md:p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Preview Panel
            </p>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d12] shadow-xl shadow-black/30">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="preview"
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-gray-500">
                  画像プレビュー
                </div>
              )}
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Title
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  {title || "No Title"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Tags
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}

                  {!tags.trim() && (
                    <span className="text-sm text-gray-500">タグなし</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Prompt
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-400">
                  {prompt || "プロンプト未入力"}
                </p>
              </div>

              {user && (
                <div className="border-t border-white/10 pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Operator
                  </p>
                  <p className="mt-2 break-all text-sm text-gray-400">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}