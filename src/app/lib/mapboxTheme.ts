import type mapboxgl from "mapbox-gl";

// 给公园/绿地/森林/景区图层套一层柔和浅绿，让漫游底图更统一、更耐看。
// 来源：参考项目「把所有的诗都种回到地球上」
export function applySoftGreenParksTheme(map: mapboxgl.Map) {
  const style = map.getStyle?.();
  if (!style?.layers?.length) return;

  const FILL = "#CFEFD6"; // soft mint green
  const LINE = "#BFE7C8";
  const FILL_OPACITY = 0.28;

  const GREEN_LAYER_ID_RE =
    /(park|landuse|national-park|forest|wood|grass|meadow|golf|pitch|cemetery|garden)/i;

  for (const layer of style.layers) {
    if (!layer?.id) continue;
    if (!GREEN_LAYER_ID_RE.test(layer.id)) continue;

    if (layer.type === "fill") {
      try {
        map.setPaintProperty(layer.id, "fill-color", FILL);
        map.setPaintProperty(layer.id, "fill-opacity", FILL_OPACITY);
      } catch {}
    }

    if (layer.type === "line") {
      try {
        map.setPaintProperty(layer.id, "line-color", LINE);
        map.setPaintProperty(layer.id, "line-opacity", 0.35);
      } catch {}
    }
  }
}

// 把地图上所有文字标注（地名、道路、POI 等）切换为中文。
// Mapbox 矢量底图自带 name_zh-Hans 字段，没有中文时回退到本地名 / 英文名。
export function setMapLabelsToChinese(map: mapboxgl.Map) {
  const style = map.getStyle?.();
  if (!style?.layers?.length) return;

  const zhField = [
    "coalesce",
    ["get", "name_zh-Hans"],
    ["get", "name_zh-Hant"],
    ["get", "name_zh"],
    ["get", "name"],
  ];

  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;
    const textField = (layer as any).layout?.["text-field"];
    if (!textField) continue;
    try {
      map.setLayoutProperty(layer.id, "text-field", zhField as any);
    } catch {}
  }
}
