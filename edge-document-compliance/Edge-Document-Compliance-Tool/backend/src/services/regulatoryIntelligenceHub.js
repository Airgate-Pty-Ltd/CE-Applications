/**
 * Regulatory Intelligence Hub
 * Monitors authoritative sources and records updates.
 * NOTE: Network and email features are guarded by env flags to avoid failures.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import nodemailer from 'nodemailer';
import { query } from '../database/connection.js';

export class RegulatoryIntelligenceHub {
	constructor() {
		this.sources = {
			iso: 'https://www.iso.org/standards.html',
			faa: 'https://www.faa.gov/regulations_policies/advisory_circulars/',
			easa: 'https://www.easa.europa.eu/the-agency/regulations-and-guidance',
			sae: 'https://www.sae.org/standards/'
		};
		this.mailTransport = this.setupEmail();
	}

	setupEmail() {
		if (String(process.env.ENABLE_EMAIL || '').toLowerCase() !== 'true') return null;
		try {
			return nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: Number(process.env.SMTP_PORT || 587),
				secure: false,
				auth: process.env.SMTP_USER
					? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
					: undefined
			});
		} catch (err) {
			return null;
		}
	}

	async monitorRegulatoryChanges() {
		if (String(process.env.ENABLE_NET || '').toLowerCase() !== 'true') {
			return [];
		}
		const updates = [];
		const parts = [this.scanISO(), this.scanFAA(), this.scanEASA(), this.scanSAE()];
		const results = await Promise.allSettled(parts);
		for (const r of results) {
			if (r.status === 'fulfilled' && Array.isArray(r.value)) {
				updates.push(...r.value);
			}
		}
		for (const u of updates) {
			await this.storeUpdate(u).catch(() => undefined);
		}
		if (updates.length > 0) {
			await this.notifyCustomers(updates).catch(() => undefined);
		}
		return updates;
	}

	isRecent(dateStr, days = 30) {
		if (!dateStr) return false;
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return false;
		const now = new Date();
		const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
		return diffDays >= 0 && diffDays <= days;
	}

	extractFAAPart(title) {
		const m = title && title.match(/Part\s+(\d+)/i);
		return m ? `FAA-Part-${m[1]}` : null;
	}

	extractEASACode(title) {
		const m = title && title.match(/EASA[\s-]?([A-Z0-9-]+)/i);
		return m ? `EASA-${m[1]}` : 'EASA-Unknown';
	}

	async scanISO() {
		try {
			const res = await axios.get(this.sources.iso, { timeout: 10000 });
			const $ = cheerio.load(res.data);
			const updates = [];
			$('div.standard-item').each((_i, el) => {
				const title = $(el).find('h3').text().trim();
				const code = $(el).find('.code').text().trim();
				const pubDate = $(el).find('.published').text().trim();
				if (code && this.isRecent(pubDate, 30)) {
					updates.push({
						authority: 'ISO',
						code,
						title,
						publicationDate: pubDate,
						status: 'new_version',
						url: $(el).find('a').attr('href') || null,
						detectedAt: new Date()
					});
				}
			});
			return updates;
		} catch (err) {
			return [];
		}
	}

	async scanFAA() {
		try {
			const res = await axios.get(this.sources.faa, { timeout: 10000 });
			const $ = cheerio.load(res.data);
			const updates = [];
			$('tr').each((_i, el) => {
				const title = $(el).find('td').first().text().trim();
				const date = $(el).find('td').eq(1).text().trim();
				if (!title || !this.isRecent(date, 30)) return;
				const code = this.extractFAAPart(title);
				if (code) {
					updates.push({
						authority: 'FAA',
						code,
						title,
						publicationDate: date,
						status: 'advisory_circular',
						url: $(el).find('a').attr('href') || null,
						detectedAt: new Date()
					});
				}
			});
			return updates;
		} catch (err) {
			return [];
		}
	}

	async scanEASA() {
		try {
			const res = await axios.get(this.sources.easa, { timeout: 10000 });
			const $ = cheerio.load(res.data);
			const updates = [];
			$('article').each((_i, el) => {
				const title = $(el).find('h2').text().trim();
				const date = $(el).find('.date').text().trim();
				if (!this.isRecent(date, 30)) return;
				updates.push({
					authority: 'EASA',
					code: this.extractEASACode(title),
					title,
					publicationDate: date,
					status: 'new_guidance',
					url: $(el).find('a').attr('href') || null,
					detectedAt: new Date()
				});
			});
			return updates;
		} catch (err) {
			return [];
		}
	}

	async scanSAE() {
		try {
			const res = await axios.get(this.sources.sae, { timeout: 10000 });
			const $ = cheerio.load(res.data);
			const updates = [];
			$('div.standard-entry').each((_i, el) => {
				const title = $(el).find('.title').text().trim();
				const code = $(el).find('.code').text().trim();
				const date = $(el).find('.date').text().trim();
				if (code && this.isRecent(date, 30)) {
					updates.push({
						authority: 'SAE',
						code,
						title,
						publicationDate: date,
						status: 'new_standard',
						url: $(el).find('a').attr('href') || null,
						detectedAt: new Date()
					});
				}
			});
			return updates;
		} catch (err) {
			return [];
		}
	}

	async storeUpdate(update) {
		await query(
			`INSERT INTO regulatory_updates
       (authority, code, title, publication_date, status, url, detected_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (authority, code) DO UPDATE SET last_detected_at = NOW()`,
			[
				update.authority,
				update.code,
				update.title,
				update.publicationDate ? new Date(update.publicationDate) : null,
				update.status,
				update.url,
				update.detectedAt || new Date()
			]
		);
	}

	async notifyCustomers(updates) {
		if (!this.mailTransport) return;
		for (const update of updates) {
			// naive: notify all active tenants
			const customers = await query(`SELECT id, name, COALESCE(email, '') AS email FROM tenants WHERE is_active = TRUE`);
			for (const c of customers.rows) {
				if (!c.email) continue;
				await this.mailTransport
					.sendMail({
						from: process.env.SMTP_FROM || 'noreply@edcat.local',
						to: c.email,
						subject: `Regulatory Update: ${update.authority} ${update.code}`,
						html: `<p>A new update was detected:</p>
               <p><b>${update.authority} ${update.code}</b></p>
               <p>${update.title || ''}</p>
               <p>Published: ${update.publicationDate ? new Date(update.publicationDate).toLocaleDateString() : 'n/a'}</p>
               <p><a href="${update.url || '#'}">View</a></p>`
					})
					.catch(() => undefined);
			}
		}
	}
}

export default RegulatoryIntelligenceHub;


