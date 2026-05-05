import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { QRCode } from '../components/QRCode';
import { useQueue } from '../hooks/useQueue';
import { usePeer } from '../hooks/usePeer';
import { useGossip } from '../hooks/useGossip';
import { useSongPassword } from '../hooks/useSongPassword';
import './Page.css';
import './PartyPage.css';

export function PartyPage() {
	const { queue, enterParty, leaveParty, currentMode } = useQueue();
	const { password } = useSongPassword();
	const [partyId, setPartyId] = useState<string | null>(
		() => sessionStorage.getItem('song-book:party-id')
	);
	const [dialogVisible, setDialogVisible] = useState(false);
	const [joinError, setJoinError] = useState<string | null>(null);
	const [joiningStep, setJoiningStep] = useState<'idle' | 'connecting' | 'requesting'>('idle');
	const joinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const joinBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const initialPeerIdRef = useRef<string | null>(null);
	const joinStateRef = useRef<{ partyId: string; peerId: string } | null>(null);
	const joinedRef = useRef(false);
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
		}
	});

	const gossip = useGossip(send, connect, getPeerIds, peerId);
	gossipRef.current = gossip;

	// ── Create party flow ───────────────────────────────────────────────────
	const startParty = useCallback((copySolo: boolean) => {
		const id = crypto.randomUUID();
		setPartyId(id);
		setDialogVisible(false);
		enterParty(id, copySolo);
	}, [enterParty]);

	// ── Join flow ───────────────────────────────────────────────────────────
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

	// ── URL parsing on mount ────────────────────────────────────────────────
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlPartyId = params.get('party');
		const urlPeerId = params.get('peer');

		if (!urlPartyId || !urlPeerId) return;

		if (sessionStorage.getItem('song-book:party-id')) return;

		params.delete('party');
		params.delete('peer');
		const search = params.toString();
		const newUrl = search
			? `${window.location.pathname}?${search}`
			: window.location.pathname;
		window.history.replaceState(null, '', newUrl);

		sessionStorage.setItem('song-book:party-id', urlPartyId);

		initiateJoin(urlPartyId, urlPeerId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Connected peer detection → PEER_LIST_REQUEST ────────────────────────
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

	// ── JOIN broadcast ──────────────────────────────────────────────────────
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

	// ── Cleanup timeouts on unmount ─────────────────────────────────────────
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

	// ── Start / Leave handlers ──────────────────────────────────────────────
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

	const url = useMemo(() => {
		const search = new URLSearchParams();
		if (password) search.set('pw', password);
		if (partyId) search.set('party', partyId);
		if (peerId) search.set('peer', peerId);
		return `${window.location.origin}${window.location.pathname}?${search}`;
	}, [password, partyId, peerId]);

	const peerCount = connectedPeers.length + 1;

	return (
		<div className="page page--party">
			{joinError && currentMode === 'solo' && !partyId && (
				<div className="party-error">
					<p>{joinError}</p>
					<button
						className="party-error__retry"
						onClick={() => {
							setJoinError(null);
							setJoiningStep('idle');
							sessionStorage.removeItem('song-book:party-id');
						}}
					>
						OK
					</button>
				</div>
			)}

			{currentMode === 'solo' && !partyId && !joinError && (
				<div className="party-start">
					<button className="party-start__button" onClick={handleStartClick}>
						Start Party
					</button>
				</div>
			)}

			{currentMode === 'party' && partyId && joiningStep !== 'idle' && (
				<div className="party-connecting">
					<span>Joining party...</span>
				</div>
			)}

			{currentMode === 'party' && partyId && joiningStep === 'idle' && (
				<>
					<div className="party-status">
						<span>{peerCount} device{peerCount !== 1 ? 's' : ''} connected</span>
					</div>

					{peerId ? (
						<>
							<div className="party-qr">
								<QRCode text={url} />
							</div>
							<div className="party-url">
								<span className="party-url__text">{url}</span>
								<button
									className="party-url__copy"
									onClick={() => navigator.clipboard.writeText(url)}
								>
									Copy
								</button>
							</div>
						</>
					) : (
						<div className="party-connecting">
							<span>Connecting...</span>
						</div>
					)}

					<button className="party-leave" onClick={handleLeave}>
						Leave Party
					</button>
				</>
			)}

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
		</div>
	);
}
