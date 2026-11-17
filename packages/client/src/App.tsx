import { JoinScreen } from './components/JoinScreen.js';
import { Table } from './components/Table.js';
import { Menu } from './components/Menu.js';
import { BOT_ENABLED, DevBot } from './devBot.js';
import { bg } from './i18n/bg.js';
import { useTable } from './net.js';

export function App() {
  const t = useTable();
  const view = t.msg?.view;
  return (
    <div className="app">
      {t.msg?.mySeat != null && <Menu onReset={t.resetTable} />}
      {view && !t.connected && <div className="toast conn">{bg.connecting}</div>}
      {t.error && <div className="toast">{t.error}</div>}
      {BOT_ENABLED && view && <DevBot view={view} act={t.act} />}
      {view ? (
        <Table msg={t.msg!} act={t.act} />
      ) : (
        <JoinScreen msg={t.msg} connected={t.connected} sit={t.sit} leave={t.leave} addBot={t.addBot} removeBot={t.removeBot} />
      )}
    </div>
  );
}
