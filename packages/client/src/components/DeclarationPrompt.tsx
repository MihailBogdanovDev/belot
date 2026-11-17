import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card as CardId, Declaration } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { Card } from './Card.js';

export function DeclarationPrompt(props: PromptProps) {
  return createPortal(<PromptBody {...props} />, document.body);
}

interface PromptProps {
  card: CardId;
  declarations: Declaration[];
  askBelot: boolean;
  onConfirm(ids: string[], belot: boolean): void;
  onCancel(): void;
}

function PromptBody({
  card,
  declarations,
  askBelot,
  onConfirm,
  onCancel,
}: PromptProps) {
  const [ticked, setTicked] = useState<string[]>([]);
  const [belot, setBelot] = useState(false);
  const taken = new Set(declarations.filter((d) => ticked.includes(d.id)).flatMap((d) => d.cards));
  const blocked = (d: Declaration) => !ticked.includes(d.id) && d.cards.some((c) => taken.has(c));
  const toggle = (id: string) => setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  // Belot only: answer directly.
  if (declarations.length === 0) {
    return (
      <div className="modal-back" onClick={onCancel}>
        <div className="panel prompt" onClick={(e) => e.stopPropagation()}>
          <div className="panel-title">{bg.belotQ}</div>
          <div className="prompt-card">
            <Card card={card} size="sm" />
          </div>
          <div className="prompt-actions">
            <button className="primary" onClick={() => onConfirm([], true)}>
              {bg.yes}
            </button>
            <button onClick={() => onConfirm([], false)}>{bg.no}</button>
            <button className="ghost" onClick={onCancel}>
              {bg.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-back" onClick={onCancel}>
      <div className="panel prompt" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">{bg.declareQ}</div>
        <div className="prompt-list">
          {declarations.map((d) => (
            <label key={d.id} className={`prompt-decl${blocked(d) ? ' blocked' : ''}`}>
              <input
                type="checkbox"
                checked={ticked.includes(d.id)}
                disabled={blocked(d)}
                onChange={() => toggle(d.id)}
              />
              <span className="prompt-kind">
                {bg.decl[d.kind]} ({d.points})
              </span>
              <span className="prompt-cards">
                {d.cards.map((c) => (
                  <Card key={c} card={c} size="xs" />
                ))}
              </span>
            </label>
          ))}
        </div>
        {askBelot && (
          <label className="prompt-decl">
            <input type="checkbox" checked={belot} onChange={() => setBelot((b) => !b)} />
            <span className="prompt-kind">{bg.belotQ}</span>
          </label>
        )}
        <div className="prompt-actions">
          <button className="primary" onClick={() => onConfirm(ticked, belot)}>
            {bg.play}
          </button>
          <button className="ghost" onClick={onCancel}>
            {bg.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
