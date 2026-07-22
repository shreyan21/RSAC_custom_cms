import { useRef, useState } from "react";
import { FileUp, Film, ImagePlus, Search, Trash2, Undo2, Upload } from "lucide-react";
import { api, mediaPreviewUrl } from "./api";

const imagePattern = /\.(?:png|jpe?g|webp|avif|gif|svg)(?:[?#].*)?$/i;

const assetKindLabel = {
  image: "Photo",
  video: "Video",
  audio: "Audio",
  document: "Document",
  embed: "Interactive",
  link: "Web link",
};

function AssetUploadField({ asset, onChange, onBusy, onError }) {
  const fileRef = useRef(null);
  const upload = async (file) => {
    if (!file) return;
    onBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api("/api/admin/media", { method: "POST", body });
      onChange({ value: result.data.public_url });
    } catch (error) {
      onError(error.message);
    } finally {
      onBusy(false);
    }
  };
  const accept = asset.kind === "image"
    ? "image/*"
    : asset.kind === "video"
      ? ".mp4,.webm,.mov,.m4v"
      : asset.kind === "audio"
        ? ".mp3,.wav,.ogg,.m4a"
        : ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.apk,image/*,video/mp4,video/webm";
  const sourceLabel = asset.kind === "link" || asset.kind === "embed"
    ? "Local file or webpage URL"
    : "Local file URL";

  return (
    <label className="imported-asset-source">
      <span>{sourceLabel}</span>
      <div className="imported-asset-url">
        <input
          value={asset.value || ""}
          aria-label={`${asset.label} URL`}
          placeholder={sourceLabel}
          onChange={(event) => onChange({ value: event.target.value })}
        />
        <input ref={fileRef} hidden type="file" accept={accept} onChange={(event) => upload(event.target.files?.[0])} />
        <button type="button" className="secondary" onClick={() => fileRef.current?.click()}><Upload /> Upload / replace</button>
      </div>
    </label>
  );
}

export default function ImportedAssetEditor({ assets, language = "en", onChange, onBusy = () => {}, onError = () => {} }) {
  const [query, setQuery] = useState("");
  const list = Array.isArray(assets) ? assets : [];
  const active = list.reduce((result, asset, index) => {
    if (!asset.hidden) result.push({ asset, index });
    return result;
  }, []);
  const visible = active.filter(({ asset }) =>
    `${asset.label || ""} ${asset.value || ""} ${asset.alt || ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const removed = list.filter((asset) => asset.hidden).length;
  const update = (index, patch) => onChange(list.map((asset, position) => position === index ? { ...asset, ...patch } : asset));
  const remove = (index) => {
    const asset = list[index];
    onChange(asset?.isNew
      ? list.filter((_asset, position) => position !== index)
      : list.map((item, position) => position === index ? { ...item, hidden: true } : item));
  };
  const add = (kind) => onChange([...list, {
    key: `cms-asset-${crypto.randomUUID()}`,
    kind,
    label: kind === "image" ? "New section photo" : kind === "video" ? "New section video" : "New document or link",
    value: "",
    sourceValue: "",
    isNew: true,
  }]);

  return (
    <section className="imported-assets-editor">
      <div className="imported-assets-heading">
        <div><strong>Media shown in this section</strong><p>Photo or file is shared by English and Hindi. {language === "hi" ? "Edit only Hindi alt text and caption here." : "Edit English alt text and caption here."} A blank caption or description stays blank on the website.</p></div>
        <div className="imported-assets-add"><button type="button" className="secondary" onClick={() => add("image")}><ImagePlus /> Add photo</button><button type="button" className="secondary" onClick={() => add("video")}><Film /> Add video</button><button type="button" className="secondary" onClick={() => add("document")}><FileUp /> Add document / link</button></div>
      </div>
      {active.length > 6 && <label className="imported-assets-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active.length} media items`} /></label>}
      <div className="imported-assets-list">
        {visible.map(({ asset, index }, visibleIndex) => (
          <article className={`imported-asset-row${asset.kind === "image" && asset.value && imagePattern.test(asset.value) ? " has-preview" : ""}`} key={asset.key || `${asset.sourceValue}-${index}`}>
            <span className="imported-asset-number">{visibleIndex + 1}</span>
            {asset.kind === "image" && asset.value && imagePattern.test(asset.value) && <img src={mediaPreviewUrl(asset.value)} alt="Current CMS media preview" />}
            <div className="imported-asset-fields">
              <div className="imported-asset-title"><span>{assetKindLabel[asset.kind] || "Media"}</span><strong>{asset.label || `Media ${index + 1}`}</strong></div>
              <AssetUploadField asset={asset} onChange={(patch) => update(index, patch)} onBusy={onBusy} onError={onError} />
              {asset.kind === "image" && <label>Image description (alt text)<input value={asset.alt || ""} onChange={(event) => update(index, { alt: event.target.value })} /></label>}
              {asset.kind === "image" && !asset.isNew && <label>Visible title / caption (optional)<input value={asset.title || ""} onChange={(event) => update(index, { title: event.target.value })} /></label>}
              {asset.kind === "image" && asset.isNew && <label>Visible caption (optional)<input value={asset.caption || ""} onChange={(event) => update(index, { caption: event.target.value })} /></label>}
              {asset.kind !== "image" && <label>Visible title / link text<input value={asset.text || asset.title || ""} onChange={(event) => update(index, { text: event.target.value, title: event.target.value })} /></label>}
            </div>
            <button type="button" className="danger-icon" title={`Remove ${asset.label || "media"}`} onClick={() => remove(index)}><Trash2 /></button>
          </article>
        ))}
        {!visible.length && <p className="empty-inline">No matching images, files or links.</p>}
      </div>
      {removed > 0 && <button type="button" className="secondary restore-items" onClick={() => onChange(list.map((asset) => ({ ...asset, hidden: false })))}><Undo2 /> Restore {removed} removed media item{removed === 1 ? "" : "s"}</button>}
    </section>
  );
}
