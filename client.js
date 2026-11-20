/**
 * Session manager — Client half.
 *
 * One sidebar icon plus the matching main panel. The panel fetches the
 * authenticated Host route and renders two tables: live Workspace sessions and
 * the trash. Mutations refresh DSH's own Session list so the sidebar follows.
 */
window.__ModuleLoader__.load({
  id: '@local/session-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'session-manager'
    const DICTS = {
      zh: {
        title: '会话管理',
        subtitle: '按工作区分组列出所有会话，可移入回收站。',
        'trash.title': '回收站',
        'trash.subtitle': '已移入回收站的会话，按原工作区分组。',
        'trash.button': '回收站',
        'action.refresh': '刷新',
        'action.back': '返回会话列表',
        'action.delete': '删除',
        'action.deleteCount': '删除 ({count})',
        'action.detail': '详情',
        'action.close': '关闭',
        'action.restore': '还原',
        'action.restoreCount': '还原 ({count})',
        'action.purge': '彻底删除',
        'action.confirm': '确认',
        'action.confirmPurge': '确认彻底删除',
        'action.cancel': '取消',
        'action.retry': '重试',
        'column.id': '会话 ID',
        'column.select': '选择',
        'column.title': '会话标题',
        'column.status': '状态',
        'column.created': '创建时间',
        'column.deleted': '删除时间',
        'column.size': '文件大小',
        'column.path': '会话路径',
        'column.workspaceDetail': '工作区详情',
        'column.originalPath': '原始会话路径',
        'column.actions': '操作',
        untitled: '（无标题）',
        archived: '已归档',
        'status.active': '激活',
        'status.archived': '归档',
        'workspace.unknown': '未知工作区',
        'workspace.noPath': '（无目录路径）',
        'empty.sessions': '会话列表是空的',
        'empty.trash': '回收站是空的',
        loading: '正在加载…',
        count: '共 {count} 个会话',
        'trash.count': '回收站中有 {count} 个会话',
        'notice.deleted': '已将会话移入回收站。',
        'notice.restored': '会话已还原。',
        'notice.rehomed': '原工作区不可用，会话已放入默认工作区「{workspace}」。',
        'notice.purged': '已彻底删除回收站中的会话。',
        'error.title': '操作失败',
        'error.load': '无法读取会话数据。',
        'error.request': '请求失败。',
        'error.sessionActive': '该会话仍有正在运行的任务，请先停止后再删除。',
        'error.trashExists': '回收站中已存在同 ID 的会话。',
        'error.sessionNotFound': '找不到该会话的存储文件。',
        'error.sessionExists': '会话存储中已存在同 ID 的会话。',
        'error.trashMissing': '回收站中找不到该会话。',
        'error.noWorkspace': '没有可用的工作区。',
        'error.targetExists': '原会话目录已存在，无法还原。',
        'error.fallback': '操作失败：{message}',
        'table.caption': '按工作区分组的会话列表',
        'table.trashCaption': '按原工作区分组的回收站会话列表',
        'aria.refresh': '刷新列表',
        'aria.trash': '打开回收站',
        'aria.selectSession': '选择会话',
        'detail.title': '会话详情',
        'detail.workspace': '工作区',
        'purge.title': '彻底删除会话',
        'purge.warning': '此操作不可逆。将彻底删除选中的 {count} 个会话，无法恢复。',
        'purge.instruction': '请输入 DELETE 以确认',
        'notice.bulkDeleted': '已将会话移入回收站，共 {count} 个。',
        'notice.bulkRestored': '已还原 {count} 个会话。',
        'notice.bulkPurged': '已彻底删除 {count} 个会话。',
        'error.bulkPartial': '成功 {ok} 个，失败 {failed} 个：{message}',
        'aria.back': '返回会话列表',
      },
      en: {
        title: 'Session manager',
        subtitle: 'Every session grouped by workspace, ready for the trash.',
        'trash.title': 'Trash',
        'trash.subtitle': 'Sessions moved to the trash, grouped by their original workspace.',
        'trash.button': 'Trash',
        'action.refresh': 'Refresh',
        'action.back': 'Back to sessions',
        'action.delete': 'Delete',
        'action.deleteCount': 'Delete ({count})',
        'action.detail': 'Details',
        'action.close': 'Close',
        'action.restore': 'Restore',
        'action.restoreCount': 'Restore ({count})',
        'action.purge': 'Purge',
        'action.confirm': 'Confirm',
        'action.confirmPurge': 'Confirm purge',
        'action.cancel': 'Cancel',
        'action.retry': 'Retry',
        'column.id': 'Session ID',
        'column.select': 'Select',
        'column.title': 'Session title',
        'column.status': 'Status',
        'column.created': 'Created',
        'column.deleted': 'Deleted',
        'column.size': 'File size',
        'column.path': 'Session path',
        'column.workspaceDetail': 'Workspace details',
        'column.originalPath': 'Original session path',
        'column.actions': 'Actions',
        untitled: '(untitled)',
        archived: 'Archived',
        'status.active': 'Active',
        'status.archived': 'Archived',
        'workspace.unknown': 'Unknown workspace',
        'workspace.noPath': '(no directory path)',
        'empty.sessions': 'The session list is empty',
        'empty.trash': 'The trash is empty',
        loading: 'Loading…',
        count: '{count} sessions',
        'trash.count': '{count} sessions in the trash',
        'notice.deleted': 'Session moved to the trash.',
        'notice.restored': 'Session restored.',
        'notice.rehomed': 'The original workspace is unavailable, so the session was restored into the default workspace “{workspace}”.',
        'notice.purged': 'Trash entry deleted permanently.',
        'error.title': 'Operation failed',
        'error.load': 'Could not read session data.',
        'error.request': 'The request failed.',
        'error.sessionActive': 'This session still has running work. Stop it before deleting the session.',
        'error.trashExists': 'A trash entry with this session id already exists.',
        'error.sessionNotFound': 'The session storage file was not found.',
        'error.sessionExists': 'A session with this id already exists in storage.',
        'error.trashMissing': 'The trash entry was not found.',
        'error.noWorkspace': 'No workspace is available.',
        'error.targetExists': 'The original session directory already exists.',
        'error.fallback': 'Operation failed: {message}',
        'table.caption': 'Sessions grouped by workspace',
        'table.trashCaption': 'Trashed sessions grouped by original workspace',
        'aria.refresh': 'Refresh list',
        'aria.trash': 'Open the trash',
        'aria.selectSession': 'Select session',
        'detail.title': 'Session details',
        'detail.workspace': 'Workspace',
        'purge.title': 'Delete sessions permanently',
        'purge.warning': 'This action is irreversible. {count} selected sessions will be permanently deleted.',
        'purge.instruction': 'Type DELETE to confirm',
        'notice.bulkDeleted': 'Moved {count} sessions to the trash.',
        'notice.bulkRestored': 'Restored {count} sessions.',
        'notice.bulkPurged': 'Permanently deleted {count} sessions.',
        'error.bulkPartial': '{ok} succeeded, {failed} failed: {message}',
        'aria.back': 'Back to the session list',
      },
    }

    const ERROR_KEYS = {
      'session-active': 'error.sessionActive',
      'trash-exists': 'error.trashExists',
      'session-not-found': 'error.sessionNotFound',
      'session-exists': 'error.sessionExists',
      'trash-missing': 'error.trashMissing',
      'no-workspace': 'error.noWorkspace',
      'restore-target-exists': 'error.targetExists',
    }

    const CSS = `
.sm-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  padding: calc(28px + var(--dsh-frame-top-clearance, 0px)) clamp(20px, 4vw, 48px) 32px;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
}
.sm-header {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.sm-heading { min-width: 0; }
.sm-title { margin: 0; font-size: 20px; font-weight: 500; line-height: 28px; }
.sm-subtitle { margin: 4px 0 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.sm-meta { margin: 3px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.sm-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.sm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}
.sm-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.sm-btn:disabled { opacity: 0.55; cursor: default; }
.sm-btn--primary {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  color: var(--dsw-alias-brand-primary);
}
.sm-btn--danger { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent); }
.sm-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.sm-alert, .sm-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  margin: 12px auto 0;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 18px;
}
.sm-alert {
  border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
.sm-notice {
  border: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
}
.sm-alert-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.sm-table-toolbar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 1200px;
  margin: 16px auto 0;
}
.sm-body {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  max-width: 1200px;
  margin: 8px auto 0;
  overflow: auto;
  overscroll-behavior: contain;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2, var(--dsw-alias-border-l2));
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2, var(--dsw-alias-border-l3));
}
.sm-table {
  flex: none;
  width: 100%;
  min-width: 1400px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  --sm-row-line-height: 20px;
  --sm-row-height: calc(3 * var(--sm-row-line-height));
}
.sm-table caption { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.sm-select-cell { padding-inline: 12px; }
.sm-checkbox {
  width: 15px;
  height: 15px;
  margin: 0;
  vertical-align: middle;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.sm-checkbox:disabled { opacity: 0.5; cursor: default; }
.sm-table th {
  position: sticky;
  top: 0;
  z-index: 3;
  box-sizing: border-box;
  padding: 9px 12px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}
.sm-table td {
  box-sizing: border-box;
  padding: 9px 12px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  vertical-align: middle;
  text-align: left;
  line-height: var(--sm-row-line-height);
}
.sm-table tbody tr:last-child td { border-bottom: 0; }
.sm-row td {
  height: var(--sm-row-height);
  max-height: var(--sm-row-height);
  overflow: hidden;
}
.sm-group td {
  height: var(--sm-row-height);
  max-height: var(--sm-row-height);
  overflow: hidden;
  padding: 10px 12px;
  border-bottom: 0;
  border-top: 0.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, var(--dsw-alias-bg-layer-2));
  box-shadow: inset 3px 0 0 var(--dsw-alias-brand-primary);
}
.sm-group + .sm-row td { border-top: 0; }
.sm-group-name { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 600; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm-group-path {
  margin-top: 1px;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sm-row td { background: var(--dsw-alias-bg-layer-1); }
.sm-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm-mono { font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 11.5px; }
.sm-path { color: var(--dsw-alias-label-secondary); }
.sm-nowrap { white-space: nowrap; color: var(--dsw-alias-label-secondary); }
.sm-time { white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.sm-table td.sm-workspace-cell { padding-top: 0; padding-bottom: 0; }
.sm-workspace-detail {
  display: flex;
  flex-direction: column;
  height: var(--sm-row-height);
  overflow-x: hidden;
  overflow-y: auto;
  line-height: 20px;
  text-align: left;
}
.sm-workspace-detail--short { justify-content: center; }
.sm-workspace-line {
  flex: 0 0 20px;
  height: 20px;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.sm-detail-lines { display: flex; flex-direction: column; gap: 2px; }
.sm-detail-line { white-space: pre-wrap; overflow-wrap: anywhere; }
.sm-size { color: var(--dsw-alias-label-secondary); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.sm-title-text { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
.sm-table th.sm-actions-head {
  right: 0;
  z-index: 4;
}
.sm-actions {
  position: sticky;
  right: 0;
  z-index: 2;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  overflow: visible;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: -0.5px 0 0 var(--dsw-alias-border-l1);
}
.sm-table th.sm-actions-head { box-shadow: -0.5px 0 0 var(--dsw-alias-border-l1); }
.sm-actions .sm-btn { height: 26px; padding: 0 8px; }
.sm-status {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 10.5px;
  line-height: 1;
  white-space: nowrap;
}
.sm-status--active {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: var(--dsw-alias-state-success-primary);
}
.sm-status--archived {
  box-sizing: border-box;
  border: 0.5px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
}
.sm-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  padding: 32px;
  color: var(--dsw-alias-label-tertiary);
  text-align: center;
}
.sm-state svg { opacity: 0.7; }
.sm-spinner { width: 16px; height: 16px; border: 2px solid var(--dsw-alias-border-l2); border-top-color: var(--dsw-alias-brand-primary); border-radius: 999px; animation: sm-spin 800ms linear infinite; }
@keyframes sm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sm-spinner { animation: none; } }
.sm-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}
.sm-modal {
  box-sizing: border-box;
  width: min(480px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 20px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  color: var(--dsw-alias-label-primary);
}
.sm-modal-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 24px; }
.sm-modal-text { margin: 8px 0 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.sm-modal-label { display: block; margin: 16px 0 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.sm-modal-input {
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
.sm-modal-input:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: inset 0 0 0 0.5px var(--dsw-alias-brand-primary);
}
.sm-modal--detail { width: min(640px, 100%); }
.sm-detail-list { margin-top: 16px; border-top: 0.5px solid var(--dsw-alias-border-l1); }
.sm-detail-row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  box-sizing: border-box;
  min-height: calc(3 * 20px);
  padding: 0 4px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}
.sm-detail-row:last-child { border-bottom: 0; }
.sm-detail-label { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.sm-detail-value {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  white-space: normal;
  overflow-wrap: anywhere;
}
.sm-detail-value--mono {
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
}
.sm-detail-workspace { font-weight: 500; }
.sm-detail-path {
  margin-top: 2px;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}
.sm-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.sm-modal-footer .sm-btn { min-width: 64px; }
@media (hover: hover) {

  .sm-row:hover td { background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, var(--dsw-alias-bg-layer-1)); }
  .sm-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); }
  .sm-btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); color: var(--dsw-alias-brand-primary); }
  .sm-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent); color: var(--dsw-alias-state-error-primary); }
}
.sm-row--selected td,
.sm-row--selected:hover td {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, var(--dsw-alias-bg-layer-1));
}
@media (max-width: 700px) {
  .sm-page { padding-top: calc(20px + var(--dsh-frame-top-clearance, 0px)); padding-inline: 20px; }
  .sm-title { font-size: 18px; }
}
`

    function refreshIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': true, focusable: 'false' },
        h('path', { d: 'M12.9 6.2A5.2 5.2 0 1 0 13 9.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
        h('path', { d: 'M12.9 2.8v3.5H9.4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function trashIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': true, focusable: 'false' },
        h('path', { d: 'M3 4.5h10M6 4.5V3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.3M4.4 4.5l.5 8.2a1.2 1.2 0 0 0 1.2 1.1h3.8a1.2 1.2 0 0 0 1.2-1.1l.5-8.2', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M6.6 7v4.2M9.4 7v4.2', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }

    function backIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': true, focusable: 'false' },
        h('path', { d: 'M10.8 3.3 5.9 8l4.9 4.7', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function emptyIcon() {
      return h('svg', { viewBox: '0 0 48 48', width: 40, height: 40, 'aria-hidden': true, focusable: 'false' },
        h('path', { d: 'M9 28.5 13 12h22l4 16.5v7a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-7Z', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' }),
        h('path', { d: 'M9 28.5h9l2 4h8l2-4h9', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' }))
    }

    function panelIcon(size, active) {
      return h('svg', {
        viewBox: '0 0 36 36',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: 'false',
        style: { display: 'block', opacity: active ? 1 : 0.9 },
      },
      h('g', { stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', fill: 'none' },
        h('path', { d: 'M6.8 10.5h14.2' }),
        h('path', { d: 'M6.8 16.5h14.2' }),
        h('path', { d: 'M6.8 22.5h8.6' })),
      h('g', { stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' },
        h('path', { d: 'M22.4 15.1h7.6' }),
        h('path', { d: 'M24.6 15.1v-1.7a1.9 1.9 0 0 1 1.9-1.9h.9a1.9 1.9 0 0 1 1.9 1.9v1.7' }),
        h('path', { d: 'M24.2 18.3v6.8M29.2 18.3v6.8' }),
        h('path', { d: 'M21.6 15.1h9.2l-.72 12.7a2.2 2.2 0 0 1-2.19 2.07h-3.38a2.2 2.2 0 0 1-2.19-2.07l-.72-12.7Z' })))
    }

    function useLocaleRevision(locale) {
      const [, setRevision] = React.useState(0)
      React.useEffect(() => locale.subscribe(() => {
        setRevision(value => value + 1)
      }), [locale])
    }

    function formatTime(value) {
      const ms = typeof value === 'string' ? Date.parse(value) : value
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—'
      const date = new Date(ms)
      if (Number.isNaN(date.getTime())) return '—'
      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    function formatBytes(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '—'
      if (bytes < 1024) return `${bytes} B`
      const units = ['K', 'M', 'G', 'T']
      let value = bytes
      let unit = ''
      for (const next of units) {
        value /= 1024
        unit = next
        if (value < 1024) break
      }
      return `${value.toFixed(1)} ${unit}`
    }

    function fetchJson(path, options) {
      return fetch(path, {
        cache: 'no-store',
        credentials: 'same-origin',
        ...options,
      }).then(async (response) => {
        let data = {}
        try {
          data = await response.json()
        } catch {
          data = {}
        }
        if (!response.ok || data.ok !== true) {
          const error = new Error(data.error || `Request failed (${response.status}).`)
          error.code = data.code
          throw error
        }
        return data
      })
    }

    function Page() {
      const locale = React.useContext(LocaleContext)
      useLocaleRevision(locale)
      const t = locale.bind(NS)
      const tRef = React.useRef(t)
      tRef.current = t
      const manager = React.useContext(ManagerContext)
      const ctx = manager.ctx
      const trashFilter = manager.trashFilter
      const [view, setView] = React.useState('sessions')
      const [sessionData, setSessionData] = React.useState({ groups: [], total: 0 })
      const [trashData, setTrashData] = React.useState({ groups: [], total: 0 })
      const [loading, setLoading] = React.useState(true)
      const [busyId, setBusyId] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [confirmPurgeId, setConfirmPurgeId] = React.useState(null)
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [bulkBusy, setBulkBusy] = React.useState(false)
      const [purgeOpen, setPurgeOpen] = React.useState(false)
      const [purgeText, setPurgeText] = React.useState('')
      const [purgeTargets, setPurgeTargets] = React.useState([])
      const [detail, setDetail] = React.useState(null)

      const describeError = React.useCallback((failure) => {
        const translate = tRef.current
        const key = failure?.code ? ERROR_KEYS[failure.code] : undefined
        if (key) return translate(key)
        return translate('error.fallback', { message: failure instanceof Error ? failure.message : String(failure) })
      }, [])

      const load = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
          const [sessions, trash] = await Promise.all([
            fetchJson('/session-manager/sessions'),
            fetchJson('/session-manager/trash'),
          ])
          setSessionData({ groups: Array.isArray(sessions.groups) ? sessions.groups : [], total: Number(sessions.total) || 0 })
          setTrashData({ groups: Array.isArray(trash.groups) ? trash.groups : [], total: Number(trash.total) || 0 })
        } catch (failure) {
          setError(describeError(failure))
        } finally {
          setLoading(false)
        }
      }, [describeError])

      React.useEffect(() => { void load() }, [load])

      React.useEffect(() => {
        if (notice === null) return undefined
        const timer = window.setTimeout(() => { setNotice(null) }, 4200)
        return () => { window.clearTimeout(timer) }
      }, [notice])

      React.useEffect(() => {
        if (!purgeOpen) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') closePurgeDialog()
        }
        window.addEventListener('keydown', onKey)
        return () => { window.removeEventListener('keydown', onKey) }
      }, [purgeOpen])

      React.useEffect(() => {
        if (detail === null) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') closeDetail()
        }
        window.addEventListener('keydown', onKey)
        return () => { window.removeEventListener('keydown', onKey) }
      }, [detail])

      async function refreshSidebarWorkspace(workspaceId) {
        if (!workspaceId) return
        try {
          const snapshot = ctx.workspaces.list.getSnapshot()
          const workspace = snapshot.items.find(item => String(item.workspaceId) === String(workspaceId))
          if (workspace === undefined) return
          // Re-apply the same title. The Host performs no write, but its unary
          // reply re-installs this Workspace in the client model, so the left
          // sidebar rebuilds that workspace group from fresh Host state.
          await ctx.workspaces.rename(workspaceId, workspace.title)
        } catch (failure) {
          console.warn('[session-manager] sidebar workspace refresh failed:', failure)
        }
      }

      async function refreshWorkspace() {
        try {
          await ctx.sessions.refresh()
        } catch (failure) {
          console.warn('[session-manager] session list refresh failed:', failure)
        }
      }

      async function mutate(id, route, success) {
        setBusyId(id)
        setError(null)
        setNotice(null)
        try {
          const result = await fetchJson(`/session-manager/${route}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId: id }),
          })
          setConfirmPurgeId(null)
          setNotice(success(result))
          if (route === 'trash' || route === 'purge') trashFilter.add(id)
          if (route === 'restore') trashFilter.remove(id)
          removeSelected(id)
          if (route === 'trash') {
            await refreshSidebarWorkspace(result.workspaceId)
          }
          await refreshWorkspace()
          await load()
        } catch (failure) {
          setError(describeError(failure))
        } finally {
          setBusyId(null)
        }
      }

      function toggleSelected(id, checked) {
        setSelectedIds(previous => {
          const next = new Set(previous)
          if (checked) next.add(id)
          else next.delete(id)
          return next
        })
      }

      function removeSelected(id) {
        setSelectedIds(previous => {
          if (!previous.has(id)) return previous
          const next = new Set(previous)
          next.delete(id)
          return next
        })
      }

      async function bulkMutate(route, ids, success) {
        if (ids.length === 0) return
        setBulkBusy(true)
        setError(null)
        setNotice(null)
        const workspaceIds = new Set()
        let ok = 0
        let failed = 0
        let firstFailure
        try {
          for (const id of ids) {
            try {
              const result = await fetchJson(`/session-manager/${route}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ sessionId: id }),
              })
              ok += 1
              if (route === 'trash' || route === 'purge') trashFilter.add(id)
              if (route === 'restore') trashFilter.remove(id)
              if (result.workspaceId) workspaceIds.add(String(result.workspaceId))
            } catch (failure) {
              failed += 1
              if (firstFailure === undefined) firstFailure = failure
            }
          }
          for (const workspaceId of workspaceIds) await refreshSidebarWorkspace(workspaceId)
          await refreshWorkspace()
          await load()
          setSelectedIds(new Set())
          if (failed === 0) setNotice(success(ok))
          else setError(t('error.bulkPartial', { ok, failed, message: describeError(firstFailure) }))
        } finally {
          setBulkBusy(false)
        }
      }

      function openPurgeDialog() {
        if (selectedVisibleIds.length === 0) return
        setPurgeTargets(selectedVisibleIds)
        setPurgeText('')
        setPurgeOpen(true)
      }

      function closePurgeDialog() {
        setPurgeOpen(false)
        setPurgeText('')
        setPurgeTargets([])
      }

      function confirmPurge() {
        if (purgeText !== 'DELETE' || purgeTargets.length === 0) return
        const ids = purgeTargets
        closePurgeDialog()
        void bulkMutate('purge', ids, count => t('notice.bulkPurged', { count }))
      }

      function openDetail(group, session) {
        setDetail({
          kind: view,
          session,
          workspace: { title: group.title || '', path: group.path || '' },
        })
      }

      function closeDetail() {
        setDetail(null)
      }

      function detailRow(key, label, value, options = {}) {
        return h('div', { className: 'sm-detail-row', key },
          h('div', { className: 'sm-detail-label' }, label),
          h('div', { className: `sm-detail-value${options.mono ? ' sm-detail-value--mono' : ''}` }, value))
      }

      function switchView(next) {
        setView(next)
        setError(null)
        setNotice(null)
        setConfirmPurgeId(null)
        setSelectedIds(new Set())
        setPurgeOpen(false)
        setPurgeText('')
        setPurgeTargets([])
        void load()
      }

      const total = view === 'trash' ? trashData.total : sessionData.total
      const groups = view === 'trash' ? trashData.groups : sessionData.groups
      const visibleSessions = groups.flatMap(group => Array.isArray(group.sessions) ? group.sessions : [])
      const visibleIds = new Set(visibleSessions.map(session => session.id))
      const selectedVisibleIds = [...selectedIds].filter(id => visibleIds.has(id))
      const selectedCount = selectedVisibleIds.length

      function groupHeader(group, key) {
        return h('tr', { className: 'sm-group', key },
          h('td', { colSpan: view === 'trash' ? 9 : 8 },
            h('div', { className: 'sm-group-name', title: group.title || '' }, group.title || t('workspace.unknown')),
            h('div', { className: 'sm-group-path', title: group.path || '' }, group.path || t('workspace.noPath'))))
      }

      function workspaceDetailCell(session) {
        const entries = Array.isArray(session.workspaceEntries) ? session.workspaceEntries : []
        return h('td', { className: 'sm-cell sm-workspace-cell' },
          h('div', {
            className: `sm-workspace-detail${entries.length <= 3 ? ' sm-workspace-detail--short' : ''}`,
          },
            entries.length === 0
              ? h('div', { className: 'sm-workspace-line' }, '—')
              : entries.map((entry, index) => h('div', {
                className: 'sm-workspace-line',
                key: `${entry}:${index}`,
                title: entry,
              }, entry))))
      }

      function sessionRow(session, group) {
        const busy = busyId === session.id
        const disabled = busy || bulkBusy
        return h('tr', {
          className: `sm-row${selectedIds.has(session.id) ? ' sm-row--selected' : ''}`,
          key: session.id,
          onDoubleClick: event => {
            if (event.target.closest?.('button, input, a, label')) return
            openDetail(group, session)
          },
        },
          h('td', { className: 'sm-cell sm-select-cell' },
            h('input', {
              type: 'checkbox',
              className: 'sm-checkbox',
              checked: selectedIds.has(session.id),
              disabled: bulkBusy,
              title: t('aria.selectSession'),
              'aria-label': `${t('aria.selectSession')}: ${session.title || t('untitled')}`,
              onChange: event => { toggleSelected(session.id, event.target.checked) },
            })),
          h('td', { className: 'sm-cell' },
            h('span', { className: 'sm-title-text', title: session.title || t('untitled') }, session.title || t('untitled'))),
          h('td', { className: 'sm-cell' },
            h('span', {
              className: `sm-status ${session.archived ? 'sm-status--archived' : 'sm-status--active'}`,
            }, session.archived ? t('status.archived') : t('status.active'))),
          h('td', { className: 'sm-cell sm-time' }, formatTime(session.createdAt)),
          h('td', { className: 'sm-cell sm-size' }, formatBytes(session.sizeBytes)),
          h('td', { className: 'sm-cell sm-mono sm-path', title: session.path || '' }, session.path || '—'),
          workspaceDetailCell(session),
          h('td', { className: 'sm-cell sm-actions' },
            h('button', {
              type: 'button',
              className: 'sm-btn',
              disabled,
              title: t('action.detail'),
              onClick: () => { openDetail(group, session) },
            }, t('action.detail')),
            h('button', {
              type: 'button',
              className: 'sm-btn sm-btn--danger',
              disabled,
              title: t('action.delete'),
              onClick: () => { void mutate(session.id, 'trash', () => t('notice.deleted')) },
            }, busy ? h('span', { className: 'sm-spinner', 'aria-hidden': true }) : null, t('action.delete'))))
      }

      function trashRow(session, group) {
        const busy = busyId === session.id
        const disabled = busy || bulkBusy
        const confirming = confirmPurgeId === session.id
        return h('tr', {
          className: `sm-row${selectedIds.has(session.id) ? ' sm-row--selected' : ''}`,
          key: session.id,
          onDoubleClick: event => {
            if (event.target.closest?.('button, input, a, label')) return
            openDetail(group, session)
          },
        },
          h('td', { className: 'sm-cell sm-select-cell' },
            h('input', {
              type: 'checkbox',
              className: 'sm-checkbox',
              checked: selectedIds.has(session.id),
              disabled: bulkBusy,
              title: t('aria.selectSession'),
              'aria-label': `${t('aria.selectSession')}: ${session.title || t('untitled')}`,
              onChange: event => { toggleSelected(session.id, event.target.checked) },
            })),
          h('td', { className: 'sm-cell' },
            h('span', { className: 'sm-title-text', title: session.title || t('untitled') }, session.title || t('untitled'))),
          h('td', { className: 'sm-cell' },
            h('span', {
              className: `sm-status ${session.archived ? 'sm-status--archived' : 'sm-status--active'}`,
            }, session.archived ? t('status.archived') : t('status.active'))),
          h('td', { className: 'sm-cell sm-time' }, formatTime(session.createdAt)),
          h('td', { className: 'sm-cell sm-time' }, formatTime(session.deletedAt)),
          h('td', { className: 'sm-cell sm-size' }, formatBytes(session.sizeBytes)),
          h('td', { className: 'sm-cell sm-mono sm-path', title: session.originalPath || '' }, session.originalPath || '—'),
          workspaceDetailCell(session),
          h('td', { className: 'sm-cell sm-actions' },
            confirming ? null : h('button', {
              type: 'button',
              className: 'sm-btn',
              disabled,
              title: t('action.detail'),
              onClick: () => { openDetail(group, session) },
            }, t('action.detail')),
            h('button', {
              type: 'button',
              className: 'sm-btn sm-btn--primary',
              disabled,
              title: t('action.restore'),
              onClick: () => {
                void mutate(session.id, 'restore', result => result.rehomed
                  ? t('notice.rehomed', { workspace: result.targetTitle || t('workspace.unknown') })
                  : t('notice.restored'))
              },
            }, busy ? h('span', { className: 'sm-spinner', 'aria-hidden': true }) : null, t('action.restore')),
            confirming
              ? h(React.Fragment, null,
                h('button', {
                  type: 'button',
                  className: 'sm-btn sm-btn--danger',
                  disabled,
                  title: t('action.confirmPurge'),
                  onClick: () => { void mutate(session.id, 'purge', () => t('notice.purged')) },
                }, t('action.confirmPurge')),
                h('button', {
                  type: 'button',
                  className: 'sm-btn',
                  disabled,
                  onClick: () => { setConfirmPurgeId(null) },
                }, t('action.cancel')))
              : h('button', {
                type: 'button',
                className: 'sm-btn sm-btn--danger',
                disabled,
                title: t('action.delete'),
                onClick: () => { setConfirmPurgeId(session.id) },
              }, t('action.delete'))))
      }

      const rows = groups.flatMap((group) => {
        const key = `${group.workspaceId || 'unknown'}:${group.path || group.title || ''}`
        const sessions = Array.isArray(group.sessions) ? group.sessions : []
        return [
          groupHeader(group, `${key}:head`),
          ...sessions.map(session => view === 'trash' ? trashRow(session, group) : sessionRow(session, group)),
        ]
      })

      const empty = groups.length === 0
      const body = loading && sessionData.total === 0 && trashData.total === 0
        ? h('div', { className: 'sm-state', role: 'status' }, h('span', { className: 'sm-spinner', 'aria-hidden': true }), h('div', null, t('loading')))
        : empty
          ? h('div', { className: 'sm-state' }, emptyIcon(), h('div', null, t(view === 'trash' ? 'empty.trash' : 'empty.sessions')))
          : h('table', { className: 'sm-table' },
            h('caption', null, t(view === 'trash' ? 'table.trashCaption' : 'table.caption')),
            h('colgroup', null,
              h('col', { style: { width: '5%' } }),
              h('col', { style: { width: view === 'trash' ? '11%' : '17%' } }),
              h('col', { style: { width: view === 'trash' ? '6%' : '6%' } }),
              h('col', { style: { width: '11%' } }),
              view === 'trash' ? h('col', { style: { width: '11%' } }) : null,
              h('col', { style: { width: '6%' } }),
              h('col', { style: { width: view === 'trash' ? '12%' : '18%' } }),
              h('col', { style: { width: view === 'trash' ? '14%' : '22%' } }),
              h('col', { style: { width: view === 'trash' ? '24%' : '15%' } })),
            h('thead', null, h('tr', null,
              h('th', null, t('column.select')),
              h('th', null, t('column.title')),
              h('th', null, t('column.status')),
              h('th', null, t('column.created')),
              view === 'trash' ? h('th', null, t('column.deleted')) : null,
              h('th', null, t('column.size')),
              h('th', null, t(view === 'trash' ? 'column.originalPath' : 'column.path')),
              h('th', null, t('column.workspaceDetail')),
              h('th', { className: 'sm-actions-head' }, t('column.actions')))),
            h('tbody', null, rows))

      return h('div', { className: 'sm-page' },
        h('style', null, CSS),
        h('header', { className: 'sm-header' },
          h('div', { className: 'sm-heading' },
            h('h1', { className: 'sm-title' }, view === 'trash' ? t('trash.title') : t('title')),
            h('p', { className: 'sm-subtitle' }, view === 'trash' ? t('trash.subtitle') : t('subtitle')),
            h('p', { className: 'sm-meta' }, view === 'trash' ? t('trash.count', { count: trashData.total }) : t('count', { count: sessionData.total }))),
          h('div', { className: 'sm-toolbar' },
            h('button', {
              type: 'button',
              className: 'sm-btn',
              disabled: loading || busyId !== null || bulkBusy,
              title: t('aria.refresh'),
              onClick: () => { void load() },
            }, loading ? h('span', { className: 'sm-spinner', 'aria-hidden': true }) : refreshIcon(), t('action.refresh')),
            view === 'trash'
              ? h('button', {
                type: 'button',
                className: 'sm-btn',
                disabled: bulkBusy,
                title: t('aria.back'),
                onClick: () => { switchView('sessions') },
              }, backIcon(), t('action.back'))
              : h('button', {
                type: 'button',
                className: 'sm-btn sm-btn--primary',
                disabled: bulkBusy,
                title: t('aria.trash'),
                onClick: () => { switchView('trash') },
              }, trashIcon(), t('trash.button'), h('span', { className: 'sm-badge' }, String(trashData.total))))),
        error !== null ? h('div', { className: 'sm-alert', role: 'alert' },
          h('span', { className: 'sm-alert-text' }, `${t('error.title')}: ${error}`),
          h('button', { type: 'button', className: 'sm-btn', onClick: () => { void load() } }, t('action.retry'))) : null,
        notice !== null ? h('div', { className: 'sm-notice', role: 'status' }, notice) : null,
        h('div', { className: 'sm-table-toolbar' },
          view === 'trash'
            ? h(React.Fragment, null,
              h('button', {
                type: 'button',
                className: `sm-btn${selectedCount > 0 ? ' sm-btn--primary' : ''}`,
                disabled: selectedCount === 0 || bulkBusy || busyId !== null || loading,
                'aria-busy': bulkBusy ? 'true' : undefined,
                onClick: () => {
                  void bulkMutate('restore', selectedVisibleIds, count => t('notice.bulkRestored', { count }))
                },
              }, selectedCount > 0 ? t('action.restoreCount', { count: selectedCount }) : t('action.restore')),
              h('button', {
                type: 'button',
                className: `sm-btn${selectedCount > 0 ? ' sm-btn--danger' : ''}`,
                disabled: selectedCount === 0 || bulkBusy || busyId !== null || loading,
                onClick: openPurgeDialog,
              }, selectedCount > 0 ? t('action.deleteCount', { count: selectedCount }) : t('action.delete')))
            : h('button', {
              type: 'button',
              className: `sm-btn${selectedCount > 0 ? ' sm-btn--danger' : ''}`,
              disabled: selectedCount === 0 || bulkBusy || busyId !== null || loading,
              'aria-busy': bulkBusy ? 'true' : undefined,
              onClick: () => {
                void bulkMutate('trash', selectedVisibleIds, count => t('notice.bulkDeleted', { count }))
              },
            }, selectedCount > 0 ? t('action.deleteCount', { count: selectedCount }) : t('action.delete'))),
        h('main', { className: 'sm-body', 'aria-busy': loading ? 'true' : 'false' }, body),
        purgeOpen ? h('div', { className: 'sm-modal-backdrop', role: 'presentation' },
          h('div', {
            className: 'sm-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'sm-purge-title',
          },
          h('h2', { id: 'sm-purge-title', className: 'sm-modal-title' }, t('purge.title')),
          h('p', { className: 'sm-modal-text' }, t('purge.warning', { count: purgeTargets.length })),
          h('label', { className: 'sm-modal-label', htmlFor: 'sm-purge-input' }, t('purge.instruction')),
          h('input', {
            id: 'sm-purge-input',
            className: 'sm-modal-input',
            type: 'text',
            value: purgeText,
            autoFocus: true,
            autoComplete: 'off',
            spellCheck: false,
            placeholder: 'DELETE',
            onChange: event => { setPurgeText(event.target.value) },
          }),
          h('div', { className: 'sm-modal-footer' },
            h('button', {
              type: 'button',
              className: 'sm-btn',
              onClick: closePurgeDialog,
            }, t('action.cancel')),
            h('button', {
              type: 'button',
              className: `sm-btn${purgeText === 'DELETE' ? ' sm-btn--danger' : ''}`,
              disabled: purgeText !== 'DELETE' || bulkBusy,
              onClick: confirmPurge,
            }, t('action.confirm'))))) : null,
        detail ? h('div', { className: 'sm-modal-backdrop', role: 'presentation' },
          h('div', {
            className: 'sm-modal sm-modal--detail',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'sm-detail-title',
          },
          h('h2', { id: 'sm-detail-title', className: 'sm-modal-title' }, t('detail.title')),
          h('div', { className: 'sm-detail-list' },
            detailRow('workspace', t('detail.workspace'),
              h(React.Fragment, null,
                h('div', { className: 'sm-detail-workspace' }, detail.workspace.title || t('workspace.unknown')),
                h('div', { className: 'sm-detail-path' }, detail.workspace.path || t('workspace.noPath')))),
            detailRow('id', t('column.id'), detail.session.id, { mono: true }),
            detailRow('title', t('column.title'), detail.session.title || t('untitled')),
            detailRow('status', t('column.status'),
              h('span', {
                className: `sm-status ${detail.session.archived ? 'sm-status--archived' : 'sm-status--active'}`,
              }, detail.session.archived ? t('status.archived') : t('status.active'))),
            detailRow('created', t('column.created'), formatTime(detail.session.createdAt)),
            detail.kind === 'trash'
              ? detailRow('deleted', t('column.deleted'), formatTime(detail.session.deletedAt))
              : null,
            detailRow('size', t('column.size'), formatBytes(detail.session.sizeBytes)),
            detailRow('path', t(detail.kind === 'trash' ? 'column.originalPath' : 'column.path'),
              detail.kind === 'trash'
                ? (detail.session.originalPath || '—')
                : (detail.session.path || '—'),
              { mono: true }),
            detailRow('workspaceDetail', t('column.workspaceDetail'),
              Array.isArray(detail.session.workspaceEntries) && detail.session.workspaceEntries.length > 0
                ? h('div', { className: 'sm-detail-lines' },
                  detail.session.workspaceEntries.map((entry, index) => h('div', {
                    className: 'sm-detail-line',
                    key: `${entry}:${index}`,
                  }, entry)))
                : '—')),
          h('div', { className: 'sm-modal-footer' },
            h('button', {
              type: 'button',
              className: 'sm-btn',
              onClick: closeDetail,
            }, t('action.close'))))) : null)
    }

    const LocaleContext = React.createContext(null)
    const ManagerContext = React.createContext(null)

    return {
      inject: ['slots', 'locale', 'sessions', 'workspaces'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        for (const [localeId, dict] of Object.entries(DICTS)) {
          ctx.effect(() => ctx.locale.register(NS, localeId, dict), `session-manager locale ${localeId}`)
        }

        // DSH keeps an idle Agent/Session alive after its log moves to trash.
        // Detaching it from the Workspace therefore makes the sidebar show it
        // as "Ungrouped". Filter those trash ids out of the client catalog;
        // this is display-only and never archives the Host Session.
        const HIDDEN_STORAGE_KEY = 'session-manager.hidden-sessions.v1'
        function loadHiddenIds() {
          try {
            const parsed = JSON.parse(localStorage.getItem(HIDDEN_STORAGE_KEY) || '[]')
            return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []
          } catch {
            return []
          }
        }
        const hiddenTrashIds = new Set(loadHiddenIds())
        function saveHiddenIds() {
          try {
            localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify([...hiddenTrashIds]))
          } catch {
            // Storage may be unavailable; the in-memory filter still works.
          }
        }
        const sessionsService = ctx.sessions
        let syncPending = false
        function syncHiddenSessions() {
          const store = sessionsService.list
          let snapshot
          try {
            snapshot = store.getSnapshot()
          } catch {
            return
          }
          if (typeof store.set !== 'function') {
            // Compatibility fallback for a Client build whose store face is
            // not writable: relay a synthetic removal through the session
            // controller's list sink.
            if (typeof sessionsService.handleSessionRemoved === 'function') {
              for (const id of hiddenTrashIds) {
                if (snapshot.ids.includes(id)) sessionsService.handleSessionRemoved(id)
              }
            }
            return
          }
          const hidden = snapshot.ids.filter(id => hiddenTrashIds.has(String(id)))
          if (hidden.length === 0) return
          const ids = snapshot.ids.filter(id => !hiddenTrashIds.has(String(id)))
          const byId = { ...snapshot.byId }
          for (const id of hidden) delete byId[String(id)]
          try {
            // Display-only filter: the Resident Session and the Host catalog
            // stay intact, so Restore can re-add the row without side effects.
            store.set({ ...snapshot, ids, byId })
          } catch (failure) {
            console.warn('[session-manager] could not hide trashed session:', failure)
          }
        }
        function scheduleHiddenSync() {
          if (syncPending) return
          syncPending = true
          queueMicrotask(() => {
            syncPending = false
            syncHiddenSessions()
          })
        }
        const trashFilter = {
          add(id) {
            if (!id) return
            hiddenTrashIds.add(String(id))
            saveHiddenIds()
            scheduleHiddenSync()
          },
          remove(id) {
            if (!id) return
            hiddenTrashIds.delete(String(id))
            saveHiddenIds()
          },
        }
        const managerValue = { ctx, trashFilter }
        ctx.effect(() => sessionsService.list.subscribe(scheduleHiddenSync), 'session-manager: hide trashed sessions')
        syncHiddenSessions()
        // Existing trash entries survive a reload; hydrate the filter once so
        // they never surface as an ungrouped row after a page refresh.
        void fetchJson('/session-manager/trash').then((data) => {
          for (const group of Array.isArray(data.groups) ? data.groups : []) {
            for (const session of Array.isArray(group.sessions) ? group.sessions : []) {
              if (session && session.id) hiddenTrashIds.add(String(session.id))
            }
          }
          saveHiddenIds()
          syncHiddenSessions()
        }).catch((failure) => {
          console.warn('[session-manager] could not hydrate trashed sessions:', failure)
        })

        function SidebarEntry({ size = 16, active = false }) {
          return panelIcon(size, active)
        }

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'session-manager',
          order: 15,
          label: () => t('title'),
        }, SidebarEntry))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'session-manager',
        }, function SessionManagerPage() {
          return h(LocaleContext.Provider, { value: ctx.locale },
            h(ManagerContext.Provider, { value: managerValue },
              h(Page)))
        }))
      },
    }
  },
})
