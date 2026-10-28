import express from 'express';
import WorkflowService from '../services/WorkflowService.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const workflows = await WorkflowService.listWorkflows();
    res.json({ success: true, workflows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, name, definition, rules } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Workflow name is required' });
    }
    const workflow = await WorkflowService.createWorkflow({ customer_id, name, definition, rules: rules || [] });
    res.status(201).json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/queue', async (req, res) => {
  try {
    const { payload } = req.body;
    const queueEntry = await WorkflowService.queueWorkflow({ workflow_id: req.params.id, payload: payload || {} });
    res.status(201).json({ success: true, queue: queueEntry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:taskId/complete', async (req, res) => {
  try {
    const { status, comment, approver } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    const task = await WorkflowService.completeTask(req.params.taskId, { status, comment, approver });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/approvals/pending', async (req, res) => {
  try {
    const { approver } = req.query;
    if (!approver) {
      return res.status(400).json({ success: false, error: 'Approver is required' });
    }
    const approvals = await WorkflowService.pendingApprovals(approver);
    res.json({ success: true, approvals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
