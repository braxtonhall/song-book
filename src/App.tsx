import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Entry } from './types';
import { getEntries } from './api/entries';
import { DetailPanel } from './components/DetailPanel';
import { NavBar } from './components/NavBar';
import { LibraryPage } from './pages/LibraryPage';
import { QueuePage } from './pages/QueuePage';
import { HistoryPage } from './pages/HistoryPage';
import { PartyPage } from './pages/PartyPage';
import { SettingsPage } from './pages/SettingsPage';
import { useLandscape } from './hooks/useLandscape';
import { useQueue } from './hooks/useQueue';
import { usePeer } from './hooks/usePeer';
import { useGossip } from './hooks/useGossip';
import { useHistory, getHistoryForParty, mergeHistoryEntries, removeHistoryEntry, clearHistory } from './hooks/useHistory';
import { usePeerLiveness } from './hooks/usePeerLiveness';
import { useSongPassword } from './hooks/useSongPassword';
import './App.css';
import './pages/PartyPage.css';

type PageId = 'library' | 'queue' | 'history' | 'party' | 'settings';

function App() {
  const landscape = useLandscape();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [page, setPage] = useState<PageId>('library');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(true);
  const { queue, addToQueue, reorderQueue, dismissFromQueue, enterParty, leaveParty, currentMode, getSyncUpdate, applyRemoteUpdate, setOnLocalUpdate } = useQueue();
  const { history } = useHistory();
  const [queueToasts, setQueueToasts] = useState<number[]>([]);
  const [partyBadge, setPartyBadge] = useState(false);
  const partyPeerBaselineRef = useRef(0);
  const { password } = useSongPassword();
  const [partyId, setPartyId] = useState<string | null>(
    () => sessionStorage.getItem('song-book:party-id')
  );

  // ── Peer / Gossip / Liveness ──────────────────────────────────────────────
  const gossipRef = useRef<ReturnType<typeof useGossip> | null>(null);
  const livenessRef = useRef<{ markAlive: (id: string) => void } | null>(null);

  const {
    peerId,
    connectedPeers,
    connect,
    disconnect,
    disconnectAll,
    send,
    getPeerIds,
  } = usePeer(partyId, (from, message) => {
    if (message.partyId !== partyId) return;
    switch (message.type) {
      case 'GOSSIP':
        gossipRef.current?.receive(message.message, from);
        break;
      case 'PEER_LIST_REQUEST': {
        if (!partyId) return;
        const peers = getPeerIds();
        send(from, {
          type: 'GOSSIP',
          partyId: partyId,
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
      case 'PING':
        livenessRef.current?.markAlive(from);
        if (partyId) send(from, { type: 'PONG', partyId });
        break;
      case 'PONG':
        livenessRef.current?.markAlive(from);
        break;
      case 'HISTORY_REQUEST': {
        const entries = getHistoryForParty(message.partyId);
        send(from, { type: 'HISTORY_RESPONSE', partyId: message.partyId, entries });
        break;
      }
      case 'HISTORY_RESPONSE':
        mergeHistoryEntries(message.entries);
        break;
    }
  });

  const gossip = useGossip(send, connect, getPeerIds, peerId, partyId);
  gossipRef.current = gossip;

  const { markAlive, getPeerStatuses } = usePeerLiveness(send, disconnect, getPeerIds, partyId);
  livenessRef.current = { markAlive };

  // ── Local yjs update → broadcast as CRDT_UPDATE to all peers ─────────────
  const connectedPeersRef = useRef(connectedPeers);
  connectedPeersRef.current = connectedPeers;

  const broadcastUpdate = useCallback((encoded: string) => {
    if (!partyId) return;
    for (const id of connectedPeersRef.current) {
      send(id, { type: 'CRDT_UPDATE', partyId, update: encoded });
    }
  }, [send, partyId]);

  useEffect(() => {
    setOnLocalUpdate(broadcastUpdate);
    return () => setOnLocalUpdate(null);
  }, [setOnLocalUpdate, broadcastUpdate]);

  // ── CRDT initial sync to newly connected peers ───────────────────────────
  const syncedPeersRef = useRef<Set<string>>(new Set());

  // ── Remote add toasts ────────────────────────────────────────────────────
  const prevQueueRef = useRef(queue);
  const localAddGateRef = useRef(false);

  useEffect(() => {
    if (currentMode === 'solo') {
      syncedPeersRef.current = new Set();
    }
  }, [currentMode]);

  useEffect(() => {
    if (currentMode !== 'party' || !partyId) return;
    const synced = syncedPeersRef.current;

    for (const id of connectedPeers) {
      if (!synced.has(id)) {
        synced.add(id);
        const state = getSyncUpdate();
        if (state) {
          send(id, { type: 'CRDT_SYNC', partyId, update: state });
        }
      }
    }
  }, [connectedPeers, currentMode, getSyncUpdate, send, partyId]);

  // ── Remote add toasts: fire when queue grows via yjs sync ────────────────
  useEffect(() => {
    if (currentMode !== 'party') {
      prevQueueRef.current = queue;
      return;
    }
    if (page === 'queue') {
      prevQueueRef.current = queue;
      return;
    }

    const prev = prevQueueRef.current;
    const prevIds = new Set(prev.map(e => e.uuid));
    const newEntries = queue.filter(e => !prevIds.has(e.uuid));

    if (newEntries.length > 0 && newEntries.length <= 3 && !localAddGateRef.current) {
      for (let i = 0; i < newEntries.length; i++) {
        const id = Date.now() + i;
        setQueueToasts(p => [...p, id]);
        setTimeout(() => {
          setQueueToasts(p => p.filter(t => t !== id));
        }, 1500);
      }
    }

    localAddGateRef.current = false;
    prevQueueRef.current = queue;
  }, [queue, currentMode, page]);

  // ── Party state ──────────────────────────────────────────────────────────
  const [dialogVisible, setDialogVisible] = useState(false);
  const [switchPartyDialogVisible, setSwitchPartyDialogVisible] = useState(false);
  const [duplicateDialogVisible, setDuplicateDialogVisible] = useState(false);
  const duplicateEntryRef = useRef<Entry | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningStep, setJoiningStep] = useState<'idle' | 'connecting'>('idle');
  const joinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPeerIdRef = useRef<string | null>(null);
  const joinStateRef = useRef<{ partyId: string; peerId: string } | null>(null);
  const switchPartyRef = useRef<{ partyId: string; peerId: string } | null>(null);
  const joinErrorRetryRef = useRef<{ partyId: string; peerId: string } | null>(null);
  const joiningStepRef = useRef(joiningStep);
  joiningStepRef.current = joiningStep;

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
    joinErrorRetryRef.current = { partyId: joinPartyId, peerId: initialPeerId };
    initialPeerIdRef.current = initialPeerId;
    setDialogVisible(false);
    setJoinError(null);

    sessionStorage.setItem('song-book:party-id', joinPartyId);
    enterParty(joinPartyId, copySolo);
    setPartyId(joinPartyId);

    setJoiningStep('connecting');
    connect(initialPeerId);

    joinTimerRef.current = setTimeout(() => {
      if (joiningStepRef.current !== 'connecting') return;
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
      joinErrorRetryRef.current = null;

      setJoiningStep('idle');
      if (partyId) send(initialPeerId, { type: 'PEER_LIST_REQUEST', partyId });
      if (partyId) send(initialPeerId, { type: 'HISTORY_REQUEST', partyId });
    }
  }, [joiningStep, connectedPeers, send, partyId]);

  // ── Party badge: detect new peers when user is not on party page ──────────
  useEffect(() => {
    if (currentMode !== 'party') {
      partyPeerBaselineRef.current = 0;
      return;
    }
    if (page === 'party') {
      partyPeerBaselineRef.current = connectedPeers.length;
      setPartyBadge(false);
      return;
    }
    const prev = partyPeerBaselineRef.current;
    const current = connectedPeers.length;
    if (prev > 0 && current > prev) {
      setPartyBadge(true);
    }
    partyPeerBaselineRef.current = current;
  }, [connectedPeers, currentMode, page]);

  // ── Cleanup timeouts on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (joinTimerRef.current) {
        clearTimeout(joinTimerRef.current);
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
  }, [disconnectAll, leaveParty]);

  const handleClearError = useCallback(() => {
    setJoinError(null);
    setJoiningStep('idle');
    sessionStorage.removeItem('song-book:party-id');
    joinErrorRetryRef.current = null;
  }, []);

  const handleTryAgain = useCallback(() => {
    const retry = joinErrorRetryRef.current;
    if (retry) {
      joinErrorRetryRef.current = null;
      setJoinError(null);
      initiateJoin(retry.partyId, retry.peerId);
    }
  }, [initiateJoin]);

  const url = useMemo(() => {
    const search = new URLSearchParams();
    if (password) search.set('pw', password);
    if (partyId) search.set('party', partyId);
    if (peerId) search.set('peer', peerId);
    return `${window.location.origin}${window.location.pathname}?${search}`;
  }, [password, partyId, peerId]);

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  const handleAddToQueue = useCallback((entry: Entry) => {
    if (queue.some(qe => qe.entry.id === entry.id)) {
      duplicateEntryRef.current = entry;
      setDuplicateDialogVisible(true);
      return;
    }
    localAddGateRef.current = true;
    addToQueue(entry);
    if (page !== 'queue') {
      const id = Date.now();
      setQueueToasts(prev => [...prev, id]);
      setTimeout(() => {
        setQueueToasts(prev => prev.filter(t => t !== id));
      }, 1500);
    }
  }, [addToQueue, queue, page]);

  const handleSelect = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setSheetDismissed(false);
  }, []);

  const handleRemoveHistory = useCallback((uuid: string) => {
    removeHistoryEntry(uuid);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
  }, []);

  // TODO I don't like that this happens every single render
  const statuses = getPeerStatuses();
  const peers = connectedPeers.map((peer) => ({ peer, status: statuses.get(peer) ?? 'active' }));

  if (entries === null) {
    return (
      <div className="App App--loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <NavBar landscape={landscape} activePage={page} onNavigate={setPage} queueToasts={queueToasts} partyBadge={partyBadge} />
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
        {page === 'history' && (
          <HistoryPage
            history={history}
            onRemove={handleRemoveHistory}
            onClear={handleClearHistory}
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
            peers={peers}
            onStartClick={handleStartClick}
            onLeave={handleLeave}
            onClearError={handleClearError}
            onTryAgain={handleTryAgain}
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

      {duplicateDialogVisible && (
        <div className="party-dialog" onClick={() => {
          setDuplicateDialogVisible(false);
          duplicateEntryRef.current = null;
        }}>
          <div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
            <div className="party-dialog__title">This song is already in the queue. Add anyway?</div>
            <div className="party-dialog__buttons">
              <button
                className="party-dialog__button party-dialog__button--yes"
                onClick={() => {
                  const entry = duplicateEntryRef.current;
                  duplicateEntryRef.current = null;
                  setDuplicateDialogVisible(false);
                  if (entry) {
                    localAddGateRef.current = true;
                    addToQueue(entry);
                    if (page !== 'queue') {
                      const id = Date.now();
                      setQueueToasts(prev => [...prev, id]);
                      setTimeout(() => {
                        setQueueToasts(prev => prev.filter(t => t !== id));
                      }, 1500);
                    }
                  }
                }}
              >
                Add
              </button>
              <button
                className="party-dialog__button"
                onClick={() => {
                  setDuplicateDialogVisible(false);
                  duplicateEntryRef.current = null;
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
