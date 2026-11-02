import { Message } from "@/models";
import { sendMessage } from "./actions";

/** Renders one user <-> coach thread plus a reply box. */
export async function Conversation({
  conversationId,
  viewerIsCoach,
}: {
  conversationId: string;
  viewerIsCoach: boolean;
}) {
  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate<{ sender: { name?: string } }>("sender", "name")
    .lean();

  return (
    <div className="card space-y-4">
      <div className="space-y-3">
        {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Say hello!</p>}
        {messages.map((m) => {
          const mine = m.fromCoach === viewerIsCoach;
          return (
            <div key={m._id.toString()} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-indigo-200" : "text-slate-500"}`}>
                  {m.fromCoach ? `${m.sender?.name ?? "Coach"} (coach)` : m.sender?.name} ·{" "}
                  {m.createdAt.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form action={sendMessage.bind(null, conversationId)} className="flex gap-2 border-t border-slate-100 pt-4">
        <input name="body" placeholder="Write a message…" required maxLength={5000} className="input" autoComplete="off" />
        <button className="btn">Send</button>
      </form>
    </div>
  );
}
