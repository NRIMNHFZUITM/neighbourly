import L from "leaflet";

const cache = new Map<string, L.DivIcon>();

/** Teardrop map pin (CSS in styles/index.css). `inner` is an emoji, or "dot" for a plain pin. */
export function pinIcon(color: string, inner: string, active = false): L.DivIcon {
  const key = `${color}|${inner}|${active}`;
  let icon = cache.get(key);
  if (!icon) {
    const content =
      inner === "dot"
        ? '<span style="display:block;width:10px;height:10px;border-radius:9999px;background:#fff"></span>'
        : `<span>${inner}</span>`;
    icon = L.divIcon({
      className: "nb-pin-wrap",
      html: `<div class="nb-pin" data-active="${active}" style="--pin:${color}">${content}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
    });
    cache.set(key, icon);
  }
  return icon;
}
