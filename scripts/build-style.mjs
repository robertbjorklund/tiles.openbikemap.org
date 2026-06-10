import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MTB_TRAIL_COLOR_GREEN = "#2e7d32";
const MTB_TRAIL_COLOR_BLUE = "#1565c0";
const MTB_TRAIL_COLOR_RED = "#d32f2f";
const MTB_TRAIL_COLOR_BLACK = "#000000";
const TRAIL_COLOR_OTHER = "#7b1fa2";

const ROUTE_PAVED_COLOR_0_20 = "#795548";
const ROUTE_PAVED_COLOR_21_40 = "#a1887f";
const ROUTE_PAVED_COLOR_41_60 = "#7d9471";
const ROUTE_PAVED_COLOR_61_80 = "#607d8b";
const ROUTE_PAVED_COLOR_81_100 = "#9e9e9e";
const ROUTE_PAVED_COLOR_UNKNOWN = "#bdbdbd";

const routeLineColor = [
  "case",
  ["!", ["has", "pavedRatio"]],
  ROUTE_PAVED_COLOR_UNKNOWN,
  ["<=", ["get", "pavedRatio"], 0.2],
  ROUTE_PAVED_COLOR_0_20,
  ["<=", ["get", "pavedRatio"], 0.4],
  ROUTE_PAVED_COLOR_21_40,
  ["<=", ["get", "pavedRatio"], 0.6],
  ROUTE_PAVED_COLOR_41_60,
  ["<=", ["get", "pavedRatio"], 0.8],
  ROUTE_PAVED_COLOR_61_80,
  ROUTE_PAVED_COLOR_81_100,
];

const trailLineColor = [
  "case",
  ["!=", ["get", "category"], "mtb_trail"],
  TRAIL_COLOR_OTHER,
  ["!", ["has", "mtbScale"]],
  TRAIL_COLOR_OTHER,
  ["<=", ["get", "mtbScale"], 1],
  MTB_TRAIL_COLOR_GREEN,
  ["==", ["get", "mtbScale"], 2],
  MTB_TRAIL_COLOR_BLUE,
  ["==", ["get", "mtbScale"], 3],
  MTB_TRAIL_COLOR_RED,
  MTB_TRAIL_COLOR_BLACK,
];

const libertyUrl = "https://tiles.openfreemap.org/styles/liberty";
const liberty = await fetch(libertyUrl).then((r) => r.json());

liberty.name = "OpenBikeMap Terrain";
liberty.sources.openbikemap = {
  type: "vector",
  url: "mbtiles://openbikemap",
};

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

liberty.layers.push(...bikeLayers);

mkdirSync(join(root, "styles"), { recursive: true });
writeFileSync(
  join(root, "styles", "terrain.json"),
  JSON.stringify(liberty, null, 2),
);
console.log("Wrote styles/terrain.json");
