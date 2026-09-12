import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { FlashNotice } from "@/components/ui";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentUserId())) redirect("/login");
  const [levels, settings] = await Promise.all([
    db.priceLevel.findMany(),
    db.settings.findUnique(),
  ]);
  const theme = settings?.theme === "dark" ? "dark" : "light";
  return (
    <div className="shell">
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.theme = "${theme}"; document.body.dataset.theme = "${theme}";`,
        }}
      />
      <Sidebar />
      <Topbar
        levels={levels}
        selectedLevelId={settings?.selectedLevelId || levels[0]?.id || null}
        theme={theme}
      />
      <FlashNotice />
      {children}
    </div>
  );
}
