import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
export default async function PanelLayout({children}:{children:React.ReactNode}){if(!await currentUserId())redirect('/login');const [levels,settings]=await Promise.all([db.priceLevel.findMany(),db.settings.findUnique()]);return <div className="shell"><Sidebar/><Topbar levels={levels} selectedLevelId={settings?.selectedLevelId||levels[0]?.id||null} theme={String(settings?.theme||'light')}/>{children}</div>}
