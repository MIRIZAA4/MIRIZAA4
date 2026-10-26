# Image Swapper (Photoshop UXP plugin)

A panel that lets you replace the image you clicked with another image (layer) from the same document.

## Use
1. In Photoshop: Plugins ▸ Development ▸ open **UXP Developer Tool** ▸ *Add Plugin* ▸ pick `manifest.json` ▸ *Load*.
2. Open **Plugins ▸ Image Swapper**.
3. Use the Move tool with **Auto-Select: Layer** on, and click an image on the canvas — the panel shows it as the selected image.
4. Pick the replacement layer from the dropdown and press **Replace**.

Options: stretch to fill (otherwise fits proportionally, centered), keep the original hidden, or swap the two images.
Everything is one history step — Ctrl/Cmd+Z undoes it.

Note: Photoshop plugins cannot intercept canvas clicks themselves; the panel reacts to the layer selection that your click causes.
