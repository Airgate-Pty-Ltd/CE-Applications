/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const mode = process.env.HF_EMAIL_MODE || 'disabled';
  try {
    if (!options.to || !options.subject || !options.body) return false;
    if (mode === 'console') {
      if (process.env.NODE_ENV === 'production') {
        console.error('[email] console delivery is disabled in production.');
        return false;
      }
      console.info(`[email:console] would deliver to ${options.to}; subject=${options.subject}`);
      return true;
    }
    if (mode !== 'webhook') {
      console.warn('[email] delivery skipped: HF_EMAIL_MODE is not configured as webhook.');
      return false;
    }

    const endpoint = new URL(process.env.HF_EMAIL_WEBHOOK_URL || '');
    if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname)) {
      throw new Error('HF_EMAIL_WEBHOOK_URL must use HTTPS except for localhost testing.');
    }
    const token = process.env.HF_EMAIL_WEBHOOK_TOKEN;
    if (!token || token.length < 24) throw new Error('HF_EMAIL_WEBHOOK_TOKEN must contain at least 24 characters.');
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.HF_EMAIL_FROM || null,
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.html || null,
      }),
    });
    if (!response.ok) throw new Error(`Email provider rejected the request with HTTP ${response.status}.`);
    return true;
  } catch (error) {
    console.error('[email] delivery failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function generateEnrollmentEmail(learnerName: string, courseTitle: string, dueDate?: string): EmailOptions {
  return {
    to: '', // Will be set by caller
    subject: `You've been enrolled in ${courseTitle}`,
    body: `Hello ${learnerName},\n\nYou have been enrolled in the course: ${courseTitle}\n${dueDate ? `Due date: ${dueDate}\n` : ''}\n\nPlease log in to get started.`,
    html: `
      <h2>Course Enrollment</h2>
      <p>Hello ${learnerName},</p>
      <p>You have been enrolled in: <strong>${courseTitle}</strong></p>
      ${dueDate ? `<p>Due date: <strong>${dueDate}</strong></p>` : ''}
      <p><a href="{APP_URL}/dashboard">Click here to view your courses</a></p>
    `,
  };
}

export function generateAssessmentPassedEmail(learnerName: string, courseTitle: string, score: number): EmailOptions {
  return {
    to: '',
    subject: `Congratulations! You passed ${courseTitle}`,
    body: `Hello ${learnerName},\n\nCongratulations! You successfully completed ${courseTitle} with a score of ${score}%.\n\nYour certificate is ready for download.`,
    html: `
      <h2>Assessment Passed!</h2>
      <p>Hello ${learnerName},</p>
      <p>Congratulations! You successfully completed <strong>${courseTitle}</strong></p>
      <p>Score: <strong>${score}%</strong></p>
      <p><a href="{APP_URL}/certificates/{CERT_ID}">Download your certificate</a></p>
    `,
  };
}

export function generateAssessmentFailedEmail(learnerName: string, courseTitle: string, score: number, passingScore: number): EmailOptions {
  return {
    to: '',
    subject: `Assessment Results: ${courseTitle}`,
    body: `Hello ${learnerName},\n\nYou completed ${courseTitle} but did not meet the passing score.\n\nYour score: ${score}%\nPassing score: ${passingScore}%\n\nPlease review the course materials and try again.`,
    html: `
      <h2>Assessment Results</h2>
      <p>Hello ${learnerName},</p>
      <p>You completed <strong>${courseTitle}</strong></p>
      <p>Your score: <strong>${score}%</strong></p>
      <p>Passing score required: <strong>${passingScore}%</strong></p>
      <p>Please review the course materials and try again.</p>
      <p><a href="{APP_URL}/dashboard">Return to dashboard</a></p>
    `,
  };
}

export function generateOverdueReminderEmail(learnerName: string, courseTitle: string, daysOverdue: number): EmailOptions {
  return {
    to: '',
    subject: `Reminder: ${courseTitle} is overdue`,
    body: `Hello ${learnerName},\n\nThe course ${courseTitle} was due ${daysOverdue} day(s) ago.\n\nPlease complete this course as soon as possible.`,
    html: `
      <h2>Course Overdue</h2>
      <p>Hello ${learnerName},</p>
      <p>The course <strong>${courseTitle}</strong> was due ${daysOverdue} day(s) ago.</p>
      <p>Please complete this course as soon as possible.</p>
      <p><a href="{APP_URL}/dashboard">Resume course</a></p>
    `,
  };
}

export function generateBulkEnrollmentCompleteEmail(adminName: string, enrollmentCount: number, errorCount: number): EmailOptions {
  return {
    to: '',
    subject: `Bulk Enrollment Complete: ${enrollmentCount} created`,
    body: `Hello ${adminName},\n\nBulk enrollment completed.\n\nSuccessful enrollments: ${enrollmentCount}\nErrors: ${errorCount}\n\nCheck the admin dashboard for details.`,
    html: `
      <h2>Bulk Enrollment Completed</h2>
      <p>Hello ${adminName},</p>
      <p>Bulk enrollment has completed.</p>
      <ul>
        <li>Successful enrollments: <strong>${enrollmentCount}</strong></li>
        <li>Errors: <strong>${errorCount}</strong></li>
      </ul>
      <p><a href="{APP_URL}/admin/enrollments">View enrollments</a></p>
    `,
  };
}
