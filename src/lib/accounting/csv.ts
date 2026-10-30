/**
 * CSV for French spreadsheets: semicolons, CRLF, UTF-8 with a BOM (so Excel
 * reads accents). Cells that a spreadsheet would run as a formula are
 * prefixed with an apostrophe.
 */
export type Cell = string | number | null | undefined;

const NUMBER = /^-?\d+(,\d+)?$/;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? value.toFixed(2).replace(".", ",") : value;
  if (/^[=+\-@\t\r]/.test(s) && !NUMBER.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
