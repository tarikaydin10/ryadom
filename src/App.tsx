import { useEffect, useState, useSyncExternalStore } from 'react';
import { TabBar, type TabId } from './components/TabBar';
import { Today } from './screens/Today';
import { Us } from './screens/Us';
import { Map } from './screens/Map';
import { Chronicle } from './screens/Chronicle';
import { Lock } from './screens/Lock';
import { isUnlocked, subscribePair } from './data/pair';
import { startSync, subscribeSync } from './data/sync';
import { refreshBadge } from './data/badge';
import { useNightPaper } from './lib/paper';
import { useNow } from './lib/hooks';
import { getPair } from './data/pair';
import { cityOf } from './data/settings';
import { prefetchDays } from './sky/engine';

function useUnlocked(): boolean {
  return useSyncExternalStore(subscribePair, isUnlocked, () => true);
}

export function App() {
  const [tab, setTab] = useState<TabId>('today');
  const unlocked = useUnlocked();
  const [, force] = useState(0);
  const now = useNow();
  // The paper follows the sun of the city this phone is in; before unlocking
  // nobody knows which, and the lock screen reads in daylight.
  useNightPaper(cityOf(getPair()?.member ?? 'a'), unlocked ? now : 0);

  useEffect(() => {
    if (!unlocked) return;
    // Sun and moon for the coming week, built while the phone is idle, so a
    // midnight rollover or a scrub into tomorrow never stalls a frame.
    prefetchDays(Date.now(), 6);
    const stopSync = startSync();
    // The icon's dot follows the store: whatever the courier brings — her
    // answer, the acknowledgement of yours — the badge is re-read from what
    // is now true rather than from what the push said.
    const stopBadge = subscribeSync(() => void refreshBadge());
    return () => {
      stopBadge();
      stopSync();
    };
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
      {tab === 'today' && <Today />}
      {tab === 'map' && <Map />}
      {tab === 'chronicle' && <Chronicle />}
      {tab === 'us' && <Us />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
