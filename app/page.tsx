import { supabase } from "@/lib/supabase";
import PostForm from "@/app/components/PostForm";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  title: string;
  image_url: string;
  tags: string;
  prompt: string;
};

export default async function Home() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">AI Image Site</h1>
        <p className="mt-4 text-red-500">データ取得エラー: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-black">AI Image Site</h1>
      <p className="mb-8 text-gray-600">
        AI画像とプロンプトを見やすくまとめるサイト
      </p>

      <PostForm />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts?.map((post: Post) => (
          <div key={post.id} className="overflow-hidden rounded-2xl bg-white shadow">
            <img
              src={post.image_url}
              alt={post.title}
              className="h-64 w-full object-cover"
            />

            <div className="p-4">
              <h2 className="text-lg font-bold text-black">{post.title}</h2>
              <p className="mt-2 text-sm text-gray-500">{post.tags}</p>

              <div className="mt-4 rounded-lg bg-gray-100 p-3">
                <p className="mb-1 text-sm font-semibold text-black">Prompt</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {post.prompt}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}