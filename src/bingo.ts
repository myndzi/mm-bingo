import tippy from 'tippy.js';
import { free } from './bingo.data';
import { SeedParams } from './params';
import { genCard, getHorizBits, getVertBits } from './card';

export type CellData = {
  idx: number;
  col: number;
  row: number;
  checkbox: HTMLInputElement;
  label: HTMLSpanElement;
};

const INFO_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
  <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
</svg>
`;

export const TIMESTAMP_DIVISOR = 60_000;

export class Bingo {
  private cells = new Map<HTMLElement, CellData>();

  private constructor(readonly el: HTMLElement, private sp: SeedParams) {}

  private add(el: HTMLDivElement, refs: CellData) {
    this.cells.set(el, refs);
  }

  static init(el: HTMLElement, sp: SeedParams) {
    const card = genCard(`${sp.user.toLowerCase()} ${sp.ts.getTime()}\n`);

    const bingo = new Bingo(el, sp);

    el.querySelectorAll<HTMLDivElement>('div.cell').forEach((el, idx) => {
      const label = el.querySelector<HTMLSpanElement>('span.cell-label');
      if (!label) throw new Error('no span found');

      const checkbox = el.querySelector<HTMLInputElement>(
        'input[type=checkbox]'
      )!;
      if (!checkbox) throw new Error('no checkbox found');

      if (idx === 12) {
        label.textContent = free;
        checkbox.checked = true;
        checkbox.disabled = true;
      } else {
        const next = card.pop();
        if (!next) throw new Error('card size / document cell mismatch');

        label.textContent = next.title;
        if (next.uncommon === true) label.classList.add('uncommon');
        const parent = label.closest('.cell');
        if (next.tip && parent) {
          const infoSpan = document.createElement('span');
          infoSpan.style.position = 'absolute';
          infoSpan.style.height = '1rem';
          infoSpan.style.width = '1rem';
          infoSpan.style.right = '2%';
          infoSpan.style.top = '2%';
          infoSpan.style.pointerEvents = 'none';
          infoSpan.innerHTML = INFO_ICON;
          parent.appendChild(infoSpan);

          tippy(parent, {
            content: next.tip,
            touch: ['hold', 500],
          });
        }

        checkbox.checked = sp.isChecked(idx);
      }

      const refs = {
        idx,
        col: idx % 5,
        row: Math.floor(idx / 5),
        checkbox,
        label,
      };
      bingo.add(el, refs);
    });

    bingo.updateWins();

    const mutable = sp.mutable;
    if (!mutable) {
      el.classList.add('immutable');
    }
    el.addEventListener('change', ev => {
      const target = ev.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.getAttribute('type') !== 'checkbox') return;

      if (!mutable) {
        target.checked = !target.checked;
        ev.preventDefault();
        return;
      }

      bingo.onChanged(target);
    });
  }

  private onChanged(target: HTMLInputElement) {
    const wrap = target.closest<HTMLDivElement>('.grid.card div.cell');
    const refs = wrap && this.cells.get(wrap);
    if (!refs) return;

    const { idx } = refs;
    this.sp.setChecked(idx, target.checked);
    this.updateWins();
  }

  private updateWins() {
    const bits = this.sp.checkedBits();
    const horizBits = getHorizBits(bits);
    const vertBits = getVertBits(bits);

    for (const [parent, refs] of this.cells.entries()) {
      const bit = 1 << (24 - refs.idx);
      if (horizBits & bit) {
        parent.classList.add('win-h');
      } else {
        parent.classList.remove('win-h');
      }

      if (vertBits & bit) {
        parent.classList.add('win-v');
      } else {
        parent.classList.remove('win-v');
      }
    }
  }
}
