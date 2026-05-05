import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { usePeer } from './hooks/usePeer';
import { useGossip } from './hooks/useGossip';
import { useSongPassword } from './hooks/useSongPassword';
import './App.css';
import './pages/PartyPage.css';

type PageId = 'library' | 'queue' | 'party' | 'settings';

function App() {
  const landscape = useLandscape();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [page, setPage] = useState<PageId>('library');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(true);
  const { queue, addToQueue, reorderQueue, dismissFromQueue, enterParty, leaveParty, currentMode, getSyncUpdate, applyRemoteUpdate, setOnLocalUpdate } = useQueue();
  const [queueToasts, setQueueToasts] = useState<number[]>([]);
  const { password } = useSongPassword();

  // ── Peer / Gossip ────────────────────────────────────────────────────────
  const gossipRef = useRef<ReturnType<typeof useGossip> | null>(null);

  const {
    peerId,
    connectedPeers,
    connect,
    disconnectAll,
    send,
    getPeerIds,
  } = usePeer((from, message) => {
    switch (message.type) {
      case 'GOSSIP':
        gossipRef.current?.receive(message.message, from);
        break;
        case 'PEER_LIST_REQUEST': {
          const peers = getPeerIds();
          send(from, {
            type: 'GOSSIP',
            message: {
              id: crypto.randomUUID(),
              type: 'PEER_LIST',
              payload: { peers },
            },
          });
          break;
        }
        case 'CRDT_SYNC':
          applyRemoteUpdate(message.update);
          break;
        case 'CRDT_UPDATE':
          applyRemoteUpdate(message.update);
          break;
    }
  });

  const gossip = useGossip(send, connect, getPeerIds, peerId);
  gossipRef.current = gossip;

  // ── Local yjs update → broadcast as CRDT_UPDATE to all peers ─────────────
  const connectedPeersRef = useRef(connectedPeers);
  connectedPeersRef.current = connectedPeers;

  const broadcastUpdate = useCallback((encoded: string) => {
    for (const id of connectedPeersRef.current) {
      send(id, { type: 'CRDT_UPDATE', update: encoded });
    }
  }, [send]);

  useEffect(() => {
    setOnLocalUpdate(broadcastUpdate);
    return () => setOnLocalUpdate(null);
  }, [setOnLocalUpdate, broadcastUpdate]);

  // ── CRDT initial sync to newly connected peers ───────────────────────────
  const syncedPeersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (currentMode === 'solo') {
      syncedPeersRef.current = new Set();
    }
  }, [currentMode]);

  useEffect(() => {
    if (currentMode !== 'party') return;
    const synced = syncedPeersRef.current;

    for (const id of connectedPeers) {
      if (!synced.has(id)) {
        synced.add(id);
        const state = getSyncUpdate();
        if (state) {
          send(id, { type: 'CRDT_SYNC', update: state });
        }
      }
    }
  }, [connectedPeers, currentMode, getSyncUpdate, send]);

  // ── Party state ──────────────────────────────────────────────────────────
  const [partyId, setPartyId] = useState<string | null>(
    () => sessionStorage.getItem('song-book:party-id')
  );
  const [dialogVisible, setDialogVisible] = useState(false);
  const [switchPartyDialogVisible, setSwitchPartyDialogVisible] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningStep, setJoiningStep] = useState<'idle' | 'connecting' | 'requesting'>('idle');
  const joinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPeerIdRef = useRef<string | null>(null);
  const joinStateRef = useRef<{ partyId: string; peerId: string } | null>(null);
  const switchPartyRef = useRef<{ partyId: string; peerId: string } | null>(null);
  const joinedRef = useRef(false);

  // ── Create party flow ────────────────────────────────────────────────────
  const startParty = useCallback((copySolo: boolean) => {
    const id = crypto.randomUUID();
    setPartyId(id);
    setDialogVisible(false);
    enterParty(id, copySolo);
  }, [enterParty]);

  // ── Join flow ────────────────────────────────────────────────────────────
  const executeJoin = useCallback((joinPartyId: string, initialPeerId: string, copySolo: boolean) => {
    joinStateRef.current = null;
    initialPeerIdRef.current = initialPeerId;
    setDialogVisible(false);
    joinedRef.current = false;
    setJoinError(null);
    if (joinBroadcastTimerRef.current) {
      clearTimeout(joinBroadcastTimerRef.current);
      joinBroadcastTimerRef.current = null;
    }

    sessionStorage.setItem('song-book:party-id', joinPartyId);
    enterParty(joinPartyId, copySolo);
    setPartyId(joinPartyId);

    setJoiningStep('connecting');
    connect(initialPeerId);

    joinTimerRef.current = setTimeout(() => {
      setJoinError('Party not found');
      setJoiningStep('idle');
      leaveParty();
      disconnectAll();
      setPartyId(null);
      sessionStorage.removeItem('song-book:party-id');
    }, 5000);
  }, [connect, enterParty, leaveParty, disconnectAll]);

  const initiateJoin = useCallback((joinPartyId: string, initialPeerId: string) => {
    if (queue.length > 0) {
      joinStateRef.current = { partyId: joinPartyId, peerId: initialPeerId };
      setDialogVisible(true);
    } else {
      executeJoin(joinPartyId, initialPeerId, false);
    }
  }, [queue.length, executeJoin]);

  // ── URL parsing on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPartyId = params.get('party');
    const urlPeerId = params.get('peer');

    if (!urlPartyId || !urlPeerId) return;

    const currentStoredPartyId = sessionStorage.getItem('song-book:party-id');

    if (!currentStoredPartyId) {
      params.delete('party');
      params.delete('peer');
      const search = params.toString();
      const newUrl = search
        ? `${window.location.pathname}?${search}`
        : window.location.pathname;
      window.history.replaceState(null, '', newUrl);

      sessionStorage.setItem('song-book:party-id', urlPartyId);
      initiateJoin(urlPartyId, urlPeerId);
    } else if (currentStoredPartyId !== urlPartyId) {
      switchPartyRef.current = { partyId: urlPartyId, peerId: urlPeerId };
      setSwitchPartyDialogVisible(true);
    } else {
      params.delete('party');
      params.delete('peer');
      const search = params.toString();
      const newUrl = search
        ? `${window.location.pathname}?${search}`
        : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Connected peer detection → PEER_LIST_REQUEST ─────────────────────────
  useEffect(() => {
    if (joiningStep !== 'connecting') return;
    const initialPeerId = initialPeerIdRef.current;
    if (!initialPeerId) return;

    if (connectedPeers.includes(initialPeerId)) {
      if (joinTimerRef.current) {
        clearTimeout(joinTimerRef.current);
        joinTimerRef.current = null;
      }

      setJoiningStep('requesting');
      send(initialPeerId, { type: 'PEER_LIST_REQUEST' });
    }
  }, [joiningStep, connectedPeers, send]);

  // ── JOIN broadcast ───────────────────────────────────────────────────────
  useEffect(() => {
    if (joiningStep !== 'requesting') return;
    if (joinedRef.current) return;
    joinedRef.current = true;

    joinBroadcastTimerRef.current = setTimeout(() => {
      if (peerId && partyId) {
        gossip.broadcast({
          id: crypto.randomUUID(),
          type: 'JOIN',
          payload: { peerId, partyId },
        });
      }
      setJoiningStep('idle');
    }, 500);
  }, [joiningStep, peerId, partyId, gossip]);

  // ── Cleanup timeouts on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (joinTimerRef.current) {
        clearTimeout(joinTimerRef.current);
      }
      if (joinBroadcastTimerRef.current) {
        clearTimeout(joinBroadcastTimerRef.current);
      }
    };
  }, []);

  // ── Start / Leave handlers ───────────────────────────────────────────────
  const handleStartClick = useCallback(() => {
    if (currentMode !== 'solo') return;
    if (queue.length > 0) {
      setDialogVisible(true);
    } else {
      startParty(false);
    }
  }, [currentMode, queue.length, startParty]);

  const handleLeave = useCallback(() => {
    disconnectAll();
    leaveParty();
    setPartyId(null);
    setJoiningStep('idle');
    setJoinError(null);
    joinedRef.current = false;
    if (joinBroadcastTimerRef.current) {
      clearTimeout(joinBroadcastTimerRef.current);
      joinBroadcastTimerRef.current = null;
    }
  }, [disconnectAll, leaveParty]);

  const handleClearError = useCallback(() => {
    setJoinError(null);
    setJoiningStep('idle');
    sessionStorage.removeItem('song-book:party-id');
  }, []);

  const url = useMemo(() => {
    const search = new URLSearchParams();
    if (password) search.set('pw', password);
    if (partyId) search.set('party', partyId);
    if (peerId) search.set('peer', peerId);
    return `${window.location.origin}${window.location.pathname}?${search}`;
  }, [password, partyId, peerId]);

  const peerCount = connectedPeers.length + 1;

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
        {page === 'party' && (
          <PartyPage
            currentMode={currentMode}
            partyId={partyId}
            joinError={joinError}
            joiningStep={joiningStep}
            peerId={peerId}
            url={url}
            peerCount={peerCount}
            onStartClick={handleStartClick}
            onLeave={handleLeave}
            onClearError={handleClearError}
          />
        )}
        {page === 'settings' && <SettingsPage />}
        <DetailPanel
          entry={selectedEntry}
          dismissed={sheetDismissed}
          onDismiss={() => setSheetDismissed(true)}
          isLandscape={landscape}
          onAddToQueue={handleAddToQueue}
        />
      </div>

      {dialogVisible && (
        <div className="party-dialog" onClick={() => setDialogVisible(false)}>
          <div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
            <div className="party-dialog__title">Use current queue in your party?</div>
            <div className="party-dialog__buttons">
              <button
                className="party-dialog__button party-dialog__button--yes"
                onClick={() => {
                  if (joinStateRef.current) {
                    executeJoin(joinStateRef.current.partyId, joinStateRef.current.peerId, true);
                  } else {
                    startParty(true);
                  }
                }}
              >
                Yes
              </button>
              <button
                className="party-dialog__button party-dialog__button--no"
                onClick={() => {
                  if (joinStateRef.current) {
                    executeJoin(joinStateRef.current.partyId, joinStateRef.current.peerId, false);
                  } else {
                    startParty(false);
                  }
                }}
              >
                No
              </button>
              <button
                className="party-dialog__button"
                onClick={() => {
                  setDialogVisible(false);
                  if (joinStateRef.current) {
                    joinStateRef.current = null;
                    sessionStorage.removeItem('song-book:party-id');
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {switchPartyDialogVisible && (
        <div className="party-dialog" onClick={() => {
          switchPartyRef.current = null;
          setSwitchPartyDialogVisible(false);
          const params = new URLSearchParams(window.location.search);
          params.delete('party');
          params.delete('peer');
          const search = params.toString();
          const newUrl = search
            ? `${window.location.pathname}?${search}`
            : window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        }}>
          <div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
            <div className="party-dialog__title">Switch to this party?</div>
            <div className="party-dialog__buttons">
              <button
                className="party-dialog__button party-dialog__button--yes"
                onClick={() => {
                  const { partyId: newPartyId, peerId: newPeerId } = switchPartyRef.current!;
                  switchPartyRef.current = null;
                  setSwitchPartyDialogVisible(false);

                  const params = new URLSearchParams(window.location.search);
                  params.delete('party');
                  params.delete('peer');
                  const search = params.toString();
                  const newUrl = search
                    ? `${window.location.pathname}?${search}`
                    : window.location.pathname;
                  window.history.replaceState(null, '', newUrl);

                  disconnectAll();
                  leaveParty();
                  setPartyId(null);

                  sessionStorage.setItem('song-book:party-id', newPartyId);
                  executeJoin(newPartyId, newPeerId, false);
                }}
              >
                Switch
              </button>
              <button
                className="party-dialog__button"
                onClick={() => {
                  switchPartyRef.current = null;
                  setSwitchPartyDialogVisible(false);

                  const params = new URLSearchParams(window.location.search);
                  params.delete('party');
                  params.delete('peer');
                  const search = params.toString();
                  const newUrl = search
                    ? `${window.location.pathname}?${search}`
                    : window.location.pathname;
                  window.history.replaceState(null, '', newUrl);
                }}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
