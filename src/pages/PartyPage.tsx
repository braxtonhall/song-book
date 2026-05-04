import React, { useMemo } from 'react';
import { QRCode } from '../components/QRCode';
import { useSongPassword } from '../hooks/useSongPassword';
import './Page.css';
import './PartyPage.css';

export function PartyPage() {
	const {password} = useSongPassword();
	const url = useMemo(() => {
		const search = new URLSearchParams();
		if (password) {
			search.set('pw', password)
		}
		return `${window.location.origin + window.location.pathname}?${search}`;
	}, [password]);

	return (
		<div className="page page--party">
			<div className="party-qr">
				<QRCode text={url} />
			</div>
		</div>
	);
}
