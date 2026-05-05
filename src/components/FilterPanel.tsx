import React from "react";
import { Panel } from "./Panel";

export function FilterPanel({
	dismissed,
	onDismiss,
	isLandscape,
}: {
	dismissed: boolean;
	onDismiss: () => void;
	isLandscape: boolean;
}) {
	return (
		<Panel dismissed={dismissed} onDismiss={onDismiss} isLandscape={isLandscape}>
			<div className="filter-panel__empty">Filters coming soon</div>
		</Panel>
	);
}
