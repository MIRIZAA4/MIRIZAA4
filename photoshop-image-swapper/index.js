const { app, core, action, constants } = require("photoshop");

const $ = (id) => document.getElementById(id);
let layers = []; // flattened, non-group layers of the active document

const setStatus = (msg) => { $("status").textContent = msg; };

function collect(list, out = []) {
  for (const l of list) {
    if (l.kind === "group" || (l.layers && l.layers.length)) collect(l.layers, out);
    else out.push(l);
  }
  return out;
}

function targetLayer() {
  const doc = app.activeDocument;
  return doc && doc.activeLayers.length === 1 ? doc.activeLayers[0] : null;
}

function refresh() {
  const menu = $("menu");
  menu.innerHTML = "";
  const doc = app.activeDocument;
  const target = doc && targetLayer();
  $("target").textContent = target ? target.name : "— none —";
  $("go").disabled = true;
  if (!doc || !target) return;

  layers = collect(doc.layers).filter((l) => l.id !== target.id);
  for (const l of layers) {
    const item = document.createElement("sp-menu-item");
    item.setAttribute("value", String(l.id));
    item.textContent = l.name;
    menu.appendChild(item);
  }
  $("go").disabled = layers.length === 0;
  if (!layers.length) setStatus("No other layers in the document.");
}

function boundsOf(layer) {
  const b = layer.bounds;
  return { left: b.left, top: b.top, width: b.right - b.left, height: b.bottom - b.top };
}

// Resize `layer` to fit inside (or stretch to) `box`, then center it there.
async function fitInto(layer, box, stretch) {
  const s = boundsOf(layer);
  const sx = box.width / s.width;
  const sy = box.height / s.height;
  const k = Math.min(sx, sy);
  const [px, py] = stretch ? [sx, sy] : [k, k];
  await layer.scale(px * 100, py * 100, constants.AnchorPosition.TOPLEFT);
  const n = boundsOf(layer);
  await layer.translate(
    box.left + (box.width - n.width) / 2 - n.left,
    box.top + (box.height - n.height) / 2 - n.top
  );
}

async function replace() {
  const doc = app.activeDocument;
  const target = targetLayer();
  const sourceId = Number($("source").value);
  const source = layers.find((l) => l.id === sourceId);
  if (!doc || !target || !source) return setStatus("Pick a layer to replace with.");

  const stretch = $("stretch").checked;
  const keep = $("keep").checked;
  const swap = $("swap").checked;

  try {
    await core.executeAsModal(async () => {
      const targetBox = boundsOf(target);
      const sourceBox = boundsOf(source);

      const dup = await source.duplicate();
      await dup.move(target, constants.ElementPlacement.PLACEBEFORE);
      await fitInto(dup, targetBox, stretch);

      if (swap) {
        await fitInto(target, sourceBox, stretch);
      } else if (keep) {
        target.visible = false;
      } else {
        await target.delete();
      }
    }, { commandName: "Image Swapper: Replace image" });
    setStatus("Done. Undo with Ctrl/Cmd+Z.");
  } catch (e) {
    setStatus("Error: " + e.message);
  }
  refresh();
}

$("go").addEventListener("click", replace);

// Re-read the selection whenever the user clicks a layer/image or the layer list changes.
action.addNotificationListener(
  [{ event: "select" }, { event: "make" }, { event: "delete" }, { event: "open" }, { event: "close" }],
  () => refresh()
);
refresh();
