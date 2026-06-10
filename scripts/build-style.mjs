import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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
      "line-color": ["coalesce", ["get", "color"], "#1565c0"],
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
      "text-color": "#1b5e20",
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
      "line-color": ["coalesce", ["get", "color"], "#2e7d32"],
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
      "text-color": "#33691e",
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
