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
        toCanvas(canvas, 'text', (error) => {
            if (error) {
                setError(true);
            } else {
                setReady(true);
            }
        });

        // Optional cleanup if the library provides a destroy method
        return () => {
            // TODO cleanup code?
        };
    }, [text]);

    return <canvas ref={canvasRef} />;
}