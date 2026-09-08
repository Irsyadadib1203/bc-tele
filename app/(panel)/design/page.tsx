import { db as prisma } from "@/lib/mysql";
import { ConfirmedForm } from "@/components/ui";
import { makeBroadcastImage } from "@/lib/broadcast-image";
export default async function DesignPage() {
  const [settings, levels] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.priceLevel.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const level = levels.find((item) => item.id === settings?.selectedLevelId) || levels[0] || null;
  const headerTitle = level?.headerTitle || settings?.headerTitle || "PRICE UPDATE";
  const primaryColor = level?.primaryColor || settings?.primaryColor || "#5B5BD6";
  const accentColor = level?.accentColor || settings?.accentColor || "#A78BFA";
  // Use the production image generator here as well, so this design preview
  // has the same dimensions, typography, grid, and WIB timestamp as Telegram.
  const sampleImage = await makeBroadcastImage(
    "Mobile Legends",
    [
      { product_code: "ML86", product_price: 18624 },
      { product_code: "ML172", product_price: 37248 },
      { product_code: "ML257", product_price: 55872 },
    ],
    primaryColor,
    accentColor,
    undefined,
    undefined,
    headerTitle,
    level?.name,
  );
  const sampleImageUrl = `data:image/png;base64,${sampleImage.toString("base64")}`;
  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Warna & Desain Header</h1>
          <p className="page-subtitle">
            Personalisasi gambar harga untuk level harga yang sedang dipilih.
          </p>
        </div>
      </div>
      <div className="setting-grid">
        <ConfirmedForm action="/api/design" className="card setting-card" confirmTitle="Konfirmasi desain" confirmMessage="Simpan perubahan desain header untuk level ini?">
          <h2>Pengaturan header — {level?.name || "Level harga"}</h2>
          <p className="muted">
            Judul dan warna hanya diterapkan pada broadcast level harga ini.
          </p>
          <input type="hidden" name="levelId" value={level?.id || ""} />
          <label className="field">
            Judul header
            <input name="headerTitle" defaultValue={headerTitle} />
          </label>
          <label className="field">
            Info pembaruan
            <input value="Tanggal dan waktu pembaruan otomatis" readOnly />
          </label>
          <div className="inline-fields">
            <label className="field">
              Warna utama
              <input
                type="color"
                name="primaryColor"
                defaultValue={primaryColor}
              />
            </label>
            <label className="field">
              Warna aksen
              <input
                type="color"
                name="accentColor"
                defaultValue={accentColor}
              />
            </label>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }}>
            Simpan desain
          </button>
        </ConfirmedForm>
        <section className="card setting-card">
          <h2>Pratinjau gambar</h2>
          <p className="muted">
            Tampilan umum kartu yang akan dikirim ke Telegram.
          </p>
          <div className="broadcast-image-preview" style={{ marginTop: 20 }}>
            <img alt="Contoh gambar broadcast" src={sampleImageUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}
