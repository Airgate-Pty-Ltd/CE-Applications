import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';

class SchedulingService {
  constructor() {
    this.jobs = new Map();
  }

  async registerJob({ name, cronExpression, task }) {
    const id = uuidv4();
    const job = cron.schedule(cronExpression, async () => {
      const executionId = uuidv4();
      await query(
        `INSERT INTO job_executions (id, job_id, status)
         VALUES ($1, $2, 'running')`,
        [executionId, id]
      );

      try {
        await task();
        await query(
          `UPDATE job_executions
           SET status = 'success', completed_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [executionId]
        );
      } catch (error) {
        await query(
          `UPDATE job_executions
           SET status = 'error', completed_at = CURRENT_TIMESTAMP, message = $1
           WHERE id = $2`,
          [error.message, executionId]
        );
      }
    });

    this.jobs.set(id, job);

    await query(
      `INSERT INTO scheduled_jobs (id, job_name, cron_expression)
       VALUES ($1, $2, $3)`,
      [id, name, cronExpression]
    );

    return id;
  }

  stopJob(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
    }
  }

  async listJobs() {
    const res = await query('SELECT * FROM scheduled_jobs ORDER BY created_at DESC');
    return res.rows;
  }
}

export default new SchedulingService();
