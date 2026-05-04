import { useState, useEffect, useCallback } from 'react';
import { Entry } from './types';
import { getEntries } from './api/entries';
import { DetailPanel } from './components/DetailPanel';
import { NavBar } from './components/NavBar';
import { LibraryPage } from './pages/LibraryPage';
import { QueuePage } from './pages/QueuePage';
import { PartyPage } from './pages/PartyPage';
import { SettingsPage } from './pages/SettingsPage';
import { useLandscape } from './hooks/useLandscape';
import { useQueue } from './hooks/useQueue';
import './App.css';

type PageId = 'library' | 'queue' | 'party' | 'settings';

function App() {
  const landscape = useLandscape();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [page, setPage] = useState<PageId>('library');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(true);
  const { queue, addToQueue, reorderQueue, dismissFromQueue } = useQueue();
  const [queueToasts, setQueueToasts] = useState<number[]>([]);

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  const handleAddToQueue = useCallback((entry: Entry) => {
    addToQueue(entry);
    if (page !== 'queue') {
      const id = Date.now();
      setQueueToasts(prev => [...prev, id]);
      setTimeout(() => {
        setQueueToasts(prev => prev.filter(t => t !== id));
      }, 1500);
    }
  }, [addToQueue, page]);

  const handleSelect = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setSheetDismissed(false);
  }, []);

  if (entries === null) {
    return (
      <div className="App App--loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <NavBar landscape={landscape} activePage={page} onNavigate={setPage} queueToasts={queueToasts} />
      <div className={`App${landscape && !sheetDismissed ? ' App--panel-open' : ''}`}>
        {page === 'library' && (
          <LibraryPage
            entries={entries}
            onSelect={handleSelect}
            selectedEntryId={selectedEntry?.id ?? null}
            panelOpen={!sheetDismissed}
            onAddToQueue={handleAddToQueue}
          />
        )}
        {page === 'queue' && (
          <QueuePage
            queue={queue}
            onReorder={reorderQueue}
            onDismiss={dismissFromQueue}
            onSelect={handleSelect}
            selectedEntryId={selectedEntry?.id ?? null}
            panelOpen={!sheetDismissed}
          />
        )}
        {page === 'party' && <PartyPage />}
        {page === 'settings' && <SettingsPage />}
        <DetailPanel
          entry={selectedEntry}
          dismissed={sheetDismissed}
          onDismiss={() => setSheetDismissed(true)}
          isLandscape={landscape}
          onAddToQueue={handleAddToQueue}
        />
      </div>
    </>
  );
}

export default App;
