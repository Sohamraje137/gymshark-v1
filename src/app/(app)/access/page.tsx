import Link from "next/link";
import { requireCoach } from "@/lib/session";
import { User } from "@/models";
import { setBlocked, setRole } from "./actions";

export const metadata = { title: "Access" };

export default async function AccessPage() {
  const me = await requireCoach();
  const users = await User.find().sort({ createdAt: -1 }).limit(500).lean();

  return (
    <div>
      <h1 className="page-title">Users ({users.length})</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const id = u._id.toString();
              const isMe = id === me.id;
              return (
                <tr key={id} className={u.blocked ? "bg-red-50/50" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.name} {isMe && <span className="text-xs text-slate-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.role === "coach" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.blocked && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">blocked</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.lastLoginAt?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/messages/${id}`} className="btn-secondary">
                        Message
                      </Link>
                      {!isMe && (
                        <>
                          <form action={setRole.bind(null, id, u.role === "coach" ? "client" : "coach")}>
                            <button className="btn-secondary">{u.role === "coach" ? "Make client" : "Make coach"}</button>
                          </form>
                          <form action={setBlocked.bind(null, id, !u.blocked)}>
                            <button className={u.blocked ? "btn-secondary" : "btn-danger"}>
                              {u.blocked ? "Unblock" : "Block"}
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
