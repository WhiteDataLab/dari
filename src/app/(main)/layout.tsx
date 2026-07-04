import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TabBar } from "@/components/TabBar";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [deckCount, unread] = await Promise.all([
    prisma.profile.count({ where: { ownerId: userId, isSelf: false } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return (
    <div className="pb-[96px]">
      {children}
      <TabBar hasDeck={deckCount > 0} likeBadge={unread} />
    </div>
  );
}
