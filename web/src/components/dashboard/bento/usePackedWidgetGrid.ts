"use client";

import { useLayoutEffect, useRef } from "react";

type OccupiedSpace = { column: number; columns: number; top: number; bottom: number };

/** Pack the same card dimensions in both viewing and editing modes. */
export function usePackedWidgetGrid(layoutKey: string) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const items = Array.from(grid.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
    const setStyle = (item: HTMLElement, property: string, value: string) => {
      if (item.style.getPropertyValue(property) !== value) item.style.setProperty(property, value);
    };
    const pack = () => {
      const style = window.getComputedStyle(grid);
      const columns = Math.max(1, parseInt(style.getPropertyValue("--widget-columns"), 10) || 4);
      const gap = parseFloat(style.getPropertyValue("--widget-row-gap")) || 38;
      // Clamp widths before measuring so a previous desktop position cannot
      // create extra columns when the viewport becomes narrower.
      const widths = items.map(item => {
        const width = Math.min(columns, Math.max(1, parseInt(item.dataset.size || "1", 10) || 1));
        setStyle(item, "grid-column-end", `span ${width}`);
        if ((parseInt(item.style.gridColumnStart, 10) || 1) + width - 1 > columns) setStyle(item, "grid-column-start", "auto");
        return width;
      });
      const measurements = items.map((item, index) => ({ item, columns: widths[index], height: Math.max(1, Math.ceil(item.offsetHeight + gap)) }));
      const occupied: OccupiedSpace[] = [];
      for (const measurement of measurements) {
        // Any lowest free slot starts at the top or beneath an existing card.
        const candidates = [...new Set([0, ...occupied.map(space => space.bottom)])].sort((a, b) => a - b);
        let position: OccupiedSpace | undefined;
        for (const top of candidates) {
          for (let column = 0; column <= columns - measurement.columns; column++) {
            const bottom = top + measurement.height;
            const collision = occupied.some(space => column < space.column + space.columns && column + measurement.columns > space.column && top < space.bottom && bottom > space.top);
            if (!collision) { position = { column, columns: measurement.columns, top, bottom }; break; }
          }
          if (position) break;
        }
        if (!position) continue;
        occupied.push(position);
        setStyle(measurement.item, "grid-column-start", String(position.column + 1));
        setStyle(measurement.item, "grid-row-start", String(position.top + 1));
        setStyle(measurement.item, "--widget-row-span", String(measurement.height));
      }
    };
    pack();
    const observer = new ResizeObserver(pack);
    observer.observe(grid);
    for (const item of items) observer.observe(item);
    const sizes = new MutationObserver(pack);
    sizes.observe(grid, { subtree: true, attributes: true, attributeFilter: ["data-size"] });
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) pack(); });
    return () => { mounted = false; observer.disconnect(); sizes.disconnect(); };
  }, [layoutKey]);

  return gridRef;
}
