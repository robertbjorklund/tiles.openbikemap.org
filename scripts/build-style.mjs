import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MTB_TRAIL_COLOR_GREEN = "#2e7d32";
const MTB_TRAIL_COLOR_BLUE = "#1565c0";
const MTB_TRAIL_COLOR_RED = "#d32f2f";
const MTB_TRAIL_COLOR_BLACK = "#000000";
const MTB_TRAIL_COLOR_ORANGE = "#ff9800";
const TRAIL_COLOR_OTHER = "#7b1fa2";
const IMBA_TRAIL_COLOR_WHITE = "#ffffff";
/** Dashed MTB lines — solid routes stay continuous for contrast */
const MTB_TRAIL_DASHARRAY = [1, 2];

/** Keep in sync with openbikemap.org src/types/EuroVelo.ts */
const EUROVELO_ROUTE_COLOR = "#003399";

/** Keep in sync with openbikemap.org src/types/RouteNetwork.ts */
const ROUTE_NETWORK_COLOR_ICN = "#0d47a1";
const ROUTE_NETWORK_COLOR_NCN = "#d32f2f";
const ROUTE_NETWORK_COLOR_RCN = "#42a5f5";
const ROUTE_NETWORK_COLOR_LCN = "#2e7d32";
const ROUTE_NETWORK_DEFAULT_COLOR = "#7b1fa2";

const euroVeloRouteMatch = [
  "any",
  [">=", ["index-of", "EuroVelo", ["coalesce", ["get", "name"], ""]], 0],
  [
    ">=",
    ["index-of", "eurovelo", ["downcase", ["coalesce", ["get", "name"], ""]]],
    0,
  ],
  ["==", ["slice", ["upcase", ["coalesce", ["get", "ref"], ""]], 0, 2], "EV"],
];

const routeLineColor = [
  "case",
  euroVeloRouteMatch,
  EUROVELO_ROUTE_COLOR,
  ["has", "network"],
  [
    "match",
    ["get", "network"],
    "icn",
    ROUTE_NETWORK_COLOR_ICN,
    "ncn",
    ROUTE_NETWORK_COLOR_NCN,
    "rcn",
    ROUTE_NETWORK_COLOR_RCN,
    "lcn",
    ROUTE_NETWORK_COLOR_LCN,
    ROUTE_NETWORK_DEFAULT_COLOR,
  ],
  ROUTE_NETWORK_DEFAULT_COLOR,
];

/** IMBA line colors — matches filter legend icons (0=white … 3=black, 4=orange) */
const imbaLineColor = [
  "match",
  ["to-number", ["get", "mtbScaleImba"]],
  0,
  IMBA_TRAIL_COLOR_WHITE,
  1,
  MTB_TRAIL_COLOR_GREEN,
  2,
  MTB_TRAIL_COLOR_BLUE,
  3,
  MTB_TRAIL_COLOR_BLACK,
  4,
  MTB_TRAIL_COLOR_ORANGE,
  IMBA_TRAIL_COLOR_WHITE,
];

/** STS (mtb:scale) trails only — IMBA trails use trails-imba layers */
const trailLineColor = [
  "case",
  [
    "match",
    ["get", "mtbScaleImba"],
    0,
    true,
    1,
    true,
    2,
    true,
    3,
    true,
    4,
    true,
    false,
  ],
  imbaLineColor,
  ["!=", ["get", "category"], "mtb_trail"],
  ["coalesce", ["get", "color"], TRAIL_COLOR_OTHER],
  ["!", ["has", "mtbScale"]],
  ["coalesce", ["get", "color"], TRAIL_COLOR_OTHER],
  ["<=", ["to-number", ["get", "mtbScale"]], 1],
  MTB_TRAIL_COLOR_GREEN,
  ["==", ["to-number", ["get", "mtbScale"]], 2],
  MTB_TRAIL_COLOR_BLUE,
  ["==", ["to-number", ["get", "mtbScale"]], 3],
  MTB_TRAIL_COLOR_RED,
  ["==", ["to-number", ["get", "mtbScale"]], 4],
  MTB_TRAIL_COLOR_BLACK,
  MTB_TRAIL_COLOR_ORANGE,
];

const bikeLayers = [
  {
    id: "routes-casing",
    type: "line",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: 8,
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 8],
      "line-opacity": 0.85,
    },
  },
  {
    id: "routes",
    type: "line",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: 8,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": routeLineColor,
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 5],
    },
  },
  {
    id: "routes-label",
    type: "symbol",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: 11,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name"], ["get", "ref"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
    },
    paint: {
      "text-color": routeLineColor,
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  },
  {
    id: "trails-casing",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: 10,
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 7],
      "line-opacity": 0.9,
      "line-dasharray": MTB_TRAIL_DASHARRAY,
    },
  },
  {
    id: "trails",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: 10,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": trailLineColor,
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 4],
      "line-dasharray": MTB_TRAIL_DASHARRAY,
    },
  },
  {
    id: "trails-imba",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: 10,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": imbaLineColor,
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 4],
      "line-dasharray": MTB_TRAIL_DASHARRAY,
    },
  },
  {
    id: "trails-label",
    type: "symbol",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: 13,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name"], ["get", "ref"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
    },
    paint: {
      "text-color": trailLineColor,
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
    },
  },
  {
    id: "tappable-trail",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: 10,
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 8, 14, 16],
    },
  },
  {
    id: "tappable-route",
    type: "line",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: 8,
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 10, 14, 18],
    },
  },
];

const libertyUrl = "https://tiles.openfreemap.org/styles/liberty";
const liberty = await fetch(libertyUrl).then((r) => r.json());

liberty.name = "OpenBikeMap Terrain";
liberty.sources.openbikemap = {
  type: "vector",
  url: "mbtiles://openbikemap",
};
liberty.layers.push(...bikeLayers);

const satellite = {
  version: 8,
  name: "OpenBikeMap Satellite",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Powered by Esri",
    },
    openbikemap: {
      type: "vector",
      url: "mbtiles://openbikemap",
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
    ...bikeLayers,
  ],
};

mkdirSync(join(root, "styles"), { recursive: true });
writeFileSync(
  join(root, "styles", "terrain.json"),
  JSON.stringify(liberty, null, 2),
);
writeFileSync(
  join(root, "styles", "satellite.json"),
  JSON.stringify(satellite, null, 2),
);
console.log("Wrote styles/terrain.json and styles/satellite.json");
