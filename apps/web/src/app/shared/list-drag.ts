import { signal } from '@angular/core';
import { dropIndex, type RowBox } from '@andthen/core';

/** An item being dragged by its handle. Positions are in viewport pixels. */
export interface DragState {
  id: string;
  pointerId: number;
  from: number;
  to: number;
  startY: number;
  dy: number;
  /** Height of the dragged row, which is how far the rows it passes slide over. */
  height: number;
  /** Where each row sat when the drag started. */
  rows: RowBox[];
  /**
   * Screen pixels per CSS pixel inside the page: above 1 with Larger text, which zooms the
   * page. Pointer positions are in screen pixels, but a translate is in the row's own.
   */
  scale: number;
}

/**
 * Drag-to-reorder for a vertical list, by a handle on each row. The rows slide aside as the
 * picked-up one passes them, and the move is saved on release. Keyboards use up and down
 * buttons instead, so the handle itself stays hidden from screen readers.
 */
export class ListDrag {
  readonly state = signal<DragState | undefined>(undefined);

  constructor(
    /** The list's rows, in order, as they are on screen right now. */
    private readonly rows: () => HTMLElement[],
    /** Saves the move: `by` places up (negative) or down (positive). */
    private readonly drop: (id: string, by: number) => unknown,
    /** Called as a drag starts, e.g. to close an open form. */
    private readonly started?: () => void,
  ) {}

  start(event: PointerEvent, id: string, index: number): void {
    if (this.state() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rows = this.rows();
    const row = rows[index];
    if (!row) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    const boxes = rows.map((r) => {
      const rect = r.getBoundingClientRect();
      return { top: rect.top, bottom: rect.top + rect.height };
    });
    this.started?.();
    this.state.set({
      id,
      pointerId: event.pointerId,
      from: index,
      to: index,
      startY: event.clientY,
      dy: 0,
      height: row.getBoundingClientRect().height,
      rows: boxes,
      scale: row.offsetHeight ? row.getBoundingClientRect().height / row.offsetHeight : 1,
    });
  }

  move(event: PointerEvent): void {
    const drag = this.state();
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dy = event.clientY - drag.startY;
    const to = dropIndex(drag.rows, drag.from, dy);
    this.state.set({ ...drag, dy, to });
  }

  async end(event: PointerEvent, cancelled = false): Promise<void> {
    const drag = this.state();
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.state.set(undefined);
    if (!cancelled && drag.to !== drag.from) {
      await this.drop(drag.id, drag.to - drag.from);
    }
  }

  /** How far a row slides while another one is dragged past it. */
  shift(index: number): string | null {
    const drag = this.state();
    if (!drag) return null;
    const dy = drag.dy / drag.scale;
    const height = drag.height / drag.scale;
    if (index === drag.from) return `translateY(${dy}px)`;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) {
      return `translateY(${-height}px)`;
    }
    if (drag.to < drag.from && index >= drag.to && index < drag.from) {
      return `translateY(${height}px)`;
    }
    return 'translateY(0)';
  }
}
