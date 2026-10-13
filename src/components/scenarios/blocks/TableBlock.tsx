import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

export interface TableBlockData {
  headers?: string[];
  rows?: string[][];
  /** Largeur en px par colonne ; null = largeur automatique. */
  colWidths?: (number | null)[];
}

interface TableBlockProps {
  data: TableBlockData;
  isEditing: boolean;
  onChange: (patch: Partial<TableBlockData>) => void;
}

const MIN_COL_WIDTH = 60;
const AUTO_COL_MIN_WIDTH = 112;
const ACTION_COL_WIDTH = 28;

function autoResize(target: HTMLTextAreaElement) {
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
}

function CellTextarea({
  value,
  width,
  placeholder,
  className,
  onChange,
}: {
  value: string;
  width: number | null;
  placeholder: string;
  className: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current) autoResize(ref.current);
  }, [value, width]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`block w-full resize-none overflow-hidden bg-transparent outline-none whitespace-pre-wrap wrap-break-word ${className}`}
    />
  );
}

export function TableBlock({ data, isEditing, onChange }: TableBlockProps) {
  const headers: string[] = data.headers ?? ["", ""];
  const rows: string[][] = data.rows ?? [["", ""]];
  const colCount = headers.length;
  const savedWidths: (number | null)[] = headers.map((_, i) => data.colWidths?.[i] ?? null);

  // Largeurs pendant le glisser, pour ne pas sauvegarder à chaque pixel.
  const [dragWidths, setDragWidths] = useState<(number | null)[] | null>(null);
  const widths = dragWidths ?? savedWidths;
  const allFixed = widths.every((w) => w !== null);
  const minTableWidth =
    widths.reduce<number>((sum, w) => sum + (w ?? AUTO_COL_MIN_WIDTH), 0) +
    (isEditing ? ACTION_COL_WIDTH : 0);
  const tableStyle = allFixed ? { width: minTableWidth } : { width: "100%", minWidth: minTableWidth };

  const updateHeader = (ci: number, value: string) =>
    onChange({ headers: headers.map((h, i) => (i === ci ? value : h)) });

  const updateCell = (ri: number, ci: number, value: string) =>
    onChange({
      rows: rows.map((row, rIdx) =>
        rIdx === ri ? row.map((cell, cIdx) => (cIdx === ci ? value : cell)) : row,
      ),
    });

  const addRow = () => onChange({ rows: [...rows, Array(colCount).fill("")] });

  const removeRow = (ri: number) => {
    if (rows.length <= 1) return;
    onChange({ rows: rows.filter((_, i) => i !== ri) });
  };

  const addCol = () =>
    onChange({
      headers: [...headers, ""],
      rows: rows.map((row) => [...row, ""]),
      colWidths: [...savedWidths, null],
    });

  const removeCol = () => {
    if (headers.length <= 1) return;
    onChange({
      headers: headers.slice(0, -1),
      rows: rows.map((row) => row.slice(0, -1)),
      colWidths: savedWidths.slice(0, -1),
    });
  };

  const resetWidth = (ci: number) =>
    onChange({ colWidths: savedWidths.map((w, i) => (i === ci ? null : w)) });

  const startResize = (ci: number, e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const th = e.currentTarget.parentElement;
    const table = th?.closest("table");
    if (!th || !table) return;

    // Fige toutes les colonnes à leur largeur affichée pour que seule
    // la colonne glissée change.
    const headerCells = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th")).slice(0, colCount);
    const startWidths = headerCells.map((cell) => Math.round(cell.getBoundingClientRect().width));
    const startX = e.clientX;
    let current = startWidths;
    setDragWidths(startWidths);

    const onMove = (ev: PointerEvent) => {
      const next = Math.max(MIN_COL_WIDTH, Math.round(startWidths[ci] + ev.clientX - startX));
      current = startWidths.map((w, i) => (i === ci ? next : w));
      setDragWidths(current);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragWidths(null);
      onChange({ colWidths: current });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const colgroup = (
    <colgroup>
      {widths.map((w, ci) => (
        <col key={ci} style={w !== null ? { width: w } : undefined} />
      ))}
      {isEditing && <col style={{ width: ACTION_COL_WIDTH }} />}
    </colgroup>
  );

  if (!isEditing) {
    return (
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="table-fixed border-collapse text-[13px]" style={tableStyle}>
          {colgroup}
          <thead>
            <tr className="bg-white/5">
              {headers.map((h, ci) => (
                <th
                  key={ci}
                  className="border border-white/10 px-3 py-2 text-white/80 font-semibold text-left align-top whitespace-pre-wrap wrap-break-word"
                >
                  {h || <span className="text-white/20 italic">—</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-white/3 transition-colors">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border border-white/10 px-3 py-2 text-white/70 align-top whitespace-pre-wrap wrap-break-word"
                  >
                    {cell || <span className="text-white/15">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="table-fixed border-collapse text-[13px]" style={tableStyle}>
          {colgroup}
          <thead>
            <tr className="bg-white/5">
              {headers.map((h, ci) => (
                <th key={ci} className="relative border border-white/10 px-2 py-1 align-top">
                  <CellTextarea
                    value={h}
                    width={widths[ci]}
                    onChange={(value) => updateHeader(ci, value)}
                    placeholder={`En-tête ${ci + 1}`}
                    className="text-white/80 font-semibold text-center placeholder:text-white/20 text-[12px]"
                  />
                  <div
                    onPointerDown={(e) => startResize(ci, e)}
                    onDoubleClick={() => resetWidth(ci)}
                    title="Glisser pour redimensionner · double-clic pour largeur auto"
                    className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-indigo-400/40 transition-colors"
                  />
                </th>
              ))}
              <th className="border border-white/10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-white/10 px-2 py-1 align-top">
                    <CellTextarea
                      value={cell}
                      width={widths[ci]}
                      onChange={(value) => updateCell(ri, ci, value)}
                      placeholder="—"
                      className="text-white/70 placeholder:text-white/15 text-[12px]"
                    />
                  </td>
                ))}
                <td className="border border-white/10 text-center align-top">
                  <button
                    onClick={() => removeRow(ri)}
                    disabled={rows.length <= 1}
                    className="p-1 text-white/20 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Ligne
        </button>
        <button
          onClick={addCol}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Colonne
        </button>
        <button
          onClick={removeCol}
          disabled={headers.length <= 1}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-white/30 hover:text-red-400 border border-white/10 hover:border-red-400/20 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3 h-3" /> Col
        </button>
      </div>
    </div>
  );
}
