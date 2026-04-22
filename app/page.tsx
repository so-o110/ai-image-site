const samplePosts = [
  {
    id: 1,
    title: "Anime Girl",
    imageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    tags: ["anime", "portrait", "cute"],
  },
  {
    id: 2,
    title: "Cyber City",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    tags: ["cyberpunk", "city", "night"],
  },
  {
    id: 3,
    title: "Fantasy World",
    imageUrl:
      "https://images.unsplash.com/photo-1511300636408-a63a89df3482?q=80&w=1200&auto=format&fit=crop",
    tags: ["fantasy", "art", "dreamy"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-2 text-3xl font-bold text-black">AI Image Site</h1>
      <p className="mb-8 text-gray-600">AI画像を見やすくまとめるサイト</p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {samplePosts.map((post) => (
          <div
            key={post.id}
            className="overflow-hidden rounded-2xl bg-white shadow"
          >
            <img
              src={post.imageUrl}
              alt={post.title}
              className="h-64 w-full object-cover"
            />
            <div className="p-4">
              <h2 className="text-lg font-semibold text-black">{post.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}