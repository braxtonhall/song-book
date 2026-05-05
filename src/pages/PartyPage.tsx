import React, { useState, useMemo, useCallback } from 'react';
import { QRCode } from '../components/QRCode';
import { useQueue } from '../hooks/useQueue';
import { usePeer } from '../hooks/usePeer';
import { useSongPassword } from '../hooks/useSongPassword';
import './Page.css';
import './PartyPage.css';

export function PartyPage() {
	const { queue, enterParty, leaveParty, currentMode } = useQueue();
	const { peerId, connectedPeers, disconnectAll } = usePeer();
	const { password } = useSongPassword();
	const [partyId, setPartyId] = useState<string | null>(
		() => sessionStorage.getItem('song-book:party-id')
	);
	const [dialogVisible, setDialogVisible] = useState(false);

	const startParty = useCallback((copySolo: boolean) => {
		const id = crypto.randomUUID();
		setPartyId(id);
		setDialogVisible(false);
		enterParty(id, copySolo);
	}, [enterParty]);

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
			{currentMode === 'solo' && !partyId && (
				<div className="party-start">
					<button className="party-start__button" onClick={handleStartClick}>
						Start Party
					</button>
				</div>
			)}

			{currentMode === 'party' && partyId && (
				<>
					<div className="party-status">
						<span>{peerCount} device{peerCount !== 1 ? 's' : ''} connected</span>
					</div>

					{peerId ? (
						<div className="party-qr">
							<QRCode text={url} />
						</div>
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
								onClick={() => startParty(true)}
							>
								Yes
							</button>
							<button
								className="party-dialog__button party-dialog__button--no"
								onClick={() => startParty(false)}
							>
								No
							</button>
							<button
								className="party-dialog__button"
								onClick={() => setDialogVisible(false)}
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
