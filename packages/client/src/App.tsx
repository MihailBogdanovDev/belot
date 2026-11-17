import { JoinScreen } from './components/JoinScreen.js';
import { Table } from './components/Table.js';
import { Menu } from './components/Menu.js';
import { BOT_ENABLED, DevBot } from './devBot.js';
import { useTable } from './net.js';

export function App() {
  const t = useTable();
  const view = t.msg?.view;
  return (
    <div className="app">
      <Menu onReset={t.resetTable} />
      {t.error && <div className="toast">{t.error}</div>}
      {BOT_ENABLED && view && <DevBot view={view} act={t.act} />}
      {view ? (
        <Table msg={t.msg!} act={t.act} />
      ) : (
        <JoinScreen msg={t.msg} connected={t.connected} sit={t.sit} leave={t.leave} />
      )}
    </div>
  );
}
