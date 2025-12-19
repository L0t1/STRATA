import { Queue, Worker, JobScheduler } from 'bullmq';
import { redisConfig } from '../redisConfig';

// Create a queue for async jobs (e.g., reconciliation, notifications)
export const taskQueue = new Queue('iwms-tasks', { connection: redisConfig });
export const taskScheduler = new JobScheduler('iwms-tasks', { connection: redisConfig });

// Worker to process tasks
export const taskWorker = new Worker('iwms-tasks', async job => {
  try {
    if (job.name === 'reconciliation') {
      // Example: Reconcile inventory counts
      // Fetch expected and actual counts, log discrepancies
      console.log('Running reconciliation job:', job.data);
      // ...business logic here...
      return { status: 'reconciled', details: job.data };
    }
    if (job.name === 'notification') {
      // Example: Send notification (email, SMS, etc.)
      console.log('Sending notification:', job.data);
      // ...send notification...
      return { status: 'notified', details: job.data };
    }
    if (job.name === 'integration-sync') {
      // Example: Sync with external system
      console.log('Syncing with integration:', job.data);
      // ...call integration API...
      return { status: 'integration-synced', details: job.data };
    }
    return { status: 'unknown-job', details: job.data };
  } catch (err) {
    console.error('Job failed:', job.name, err);
    throw err;
  }
}, { connection: redisConfig });
