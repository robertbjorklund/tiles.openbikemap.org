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

/** All bike line layers — regional overview from ~z8 (7.5 min) */
const OPENBIKEMAP_LINE_MIN_ZOOM = 7.5;

/** High-res Terrarium DEM (512 px) — replaces coarse AWS Tilezen 256 px tiles */
const DEM_SOURCE = {
  type: "raster-dem",
  url: "https://tiles.mapterhorn.com/tilejson.json",
  encoding: "terrarium",
  tileSize: 512,
};

const hillshadeLayer = {
  id: "hillshade",
  type: "hillshade",
  source: "hillshade",
  minzoom: 2,
  paint: {
    // Zoom-scaled: subtle at country scale, stronger when zoomed in
    "hillshade-exaggeration": [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      0.06,
      9,
      0.12,
      13,
      0.18,
    ],
    // OpenSkiMap uses defaults only — avoid black accent (causes blocky "steps")
    "hillshade-shadow-color": "#473B24",
  },
};

const peakLabelsLayer = {
  id: "terrain-peak-labels",
  type: "symbol",
  source: "openmaptiles",
  "source-layer": "mountain_peak",
  minzoom: 11,
  filter: ["all", ["==", ["get", "class"], "peak"], ["has", "name"]],
  layout: {
    "icon-image": "triangle",
    "icon-size": [
      "case",
      ["==", ["get", "rank"], 1],
      0.7,
      0.5,
    ],
    "symbol-sort-key": ["to-number", ["get", "rank"]],
    "text-anchor": "top",
    "text-field": [
      "concat",
      ["coalesce", ["get", "name:en"], ["get", "name"]],
      "\n",
      ["get", "ele"],
      " m",
    ],
    "text-font": ["Noto Sans Regular"],
    "text-max-width": 4,
    "text-offset": [0, 0.5],
    "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 14, 11],
  },
  paint: {
    "icon-color": "hsl(23, 57%, 24%)",
    "icon-halo-blur": 0.2,
    "icon-halo-color": "hsl(0, 0%, 100%)",
    "icon-halo-width": 1,
    "text-color": "hsl(23, 57%, 24%)",
    "text-halo-color": "hsl(0, 0%, 100%)",
    "text-halo-width": 1.2,
  },
};

/** Insert hillshade late in the stack (after boundaries), matching OpenSkiMap */
const HILLSHADE_AFTER_LAYER_IDS = [
  "boundary_disputed",
  "boundary_2",
  "boundary_3",
];

function insertLayerAfter(layers, layer, afterIds) {
  for (const id of afterIds) {
    const index = layers.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      layers.splice(index + 1, 0, layer);
      return;
    }
  }
  const roadIndex = layers.findIndex((entry) => entry.id === "road_area_pattern");
  layers.splice(roadIndex >= 0 ? roadIndex : layers.length, 0, layer);
}

/** Keep in sync with openbikemap.org src/types/EuroVelo.ts */
const EUROVELO_ROUTE_COLOR = "#003399";

/** Keep in sync with openbikemap.org src/types/RouteNetwork.ts */
const ROUTE_NETWORK_COLOR_ICN = "#0d47a1";
const ROUTE_NETWORK_COLOR_NCN = "#d32f2f";
const ROUTE_NETWORK_COLOR_RCN = "#42a5f5";
const ROUTE_NETWORK_COLOR_LCN = "#2e7d32";
const ROUTE_NETWORK_DEFAULT_COLOR = "#7b1fa2";
/** route=mtb without a parseable OSM colour — keep in sync with openbikedata-processor MtbRouteColors.ts */
const MTB_ROUTE_DEFAULT_COLOR = "#795548";

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
  ["==", ["get", "osmRouteType"], "mtb"],
  ["coalesce", ["get", "color"], MTB_ROUTE_DEFAULT_COLOR],
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

const isWhiteImbaTrail = [
  "all",
  ["has", "mtbScaleImba"],
  ["match", ["get", "mtbScaleImba"], 0, true, false],
];

/** Casing under dashed MTB core — light gray for white IMBA 0, white otherwise */
const trailCasingLineColor = [
  "case",
  isWhiteImbaTrail,
  "#d4d4d4",
  "#ffffff",
];

const trailImbaLineWidth = [
  "interpolate",
  ["linear"],
  ["zoom"],
  OPENBIKEMAP_LINE_MIN_ZOOM,
  ["case", isWhiteImbaTrail, 1.2, 0.8],
  10,
  ["case", isWhiteImbaTrail, 1.4, 1],
  14,
  ["case", isWhiteImbaTrail, 3.2, 2.8],
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
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    paint: {
      "line-color": "#ffffff",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        OPENBIKEMAP_LINE_MIN_ZOOM,
        1.8,
        10,
        2.5,
        14,
        5.5,
      ],
      "line-opacity": 0.95,
    },
  },
  {
    id: "routes",
    type: "line",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": routeLineColor,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        OPENBIKEMAP_LINE_MIN_ZOOM,
        0.8,
        10,
        1,
        14,
        2.8,
      ],
    },
  },
  {
    id: "routes-label-stripe",
    type: "symbol",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: 11,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name"], ["get", "ref"]],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": routeLineColor,
      "text-halo-color": routeLineColor,
      "text-halo-width": 5,
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
      "text-color": "#212121",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.75,
    },
  },
  {
    id: "trails-casing",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    paint: {
      "line-color": trailCasingLineColor,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        OPENBIKEMAP_LINE_MIN_ZOOM,
        2,
        10,
        3,
        14,
        6.5,
      ],
      "line-opacity": 0.95,
    },
  },
  {
    id: "trails",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": trailLineColor,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        OPENBIKEMAP_LINE_MIN_ZOOM,
        0.8,
        10,
        1,
        14,
        2.8,
      ],
      "line-dasharray": MTB_TRAIL_DASHARRAY,
    },
  },
  {
    id: "trails-imba",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": imbaLineColor,
      "line-width": trailImbaLineWidth,
      "line-dasharray": MTB_TRAIL_DASHARRAY,
    },
  },
  {
    id: "trails-label-stripe",
    type: "symbol",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: 13,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name"], ["get", "ref"]],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": trailLineColor,
      "text-halo-color": trailLineColor,
      "text-halo-width": 5,
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
      "text-size": 12,
    },
    paint: {
      "text-color": "#212121",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.75,
    },
  },
  {
    id: "tappable-trail",
    type: "line",
    source: "openbikemap",
    "source-layer": "trails",
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": ["interpolate", ["linear"], ["zoom"], OPENBIKEMAP_LINE_MIN_ZOOM, 8, 14, 16],
    },
  },
  {
    id: "tappable-route",
    type: "line",
    source: "openbikemap",
    "source-layer": "routes",
    minzoom: OPENBIKEMAP_LINE_MIN_ZOOM,
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": ["interpolate", ["linear"], ["zoom"], OPENBIKEMAP_LINE_MIN_ZOOM, 10, 14, 18],
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
liberty.sources.hillshade = { ...DEM_SOURCE };
insertLayerAfter(liberty.layers, hillshadeLayer, HILLSHADE_AFTER_LAYER_IDS);
liberty.layers.push(peakLabelsLayer, ...bikeLayers);

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
