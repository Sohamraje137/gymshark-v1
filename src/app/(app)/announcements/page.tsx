import { requireUser } from "@/lib/session";
import { Announcement } from "@/models";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const announcements = await Announcement.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate<{ author: { name?: string } }>("author", "name")
    .lean();

  return (
    <div className="space-y-6">
      <h1 className="page-title">Announcements</h1>

      {isAdmin && (
        <form action={createAnnouncement} className="card space-y-3">
          <h2 className="font-medium">Post an announcement</h2>
          <input name="title" placeholder="Title" required maxLength={200} className="input" />
          <textarea name="body" placeholder="Write something…" required rows={4} maxLength={5000} className="input" />
          <button className="btn">Post</button>
        </form>
      )}

      {announcements.length === 0 && <p className="text-slate-500">No announcements yet.</p>}

      {announcements.map((a) => (
        <article key={a._id.toString()} className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{a.title}</h2>
              <p className="text-xs text-slate-500">
                {a.author?.name ?? "Admin"} · {a.createdAt.toLocaleString()}
              </p>
            </div>
            {isAdmin && (
              <form action={deleteAnnouncement.bind(null, a._id.toString())}>
                <button className="btn-danger">Delete</button>
              </form>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-slate-700">{a.body}</p>
        </article>
      ))}
    </div>
  );
}
