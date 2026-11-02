import { requireUser } from "@/lib/session";
import { Video } from "@/models";
import { addVideo, deleteVideo } from "./actions";

export const metadata = { title: "Videos" };

export default async function VideosPage() {
  const user = await requireUser();
  const isCoach = user.role === "coach";
  const videos = await Video.find().sort({ createdAt: -1 }).limit(50).lean();

  return (
    <div className="space-y-6">
      <h1 className="page-title">Videos</h1>

      {isCoach && (
        <form action={addVideo} className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="title" placeholder="Title" required maxLength={200} className="input" />
          <input name="url" type="url" placeholder="YouTube or Vimeo link" required className="input" />
          <button className="btn">Add video</button>
        </form>
      )}

      {videos.length === 0 && <p className="text-slate-500">No videos yet.</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        {videos.map((v) => (
          <article key={v._id.toString()} className="card p-0">
            <div className="aspect-video overflow-hidden rounded-t-xl bg-black">
              <iframe
                src={v.embedUrl}
                title={v.title}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between gap-2 p-4">
              <h2 className="font-medium">{v.title}</h2>
              {isCoach && (
                <form action={deleteVideo.bind(null, v._id.toString())}>
                  <button className="btn-danger">Delete</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
