import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Message, User } from "@/models";
import { Conversation } from "./Conversation";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser();

  if (user.role !== "admin") {
    return (
      <div>
        <h1 className="page-title">Messages</h1>
        <p className="-mt-4 mb-4 text-sm text-slate-500">Your private channel with the admin team.</p>
        <Conversation conversationId={user.id} viewerIsAdmin={false} />
      </div>
    );
  }

  // Admin inbox: the latest message of every conversation.
  const latest = await Message.aggregate<{
    _id: string;
    body: string;
    fromAdmin: boolean;
    createdAt: Date;
  }>([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$conversation", body: { $first: "$body" }, fromAdmin: { $first: "$fromAdmin" }, createdAt: { $first: "$createdAt" } } },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
  ]);
  const people = await User.find({ _id: { $in: latest.map((c) => c._id) } }, "name email").lean();
  const byId = new Map(people.map((p) => [p._id.toString(), p]));

  return (
    <div>
      <h1 className="page-title">Inbox</h1>
      <p className="-mt-4 mb-4 text-sm text-slate-500">
        To start a new conversation, open a user from the Admin page.
      </p>
      <div className="card divide-y divide-slate-100 p-0">
        {latest.length === 0 && <p className="p-5 text-sm text-slate-500">No messages yet.</p>}
        {latest.map((c) => {
          const person = byId.get(c._id.toString());
          return (
            <Link
              key={c._id.toString()}
              href={`/messages/${c._id}`}
              className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="font-medium">{person?.name ?? person?.email ?? "Unknown user"}</p>
                <p className="truncate text-sm text-slate-500">
                  {c.fromAdmin ? "You: " : ""}
                  {c.body}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                {!c.fromAdmin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Needs reply</span>}
                {c.createdAt.toLocaleDateString()}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
