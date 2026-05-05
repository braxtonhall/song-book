import { toCanvas } from "qrcode";
import { useRef, useEffect, useState } from "react";

export function QRCode({ text }: { text: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [ready, setReady] = useState(false);
	const [error, setError] = useState(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		setReady(false);
		setError(false);
		toCanvas(canvas, text, (err) => {
			if (err) {
				setError(true);
			} else {
				setReady(true);
			}
		});

		return () => {
			const ctx = canvas.getContext("2d");
			if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
		};
	}, [text]);

	return (
		<div>
			<canvas ref={canvasRef} style={{ display: ready ? "block" : "none" }} />
			{!ready && !error && <span>Generating QR code...</span>}
			{error && <span>Failed to generate QR code</span>}
		</div>
	);
}
