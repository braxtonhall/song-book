import React from "react";
import { QRCode } from "../components/QRCode";
import { CopyButton } from "../components/CopyButton";
import "./Page.css";
import "./PartyPage.css";
import { PeerStatus } from "../partyTypes";
import { getRockerId } from "../utilities/hash";

interface PartyPageProps {
	currentMode: "solo" | "party";
	partyId: string | null;
	joinError: string | null;
	joiningStep: "idle" | "connecting";
	peerId: string | null;
	url: string;
	peers: { peer: string; status: PeerStatus }[];
	onStartClick: () => void;
	onLeave: () => void;
	onClearError: () => void;
	onTryAgain: () => void;
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
	onTryAgain,
}: PartyPageProps) {
	return (
		<div className="page page--party">
			{joinError && currentMode === "solo" && !partyId && (
				<div className="party-error">
					<p>{joinError}</p>
					<div className="party-error__buttons">
						<button className="party-error__retry" onClick={onTryAgain}>
							Try Again
						</button>
						<button className="party-error__dismiss" onClick={onClearError}>
							Dismiss
						</button>
					</div>
				</div>
			)}

			{currentMode === "solo" && !partyId && !joinError && (
				<div className="party-start">
					<button className="party-start__button" onClick={onStartClick}>
						Start Party
					</button>
				</div>
			)}

			{currentMode === "party" && partyId && joiningStep !== "idle" && (
				<div className="party-connecting">
					<span>Joining party...</span>
					<button className="party-leave" onClick={onLeave}>
						Cancel
					</button>
				</div>
			)}

			{currentMode === "party" && partyId && joiningStep === "idle" && (
				<>
					{peerId && (
						<div className="party-header">
							<h1 className="party-header__self">{getRockerId(peerId)}</h1>
							<h2 className="party-header__party">In party {getRockerId(partyId)}</h2>
						</div>
					)}

					{peerId ? (
						<>
							<div className="party-qr">
								<QRCode text={url} />
							</div>
							<div className="party-url">
								<span className="party-url__text">{url}</span>
								<CopyButton text={url} />
							</div>
						</>
					) : (
						<div className="party-connecting">
							<span>Connecting...</span>
						</div>
					)}

					{peers.length > 0 && (
						<div className="party-peers">
							<div className="party-peers__header">Members</div>
							<ul className="party-peers__list">
								<li key={peerId} className="party-peers__peer">
									{getRockerId(peerId!)}
								</li>
								{peers.map(({ peer, status }) => (
									<li
										key={peer}
										className={`party-peers__peer${status !== "active" ? " party-peers__peer--inactive" : ""}`}
									>
										{getRockerId(peer)}
									</li>
								))}
							</ul>
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
