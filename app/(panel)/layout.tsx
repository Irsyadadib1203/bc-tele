import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
export default async function PanelLayout({children}:{children:React.ReactNode}){if(!await currentUserId())redirect('/login');const [levels,settings]=await Promise.all([prisma.priceLevel.findMany({orderBy:{createdAt:'asc'}}),prisma.settings.findUnique({where:{id:1}})]);return <div className="shell"><Sidebar/><Topbar levels={levels} selectedLevelId={settings?.selectedLevelId||levels[0]?.id||null} theme={settings?.theme||'light'}/>{children}</div>}
