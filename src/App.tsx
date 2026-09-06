import { useEffect, useState, useSyncExternalStore } from 'react';
import { TabBar, type TabId } from './components/TabBar';
import { Today } from './screens/Today';
import { Us } from './screens/Us';
import { Map } from './screens/Map';
import { Chronicle } from './screens/Chronicle';
import { Lock } from './screens/Lock';
import { isUnlocked, subscribePair } from './data/pair';
import { startSync } from './data/sync';
import { prefetchDays } from './sky/engine';

function useUnlocked(): boolean {
  return useSyncExternalStore(subscribePair, isUnlocked, () => true);
}

export function App() {
  const [tab, setTab] = useState<TabId>('today');
  const unlocked = useUnlocked();
  const [, force] = useState(0);

  useEffect(() => {
    if (!unlocked) return;
    // Sun and moon for the coming week, built while the phone is idle, so a
    // midnight rollover or a scrub into tomorrow never stalls a frame.
    prefetchDays(Date.now(), 6);
    return startSync();
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div className="app">
        <Lock onUnlocked={() => force((n) => n + 1)} />
      </div>
    );
  }

  return (
    <div className="app">
      {tab === 'today' && <Today onAsk={() => setTab('chronicle')} />}
      {tab === 'map' && <Map />}
      {tab === 'chronicle' && <Chronicle />}
      {tab === 'us' && <Us />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
