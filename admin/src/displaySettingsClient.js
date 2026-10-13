import { api } from "./api";

export async function readPublishedDisplaySettings() {
  const [english, hindi] = await Promise.all([
    api("/api/content/page_display_settings?lang=en"),
    api("/api/content/page_display_settings?lang=hi"),
  ]);
  const translations = new Map((hindi.data || []).map(item => [item.id, item]));
  return (english.data || []).map(item => ({
    id: item.id, status: "published", dataEn: item,
    dataHi: translations.get(item.id) || {},
  }));
}
