import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { User } from "@/models";
import { Conversation } from "../Conversation";

export default async function AdminConversationPage({ params }: PageProps<"/messages/[userId]">) {
  await requireAdmin();
  const { userId } = await params;
  if (!isValidObjectId(userId)) notFound();
  const person = await User.findById(userId, "name email").lean();
  if (!person) notFound();

  return (
    <div>
      <Link href="/messages" className="text-sm text-indigo-600 hover:underline">
        ← Inbox
      </Link>
      <h1 className="page-title mt-2">{person.name ?? person.email}</h1>
      <Conversation conversationId={userId} viewerIsAdmin />
    </div>
  );
}
