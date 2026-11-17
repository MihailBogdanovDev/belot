import { useState } from 'react';
import { bg } from '../i18n/bg.js';

export function Menu({ onReset }: { onReset(): void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu">
      <button className="menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
        ☰
      </button>
      {open && (
        <div className="menu-pop">
          <button
            onClick={() => {
              setOpen(false);
              if (confirm(bg.resetConfirm)) onReset();
            }}
          >
            {bg.resetTable}
          </button>
        </div>
      )}
    </div>
  );
}
