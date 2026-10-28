import crypto from 'node:crypto';
import {
  WorkflowModel,
  WorkflowRuleModel,
  WorkflowQueueModel,
  WorkflowExecutionModel,
  WorkflowTaskModel,
  ApprovalModel,
  AuditAnalytics
} from '../models/index.js';

function hoursFromNow(hours = 24) {
  const ms = Number(hours) * 60 * 60 * 1000;
  return new Date(Date.now() + (Number.isFinite(ms) ? ms : 0));
}

class WorkflowService {
  async createWorkflow({ customer_id = null, name, definition, rules = [] }) {
    const workflow = await WorkflowModel.create({ customer_id, name, definition });
    if (rules.length) {
      await WorkflowRuleModel.create(workflow.id, rules);
    }
    await AuditAnalytics.log({
      customer_id,
      action: 'workflow_created',
      details: { workflow_id: workflow.id, name }
    });
    return workflow;
  }

  async listWorkflows() {
    const workflows = await WorkflowModel.list();
    const enriched = await Promise.all(
      workflows.map(async (workflow) => {
        const rules = await WorkflowRuleModel.listByWorkflow(workflow.id);
        const tasks = await WorkflowTaskModel.listByWorkflow(workflow.id);
        return { ...workflow, rules, tasks };
      })
    );
    return enriched;
  }

  async queueWorkflow({ workflow_id, payload }) {
    const workflow = await WorkflowModel.getById(workflow_id);
    if (!workflow) throw new Error('Workflow not found');
    const queueEntry = await WorkflowQueueModel.enqueue({ workflow_id, payload });
    await AuditAnalytics.log({
      customer_id: workflow.customer_id,
      action: 'workflow_queued',
      details: { workflow_id, queue_id: queueEntry.id }
    });
    return queueEntry;
  }

  async processQueue(limit = 5) {
    const pending = await WorkflowQueueModel.nextPending(limit);
    const results = [];

    for (const entry of pending) {
      let execution = null;
      try {
        execution = await WorkflowExecutionModel.start(entry.workflow_id);
        const workflow = await WorkflowModel.getById(entry.workflow_id);
        const rules = await WorkflowRuleModel.listByWorkflow(entry.workflow_id);
        const definition = workflow.definition || {};
        const payload = entry.payload || {};

        const matchedRules = this.evaluateRules(rules, payload);
        const steps = definition.steps || [];
        const tasksToInsert = [];

        steps.forEach((step) => {
          if (step.type === 'approval') {
            const taskId = crypto.randomUUID();
            tasksToInsert.push({
              id: taskId,
              workflow_id: workflow.id,
              execution_id: execution.id,
              step_name: step.name,
              assignee: step.assignee || step.approver || null,
              due_at: step.due_in_hours ? hoursFromNow(step.due_in_hours) : null,
              metadata: {
                type: 'approval',
                instructions: step.instructions || null,
                payload,
                matchedRules
              }
            });
          } else if (step.type === 'task') {
            const taskId = crypto.randomUUID();
            tasksToInsert.push({
              id: taskId,
              workflow_id: workflow.id,
              execution_id: execution.id,
              step_name: step.name,
              assignee: step.assignee || null,
              due_at: step.due_in_hours ? hoursFromNow(step.due_in_hours) : null,
              status: step.auto_complete ? 'completed' : 'pending',
              metadata: {
                type: 'task',
                instructions: step.instructions || null,
                payload,
                matchedRules
              }
            });
          }
        });

        if (tasksToInsert.length) {
          const taskIds = await WorkflowTaskModel.insert(tasksToInsert);
          for (let i = 0; i < tasksToInsert.length; i += 1) {
            const task = tasksToInsert[i];
            const taskId = taskIds[i] || task.id;
            if ((task.metadata?.type === 'approval' || task.metadata?.type === 'task') && task.assignee) {
              await ApprovalModel.request({ workflow_task_id: taskId, approver: task.assignee });
            }
          }
        }

        await WorkflowExecutionModel.complete(execution.id, 'completed');
        await WorkflowQueueModel.markProcessed(entry.id);
        await AuditAnalytics.log({
          customer_id: workflow.customer_id,
          action: 'workflow_processed',
          details: { workflow_id: workflow.id, queue_id: entry.id, tasks: tasksToInsert.length }
        });
        results.push({ entry, status: 'processed', tasks: tasksToInsert.length });
      } catch (error) {
        if (execution) {
          await WorkflowExecutionModel.complete(execution.id, 'error');
        }
        await WorkflowQueueModel.markProcessed(entry.id, error.message);
        await AuditAnalytics.log({
          action: 'workflow_error',
          details: { queue_id: entry.id, error: error.message }
        });
        results.push({ entry, status: 'error', error: error.message });
      }
    }

    return results;
  }

  evaluateRules(rules, payload) {
    if (!rules?.length) return [];
    return rules.filter((rule) => {
      if (rule.rule_type === 'match_scope') {
        const scopes = rule.conditions?.scopes || [];
        return scopes.length ? scopes.includes(payload.scope) : false;
      }
      if (rule.rule_type === 'threshold') {
        const field = rule.conditions?.field;
        const operator = rule.conditions?.operator || 'gte';
        const value = Number(rule.conditions?.value || 0);
        const actual = Number(payload[field] || 0);
        switch (operator) {
          case 'gt':
            return actual > value;
          case 'lt':
            return actual < value;
          case 'eq':
            return actual === value;
          case 'lte':
            return actual <= value;
          case 'gte':
          default:
            return actual >= value;
        }
      }
      if (rule.rule_type === 'boolean_flag') {
        const flag = rule.conditions?.flag;
        return Boolean(payload[flag]);
      }
      return false;
    });
  }

  async completeTask(taskId, { status, comment, approver }) {
    const task = await WorkflowTaskModel.updateStatus(taskId, status, comment);
    if (approver) {
      const approvals = await ApprovalModel.pendingForApprover(approver);
      const approval = approvals.find((a) => a.workflow_task_id === taskId);
      if (approval) {
        await ApprovalModel.decide(approval.id, status, comment);
      }
    }
    await AuditAnalytics.log({
      action: 'workflow_task_updated',
      details: { task_id: taskId, status, comment }
    });
    return task;
  }

  async pendingApprovals(approver) {
    return ApprovalModel.pendingForApprover(approver);
  }
}

export default new WorkflowService();
