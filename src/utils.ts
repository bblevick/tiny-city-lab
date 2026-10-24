export const $ = <T extends HTMLElement = HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
};
export function download(data: Blob | string, name: string) {
  const url = typeof data === "string" ? data : URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  if (typeof data !== "string")
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function saveJSON(data: unknown, name: string) {
  download(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    name,
  );
}
export const clamp = (x: number, min: number, max: number) =>
  Math.min(max, Math.max(min, x));
