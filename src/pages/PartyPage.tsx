import React from 'react';
import { QRCode } from '../components/QRCode';
import './Page.css';
import './PartyPage.css';
import { PeerStatus } from '../partyTypes';

interface PartyPageProps {
	currentMode: 'solo' | 'party';
	partyId: string | null;
	joinError: string | null;
	joiningStep: 'idle' | 'connecting' | 'requesting';
	peerId: string | null;
	url: string;
	peers: Map<string, PeerStatus>;
	onStartClick: () => void;
	onLeave: () => void;
	onClearError: () => void;
}

export function PartyPage({
	currentMode,
	partyId,
	joinError,
	joiningStep,
	peerId,
	url,
	peers,
	onStartClick,
	onLeave,
	onClearError,
}: PartyPageProps) {
	return (
		<div className="page page--party">
			{joinError && currentMode === 'solo' && !partyId && (
				<div className="party-error">
					<p>{joinError}</p>
					<button
						className="party-error__retry"
						onClick={onClearError}
					>
						OK
					</button>
				</div>
			)}

			{currentMode === 'solo' && !partyId && !joinError && (
				<div className="party-start">
					<button className="party-start__button" onClick={onStartClick}>
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
						<span>{peers.size} device{peers.size !== 1 ? 's' : ''} connected</span>
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

					<button className="party-leave" onClick={onLeave}>
						Leave Party
					</button>
				</>
			)}
		</div>
	);
}
