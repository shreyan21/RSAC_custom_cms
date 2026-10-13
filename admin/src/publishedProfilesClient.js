import { api } from "./api";

// Page editors can reference profiles already visible to every website visitor.
// These records never grant access to the private master-profile editor.
export async function readPublishedProfiles(request = api) {
  const [english, hindi] = await Promise.all([
    request("/api/content/profiles?lang=en"),
    request("/api/content/profiles?lang=hi"),
  ]);
  const translations = new Map((hindi.data || []).map(item => [item.id, item]));
  return (english.data || []).map(item => ({
    id: item.id, entryKey: item.key, status: "published", dataEn: item,
    dataHi: translations.get(item.id) || {},
  }));
}
