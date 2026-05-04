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
import './App.css';

type PageId = 'library' | 'queue' | 'party' | 'settings';

function App() {
  const landscape = useLandscape();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [page, setPage] = useState<PageId>('library');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(true);

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

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
      <NavBar landscape={landscape} activePage={page} onNavigate={setPage} />
      <div className={`App${landscape && !sheetDismissed ? ' App--panel-open' : ''}`}>
        {page === 'library' && (
          <LibraryPage
            entries={entries}
            onSelect={handleSelect}
            selectedEntryId={selectedEntry?.id ?? null}
            panelOpen={!sheetDismissed}
          />
        )}
        {page === 'queue' && <QueuePage />}
        {page === 'party' && <PartyPage />}
        {page === 'settings' && <SettingsPage />}
        <DetailPanel
          entry={selectedEntry}
          dismissed={sheetDismissed}
          onDismiss={() => setSheetDismissed(true)}
          isLandscape={landscape}
        />
      </div>
    </>
  );
}

export default App;
