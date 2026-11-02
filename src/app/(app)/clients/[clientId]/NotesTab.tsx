import { CoachNote } from "@/models";
import { addNote, deleteNote, setNotePinned } from "../actions";

/** The coach's private notes about a client. Clients never see these. */
export async function NotesTab({ clientId }: { clientId: string }) {
  const notes = await CoachNote.find({ client: clientId })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(200)
    .populate<{ author: { name?: string } | null }>("author", "name")
    .lean();

  return (
    <div className="space-y-4">
      <form action={addNote.bind(null, clientId)} className="card space-y-3">
        <h2 className="font-semibold">Add note</h2>
        <p className="-mt-2 text-xs text-slate-500">Private to coaches. The client can&apos;t see notes.</p>
        <textarea name="body" required maxLength={10000} rows={3} placeholder="Note" className="input" aria-label="Note" />
        <input name="tags" placeholder="Tags, comma-separated (e.g. injury, nutrition)" className="input" aria-label="Tags" />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="pinned" /> Pin
          </label>
          <button className="btn">Add note</button>
        </div>
      </form>

      {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
      <ul className="space-y-3">
        {notes.map((n) => {
          const id = n._id.toString();
          return (
            <li key={id} className={`card space-y-2 ${n.pinned ? "border-amber-300 bg-amber-50/50" : ""}`}>
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {n.pinned && <span className="mr-1 font-medium text-amber-700">Pinned ·</span>}
                  {n.author?.name ?? "Coach"} · {n.createdAt.toLocaleString()}
                </p>
                <div className="flex gap-1">
                  <form action={setNotePinned.bind(null, clientId, id, !n.pinned)}>
                    <button className="btn-secondary">{n.pinned ? "Unpin" : "Pin"}</button>
                  </form>
                  <form action={deleteNote.bind(null, clientId, id)}>
                    <button className="btn-danger">Delete</button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
