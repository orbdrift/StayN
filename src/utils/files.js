// Reads an uploaded file into { name, type, size, url } so it can be previewed and saved.
// The free Firebase plan has no Cloud Storage, so the file is saved as text inside the Firestore document
// (limit 1 MB per document). Photos are shrunk to about 900 px wide first; PDFs must be small.
export const MAX_FILE_MB = 5;
export const MAX_PDF_KB = 300;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf"];

export function checkFile(file, { allowPdf = false } = {}) {
  const allowed = allowPdf ? DOC_TYPES : IMAGE_TYPES;
  if (!allowed.includes(file.type)) return `${file.name}: use a ${allowPdf ? "JPG, PNG, WEBP or PDF" : "JPG, PNG or WEBP"} file.`;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `${file.name}: the file is over ${MAX_FILE_MB} MB.`;
  if (file.type === "application/pdf" && file.size > MAX_PDF_KB * 1024) return `${file.name}: a PDF must be under ${MAX_PDF_KB} KB. Upload a photo of the document instead.`;
  return "";
}

const shrink = (file, maxWidth = 900, quality = 0.65) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const url = canvas.toDataURL("image/jpeg", quality);
      resolve({ name: file.name, type: "image/jpeg", size: Math.round(url.length * 0.75), url });
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(`Could not read ${file.name}.`)); };
    img.src = objectUrl;
  });

export const readFile = (file, { maxWidth } = {}) =>
  file.type.startsWith("image/")
    ? shrink(file, maxWidth)
    : new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    });
