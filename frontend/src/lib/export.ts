import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

// Dark page background to match the command-center shell behind the cards.
const BG = "#0a0b0f";
const OPTS = { backgroundColor: BG, pixelRatio: 2, cacheBust: true };

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function exportNodeAsPng(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, OPTS);
  triggerDownload(dataUrl, `${filename}.png`);
}

export async function exportNodeAsJpeg(node: HTMLElement, filename: string) {
  const dataUrl = await toJpeg(node, { ...OPTS, quality: 0.95 });
  triggerDownload(dataUrl, `${filename}.jpeg`);
}

export async function exportNodeAsPdf(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, OPTS);
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image decode failed"));
  });
  const orientation = img.width >= img.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [img.width, img.height] });
  pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
  pdf.save(`${filename}.pdf`);
}

export type ExportFormat = "png" | "jpeg" | "pdf";

export async function exportNode(
  node: HTMLElement,
  filename: string,
  format: ExportFormat
) {
  if (format === "png") return exportNodeAsPng(node, filename);
  if (format === "jpeg") return exportNodeAsJpeg(node, filename);
  return exportNodeAsPdf(node, filename);
}
