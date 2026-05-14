import { useCallback, useMemo } from "react";
import base from "../data/base.json";
import extra from "../data/extra.json";

export const useSources = () => {
	const sourceMap = useMemo(() => {
		const map = new Map<string, { name: string; icon: string; id: string }>();
		for (const [group, sources] of [
			["base", base],
			["extra", extra],
		] as const) {
			for (const source of sources.sources) {
				for (const id of source.ids) {
					map.set(id, {
						id,
						name: source.names["en-US"],
						icon: `https://raw.githubusercontent.com/YARC-Official/OpenSource/master/${group}/icons/${source.icon}.png`,
					});
				}
			}
			map.set("ugc_plus", {
				id: "ugc_plus",
				name: "Custom Songs",
				icon: `https://raw.githubusercontent.com/YARC-Official/OpenSource/master/base/icons/custom.png`,
			});
		}

		return map;
	}, []);

	const get = useCallback(
		(id: string) => {
			return (
				sourceMap.get(id) ?? {
					id,
					name: id,
					icon: `https://raw.githubusercontent.com/YARC-Official/OpenSource/master/base/icons/custom.png`,
				}
			);
		},
		[sourceMap],
	);

	return { get };
};
