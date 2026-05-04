import { useEffect } from "react";

export function useGlobalPointerCancel(handlePointerUp: (event: PointerEvent) => unknown) {
    useEffect(() => {
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
    }, [handlePointerUp]);
}