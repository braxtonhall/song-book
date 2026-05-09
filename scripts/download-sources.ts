import * as fs from "node:fs";
import path from "node:path";

const write = (url: string, output: string) => {
	const outPath = path.join(__dirname, "..", "src", "data", output);
	return fetch(url)
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			return res.json();
		})
		.then((data) => {
			fs.mkdirSync(path.dirname(outPath), { recursive: true });
			fs.writeFileSync(outPath, JSON.stringify(data, null, "\t") + "\n");
			console.log(`Downloaded ${output} (${JSON.stringify(data).length} bytes)`);
		});
};

Promise.all([
	write("https://raw.githubusercontent.com/YARC-Official/OpenSource/master/base/index.json", "base.json"),
	write("https://raw.githubusercontent.com/YARC-Official/OpenSource/master/extra/index.json", "extra.json"),
]).catch((err) => {
	console.error("Failed to download sources.json:", err.message);
	process.exit(1);
});
