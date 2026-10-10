"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import type { WidgetSize } from "./types";

const names: Record<WidgetSize, string> = { "1x1": "Kecil", "2x1": "Sedang", "2x2": "Tinggi", "4x1": "Lebar", "4x2": "Luas" };
const dimensions = (size: WidgetSize) => size.replace("x", "×");
function SizeShape({ size }: { size: WidgetSize }) {
  const [columns, rows] = size.split("x").map(Number);
  return <svg width="32" height="26" viewBox="0 0 40 28" fill="none" aria-hidden="true"><rect x={(40 - columns * 7) / 2} y={(28 - rows * 8) / 2} width={columns * 7} height={rows * 8} rx="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".08" /></svg>;
}

export function WidgetSizePicker({ value, sizes, label, onChange, disabled = false }: { value: WidgetSize; sizes: WidgetSize[]; label: string; onChange: (size: WidgetSize) => void; disabled?: boolean }) {
  return <Dropdown value={value} label={label} disabled={disabled} options={sizes.map(size => ({ value: size, label: names[size], detail: dimensions(size), icon: <SizeShape size={size} /> }))} onChange={size => onChange(size as WidgetSize)} />;
}
