import { expect, test } from "@playwright/test";
import config from "../config";

test("injected config", async ({ request }) => {
	const response = await request.get("/config.json");
	const json = await response.json();
	expect(json).toEqual(config);
});

test("injected pages", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle("Theme SSG");
});

test("injected content collection", async ({ page }) => {
	await page.goto("/blog/success");

	await expect(await page.innerText("h1")).toBe("Success!");

	page.on("response", async (response) => {
		if (response.url().endsWith("blog/fail")) {
			await expect(response.status()).toBe(500);
		}
	});

	await page.goto("/blog/fail");
});

test("injected public", async ({ request }) => {
	const response = await request.get("/favicon.svg");
	expect(response.status()).toBe(200);
});

test("injected css", async ({ page }) => {
	await page.goto("/");

	const element = await page.waitForSelector("body");
	const color = await element.evaluate((el) => {
		return window.getComputedStyle(el).getPropertyValue("background-color");
	});

	expect(color).toBe("rgb(0, 255, 0)");
});

test("injected components", async ({ page }) => {
	await page.goto("/");
	expect(await page.innerText("h1")).toBe("Theme SSG");
});
