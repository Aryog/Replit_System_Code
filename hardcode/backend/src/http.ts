import { Express } from "express";
import { copyAzureFolder } from "./azure";
import express from "express";

export function initHttp(app: Express) {
	app.use(express.json());

	app.post("/project", async (req, res) => {
		// Hit a database to ensure this slug isn't taken already
		const { replId, language } = req.body;

		if (!replId) {
			res.status(400).send("Bad request");
			return;
		}

		await copyAzureFolder(`base/${language}`, `code/${replId}`);

		res.send("Project created");
	});
}
