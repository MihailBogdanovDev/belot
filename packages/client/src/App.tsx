import { JoinScreen } from './components/JoinScreen.js';
import { Menu } from './components/Menu.js';
import { useTable } from './net.js';

export function App() {
  const t = useTable();
  const view = t.msg?.view;
  return (
    <div className="app">
      <Menu onReset={t.resetTable} />
      {t.error && <div className="toast">{t.error}</div>}
      {view ? (
        <div className="table-placeholder">
          <div>Table</div>
          <div>phase: {view.phase}</div>
          <div>hand: {view.hand.join(' ')}</div>
        </div>
      ) : (
        <JoinScreen msg={t.msg} connected={t.connected} sit={t.sit} leave={t.leave} />
      )}
    </div>
  );
}
