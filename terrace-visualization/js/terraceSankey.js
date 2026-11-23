/** ファイル概要: 各分類に観察原文を配置し、選んだ記録の経路だけを強調する。 */
import { buildTerraceSankey, sankeyRecordTracks, selectSankeyTracks, SANKEY_STAGES } from "./terraceSankeyModel.js?v=20261123-sankey-tracks1";

const W = 590, H = 720, LEFT = 48, RIGHT = 18, TOP = 19, ROW_GAP = 184;
const LABEL_DEPTH = 126, GROUP_GAP = 7;
const tierY = (stage) => TOP + (3 - stage) * ROW_GAP;

function svgNode(name, attrs = {}, label) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (label) node.textContent = label;
  return node;
}

function renderChart(layout, graph, mount, tooltip) {
  const { labels, tracks } = sankeyRecordTracks(graph);
  const nodes = graph.links.length ? layout()
    .nodeId(({ id }) => id).nodeAlign(({ stage }) => stage).nodeWidth(3).nodePadding(10)
    .nodeSort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ja"))
    .extent([[H - tierY(0) - 3, LEFT], [H - TOP, W - RIGHT]])(graph).nodes : graph.nodes;
  const chart = svgNode("svg", { viewBox: `0 0 ${W} ${H}`, class: "sankey-chart",
    "aria-label": "観察記録：人・場所・行動・感じたこと" });
  const defs = svgNode("defs"), lines = svgNode("g"), rows = svgNode("g");
  chart.append(defs, lines, rows);
  const ports = new Map(), trackPaths = new Map(), items = [];
  const inkAreas = [], flowSamples = [];
  const groups = new Map();
  for (const label of labels.values()) {
    if (!groups.has(label.category)) groups.set(label.category, []);
    groups.get(label.category).push(label);
  }
  for (const track of tracks) for (const id of track.labels) {
    if (!ports.has(id)) ports.set(id, { tracks: new Map() });
    const connections = ports.get(id).tracks;
    connections.set(track.id, connections.size);
  }

  let pinned = null;
  function labelAt(element, value) {
    tooltip.textContent = value;
    tooltip.hidden = !value;
    if (!value) return;
    const rect = element.getBoundingClientRect(), { width, height } = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(6, Math.min(innerWidth - width - 6, rect.left + (rect.width - width) / 2))}px`;
    tooltip.style.top = `${rect.top - height - 8 > 6 ? rect.top - height - 8 : rect.bottom + 8}px`;
  }
  function show(item) {
    const selected = selectSankeyTracks(tracks, item);
    const ids = new Set(selected.map(({ id }) => id));
    const activeLabels = new Set(selected.flatMap(({ labels }) => labels));
    chart.classList.toggle("is-filtered", Boolean(item));
    for (const [id, path] of trackPaths) {
      const related = Boolean(item) && ids.has(id);
      path.classList.toggle("is-related", related);
    }
    for (const { element, id, kind } of items) {
      element.classList.toggle("is-related", kind === "node" ? item?.kind === "node" && item.id === id : Boolean(item) && activeLabels.has(id));
      element.setAttribute("aria-pressed", String(pinned?.id === id));
    }
  }
  function wire(element, item, label, focusable = true) {
    const preview = () => {
      if (label) labelAt(element, label);
      if (!pinned) show(item);
    };
    const leave = () => { tooltip.hidden = true; show(pinned); };
    const select = () => {
      pinned = pinned?.id === item.id && pinned.kind === item.kind ? null : item;
      if (label) labelAt(element, label);
      show(pinned);
    };
    element.addEventListener("pointerenter", (event) => { if (event.pointerType !== "touch") preview(); });
    element.addEventListener("pointerleave", leave);
    element.addEventListener("click", select);
    if (!focusable) return;
    element.addEventListener("focus", preview);
    element.addEventListener("blur", leave);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); }
    });
    items.push({ ...item, element });
  }
  function clear() { pinned = null; tooltip.hidden = true; show(null); }
  chart.addEventListener("click", (event) => {
    if (!event.target.closest(".sankey-node, .sankey-phrase, .sankey-record-track")) clear();
  });
  chart.addEventListener("keydown", (event) => { if (event.key === "Escape") clear(); });

  for (const [stage, heading] of SANKEY_STAGES.entries()) {
    const tier = nodes.filter((node) => node.stage === stage).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ja"));
    const rail = tier[0]?.x1 ? H - tier[0].x1 : tierY(stage);
    rows.append(svgNode("text", { x: 7, y: rail + 4, class: "sankey-stage-label" }, heading));
    const stageGroups = tier.map((node) => ({ node, labels: (groups.get(node.id) ?? []).map((label) => {
      const glyphs = [...label.text], half = Math.ceil(glyphs.length / 2);
      const columns = stage === 0 && glyphs.length > 9 ? [glyphs.slice(0, half).join(""), glyphs.slice(half).join("")] : [label.text];
      return { ...label, columns };
    }) }));
    const groupWidth = (children) => Math.max(1, children.reduce((sum, child) => sum + child.columns.length, 0));
    const units = stageGroups.reduce((sum, group) => sum + groupWidth(group.labels), 0);
    const unit = Math.min(17, (W - LEFT - RIGHT - GROUP_GAP * Math.max(0, tier.length - 1)) / Math.max(1, units));
    const font = Math.min(8.8, unit * 0.82);
    let x = LEFT + (W - LEFT - RIGHT - unit * units - GROUP_GAP * Math.max(0, tier.length - 1)) / 2;
    for (const { node, labels: children } of stageGroups) {
      const width = groupWidth(children) * unit;
      const category = svgNode("g", { class: "sankey-node", tabindex: 0, role: "button", "aria-pressed": "false",
        "aria-label": `${heading}：${node.label}` });
      category.append(svgNode("rect", { x, y: rail - 3, width, height: 11, fill: "transparent" }),
        svgNode("rect", { x, y: rail, width: children.length ? width : Math.min(8, width), height: 3,
          fill: node.color, opacity: children.length ? 1 : 0.45, class: "sankey-node-bar", "pointer-events": "none" }));
      wire(category, { id: node.id, kind: "node" }, node.label);
      rows.append(category);
      for (const child of children) {
        const block = unit * child.columns.length, port = ports.get(child.id);
        Object.assign(port, { x: x + block / 2, width: block, rail, color: node.color });
        if (child.text) {
          const raw = svgNode("g", { class: "sankey-phrase", tabindex: 0, role: "button", "aria-pressed": "false",
            "aria-label": `${heading} 原文：${child.text}` });
          const height = Math.min(LABEL_DEPTH, Math.max(...child.columns.map((column) => [...column].length)) * font) + 9;
          raw.append(svgNode("rect", { x, y: rail + 8, width: block, height, fill: "transparent" }));
          if (stage > 0) {
            const left = x + (unit - font) / 2 - 0.8;
            raw.append(svgNode("rect", { x: left, y: rail + 10, width: font + 1.6, height: height - 3,
              class: "sankey-phrase-scrim", rx: 1, "pointer-events": "none" }));
            inkAreas.push({ raw, left, right: left + font + 1.6, top: rail + 10, bottom: rail + 7 + height });
          }
          child.columns.forEach((column, index) => {
            const textAttrs = {
              x: x + block - unit * (index + 0.5), y: rail + 12, "font-size": font,
              class: "sankey-phrase-label", "pointer-events": "none",
            };
            if ([...column].length * font > LABEL_DEPTH) Object.assign(textAttrs, { textLength: LABEL_DEPTH, lengthAdjust: "spacingAndGlyphs" });
            raw.append(svgNode("text", textAttrs, column));
          });
          wire(raw, { id: child.id, kind: "label" }, child.text);
          rows.append(raw);
        }
        x += block;
      }
      if (!children.length) x += width;
      x += GROUP_GAP;
    }
  }
  const paints = new Map(), meshMasks = new Map();
  const mesh = svgNode("pattern", { id: "terrace-sankey-mesh", patternUnits: "userSpaceOnUse", width: 4, height: 4 });
  mesh.append(svgNode("path", { d: "M4 0H0V4", fill: "none", stroke: "#d6f4f0", "stroke-width": 0.55 }));
  defs.append(mesh);
  function gradient(id, y0, y1, stops) {
    const paint = svgNode("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: 0, x2: 0, y1: y0, y2: y1 });
    for (const [offset, color, opacity] of stops) paint.append(svgNode("stop", {
      offset, "stop-color": color, "stop-opacity": opacity,
    }));
    defs.append(paint);
  }
  for (const track of tracks) {
    const group = svgNode("g", { class: "sankey-record-track" });
    for (let stage = 0; stage < track.labels.length - 1; stage++) {
      const a = ports.get(track.labels[stage]), b = ports.get(track.labels[stage + 1]);
      const at = (port) => port.x + port.width * 0.78 * ((port.tracks.get(track.id) + 0.5) / port.tracks.size - 0.5);
      const x0 = at(a), x1 = at(b), y0 = a.rail, y1 = b.rail + 3, mid = (y0 + y1) / 2;
      for (let i = 1; i < 16; i++) {
        const t = i / 16, s = 1 - t;
        const x = x0 + (x1 - x0) * t * t * (3 - 2 * t);
        const y = s ** 3 * y0 + 3 * s * t * mid + t ** 3 * y1;
        flowSamples.push({ x, y, radius: stage === 0 ? 1 : stage === 1 ? 2 : 4 });
      }
      const key = `${stage}/${a.color}/${b.color}`;
      if (!paints.has(key)) {
        const id = `terrace-sankey-flow-${paints.size}`;
        gradient(id, y0, y1, [["0%", a.color, 1], ["100%", b.color, 1]]);
        paints.set(key, `url(#${id})`);
      }
      const paint = paints.get(key);
      const center = `M${x0},${y0}C${x0},${mid} ${x1},${mid} ${x1},${y1}`;
      if (stage === 0) {
        group.append(svgNode("path", { d: center, stroke: paint, class: "sankey-spine" }));
        continue;
      }
      const start = stage === 1 ? 0.25 : 1.05;
      const end = stage === 1 ? 1.25 : Math.min(4.7, Math.max(2, b.width * 0.35 / Math.sqrt(b.tracks.size)));
      const ribbon = `M${x0-start},${y0}C${x0-start},${mid} ${x1-end},${mid} ${x1-end},${y1}L${x1+end},${y1}C${x1+end},${mid} ${x0+start},${mid} ${x0+start},${y0}Z`;
      if (!meshMasks.has(stage)) {
        const id = `terrace-sankey-weave-${stage}`;
        gradient(`${id}-fade`, y0, y1, [["0%", "#fff", 0], [stage === 1 ? "60%" : "20%", "#fff", 0],
          ["100%", "#fff", stage === 1 ? 0.32 : 0.94]]);
        const mask = svgNode("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: y1, width: W, height: y0 - y1 });
        mask.append(svgNode("rect", { x: 0, y: y1, width: W, height: y0 - y1, fill: `url(#${id}-fade)` }));
        defs.append(mask);
        meshMasks.set(stage, `url(#${id})`);
      }
      group.append(svgNode("path", { d: ribbon, fill: paint, class: "sankey-ribbon" }),
        svgNode("path", { d: ribbon, fill: "url(#terrace-sankey-mesh)", mask: meshMasks.get(stage), class: "sankey-weave" }));
    }
    wire(group, { id: track.id, kind: "track" }, track.labels.map((id) => labels.get(id).text).filter(Boolean).join("、"), false);
    trackPaths.set(track.id, group);
    lines.append(group);
  }
  // Use alternate ink where neighboring curves create a bright background.
  for (const { raw, left, right, top, bottom } of inkAreas) {
    let overlap = 0;
    for (const { x, y, radius } of flowSamples) {
      if (y >= top && y <= bottom && x + radius >= left && x - radius <= right && ++overlap >= 12) {
        raw.classList.add("is-over-flow");
        break;
      }
    }
  }
  mount.replaceChildren(chart);
}

export function createTerraceSankey(root) {
  const mount = root.querySelector(".sankey-mount");
  const tooltip = root.querySelector(".sankey-tooltip");
  let library, revision = 0;
  function status(text) {
    const label = document.createElement("p");
    label.className = "sankey-status";
    label.textContent = text;
    mount.replaceChildren(label);
  }
  return {
    async update(records, catalog) {
      const current = ++revision;
      const graph = buildTerraceSankey(records, catalog);
      tooltip.hidden = true;
      if (!library) status("サンキー図を読み込み中");
      library ??= import("https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/+esm");
      try {
        const { sankey } = await library;
        if (current === revision) renderChart(sankey, graph, mount, tooltip);
      } catch (error) {
        library = null;
        if (current === revision) status("サンキー図を表示できませんでした");
        console.warn("Terrace Sankey unavailable", error);
      }
    },
    show(visible) { root.hidden = !visible; if (!visible) tooltip.hidden = true; },
    unavailable() { status("観察データを読み込めませんでした"); },
  };
}
