import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';

class EmailService {
  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user, pass }
      });
    } else {
      this.transporter = null;
    }
  }

  async queueEmail({ recipient, subject, body }) {
    const id = uuidv4();
    await query(
      `INSERT INTO email_queue (id, recipient, subject, body)
       VALUES ($1, $2, $3, $4)`,
      [id, recipient, subject, body]
    );
    return { id };
  }

  async processQueue(limit = 10) {
    const res = await query(
      `SELECT * FROM email_queue
       WHERE status = 'queued'
       ORDER BY queued_at ASC
       LIMIT $1`,
      [limit]
    );

    for (const email of res.rows) {
      try {
        if (this.transporter) {
          await this.transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@example.com',
            to: email.recipient,
            subject: email.subject,
            html: email.body
          });
        } else {
          console.log('[EmailService] Mock send:', email.subject, email.recipient);
        }

        await query(
          `UPDATE email_queue
           SET status = 'sent', sent_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [email.id]
        );
      } catch (error) {
        await query(
          `UPDATE email_queue
           SET status = 'error', error = $1
           WHERE id = $2`,
          [error.message, email.id]
        );
      }
    }
  }
}

export default new EmailService();
