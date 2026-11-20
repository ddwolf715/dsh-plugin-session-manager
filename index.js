/**
 * Session manager — Host half.
 *
 * Owns the durable operations behind the sidebar panel:
 *  - list Sessions grouped by Workspace,
 *  - move one Session's whole storage directory into this bundle's `trash/`,
 *  - restore it to its original Workspace (or the default Workspace),
 *  - delete one trash entry permanently.
 *
 * The browser reaches these operations through the authenticated
 * `/session-manager` route registered on `ctx.webServer`.
 */
import { createReadStream } from 'node:fs'
import { cp, mkdir, open, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_TRASH_DIR = join(PLUGIN_DIR, 'trash')
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const PROJECTION_CACHE_DIR = join(DSH_HOME, 'storages', 'session_projcache', 'sessions')
const META_FILE = 'trash-meta.json'
const CACHE_FILE = 'projection-cache.json'
const ROUTE_PREFIX = '/session-manager'
const WORKSPACE_ENTRY_CACHE = new Map()

/** Required Host services: the HTTP carrier plus the storage and Workspace owners. */
export const inject = ['webServer', 'workspaceRegistry', 'sessionPersistence', 'sessionQuery']

/** A caller-facing failure with an HTTP status and a stable code. */
class ActionError extends Error {
  /**
   * @param {string} code - stable error code shown to the Client.
   * @param {string} message - human-readable explanation.
   * @param {number} [status] - HTTP status.
   */
  constructor(code, message, status = 400) {
    super(message)
    this.name = 'ActionError'
    this.code = code
    this.status = status
  }
}

/**
 * Host plugin body.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host root context.
 */
export function apply(ctx) {
  const trashRoot = DEFAULT_TRASH_DIR
  // Keep every mutating operation in one queue: two trash/restore requests for
  // the same Session must never interleave their filesystem moves.
  let tail = Promise.resolve()
  const serialize = (operation) => {
    const run = tail.then(operation, operation)
    tail = run.catch(() => {})
    return run
  }

  void ensureTrashRoot(trashRoot).catch((error) => {
    ctx.logger?.warn?.(`session-manager: could not create trash directory: ${String(error)}`)
  })

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: (request, response) => handleRequest(ctx, trashRoot, request, response, serialize),
  }), 'session-manager: authenticated route')
}

/**
 * Answer one route request.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} trashRoot - absolute trash directory.
 * @param {import('node:http').IncomingMessage} request - HTTP request.
 * @param {import('node:http').ServerResponse} response - HTTP response.
 * @param {(operation: () => Promise<unknown>) => Promise<unknown>} serialize - mutation queue.
 */
async function handleRequest(ctx, trashRoot, request, response, serialize) {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    const method = request.method || 'GET'

    if (method === 'GET' && url.pathname === `${ROUTE_PREFIX}/sessions`) {
      respond(response, 200, { ok: true, ...(await listSessions(ctx)) })
      return
    }
    if (method === 'GET' && url.pathname === `${ROUTE_PREFIX}/trash`) {
      respond(response, 200, { ok: true, ...(await listTrash(ctx, trashRoot)) })
      return
    }
    if (method === 'POST' && url.pathname === `${ROUTE_PREFIX}/trash`) {
      const body = await readBody(request)
      respond(response, 200, { ok: true, ...(await serialize(() => trashSession(ctx, trashRoot, body.sessionId))) })
      return
    }
    if (method === 'POST' && url.pathname === `${ROUTE_PREFIX}/restore`) {
      const body = await readBody(request)
      respond(response, 200, { ok: true, ...(await serialize(() => restoreSession(ctx, trashRoot, body.sessionId))) })
      return
    }
    if (method === 'POST' && url.pathname === `${ROUTE_PREFIX}/purge`) {
      const body = await readBody(request)
      respond(response, 200, { ok: true, ...(await serialize(() => purgeSession(trashRoot, body.sessionId))) })
      return
    }
    respond(response, 404, { ok: false, code: 'not-found', error: 'Unknown session-manager endpoint.' })
  } catch (error) {
    const failure = error instanceof ActionError
      ? error
      : new ActionError('internal', error instanceof Error ? error.message : String(error), 500)
    if (failure.status >= 500) {
      ctx.logger?.warn?.(`session-manager: ${failure.code}: ${failure.message}`)
    }
    if (!response.headersSent) {
      respond(response, failure.status, {
        ok: false,
        code: failure.code,
        error: failure.message,
      })
    } else {
      response.destroy()
    }
  }
}

/**
 * Write one JSON response.
 * @param {import('node:http').ServerResponse} response - response owner.
 * @param {number} status - HTTP status.
 * @param {unknown} value - JSON-serializable body.
 */
function respond(response, status, value) {
  const body = JSON.stringify(value)
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.setHeader('content-length', Buffer.byteLength(body))
  response.end(body)
}

/**
 * Read a small JSON body.
 * @param {import('node:http').IncomingMessage} request - request stream.
 * @returns {Promise<Record<string, unknown>>} parsed object.
 */
async function readBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16 * 1024) throw new ActionError('body-too-large', 'Request body is too large.', 413)
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  let value
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new ActionError('bad-json', 'Request body is not valid JSON.')
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ActionError('bad-body', 'Request body must be a JSON object.')
  }
  return value
}

/**
 * Validate a Session id used as a directory name.
 * @param {unknown} value - caller value.
 * @returns {string} the validated id.
 */
function requireSessionId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u.test(value) || value.includes('..')) {
    throw new ActionError('bad-session-id', 'Invalid session id.')
  }
  return value
}

/**
 * Collect candidate workspace paths from one tool call.
 * @param {string} name - tool name.
 * @param {Record<string, unknown>} args - parsed tool arguments.
 * @param {Set<string>} paths - accumulator.
 */
function collectToolPaths(name, args, paths) {
  const add = value => {
    if (typeof value === 'string' && value.trim() !== '') paths.add(value.trim())
  }
  if (name === 'write' || name === 'edit') {
    add(args.file_path ?? args.path)
    return
  }
  if (name === 'str_replace_editor') {
    add(args.path ?? args.file_path)
    return
  }
  if (name === 'present') {
    for (const file of Array.isArray(args.files) ? args.files : []) {
      add(typeof file === 'string' ? file : file?.path)
    }
    return
  }
  if (name === 'apply_patch') {
    const patch = typeof args === 'string'
      ? args
      : (args.patch ?? args.input ?? args.diff ?? args.content)
    if (typeof patch !== 'string') return
    for (const match of patch.matchAll(/^\*\*\* (?:Add File|Update File|Move to):\s*(.+)$/gmu)) {
      add(match[1])
    }
    return
  }
  if (name === 'bash' && typeof args.command === 'string') {
    collectBashPaths(args.command, paths)
  }
}

/**
 * Conservative extraction of creation-like paths from shell commands.
 * @param {string} command - shell command text.
 * @param {Set<string>} paths - accumulator.
 */
function collectBashPaths(command, paths) {
  const addToken = token => {
    let value = token.replace(/^['"]|['"]$/gu, '')
    if (value === '' || value.startsWith('-') || value.startsWith('$') || value.startsWith('~')) return
    if (/[(){}<>|&;$*?`]/u.test(value) || /^[0-9]+$/u.test(value)) return
    paths.add(value)
  }
  for (const segment of command.split(/&&|\|\||;|\n/u)) {
    const text = segment.trim()
    if (text === '') continue
    const tokens = text.match(/"[^"]*"|'[^']*'|[^\s]+/gu) ?? []
    if (tokens.length === 0) continue
    const commandName = tokens[0].replace(/^.*\//u, '')
    if (commandName === 'mkdir' || commandName === 'touch') {
      for (const token of tokens.slice(1)) addToken(token)
    } else if (commandName === 'cp' || commandName === 'mv' || commandName === 'ln') {
      const positional = tokens.slice(1).filter(token => !token.startsWith('-'))
      if (positional.length > 0) addToken(positional[positional.length - 1])
    } else if (commandName === 'tee') {
      for (const token of tokens.slice(1)) addToken(token)
    }
    for (const match of text.matchAll(/(?:^|\s)(?:>>?)\s*([^\s;&|]+)/gu)) {
      addToken(match[1])
    }
  }
}

/**
 * Map a path to the top-level workspace entry it belongs to.
 * @param {string} workspacePath - workspace directory.
 * @param {string} candidate - tool path, relative or absolute.
 * @param {Set<string>} topLevel - accumulator of top-level names.
 */
function collectTopLevel(workspacePath, candidate, topLevel) {
  if (typeof candidate !== 'string' || candidate === '') return
  if (candidate.startsWith('~')) return
  const absolute = isAbsolute(candidate) ? candidate : resolve(workspacePath, candidate)
  const rel = relative(workspacePath, absolute)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return
  const top = rel.split(/[\\/]/u)[0]
  if (top !== '' && top !== '.' && top !== '..') topLevel.add(top)
}

/**
 * Read the top-level workspace entries a Session created or touched, based
 * on successful file-tool and conservative shell creation paths.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} sessionId - Session id.
 * @param {string} workspacePath - Workspace directory.
 * @returns {Promise<string[]>} display entries, directory names ending in `/`.
 */
async function workspaceEntriesFor(ctx, sessionId, workspacePath) {
  if (!workspacePath) return []
  let snapshot
  try {
    snapshot = await ctx.sessionPersistence.stat(sessionId)
  } catch {
    return []
  }
  if (snapshot?.location?.path === undefined) return []
  let fileStat
  try {
    fileStat = await stat(snapshot.location.path)
  } catch {
    return []
  }
  const cacheKey = `${workspacePath}:${snapshot.location.path}:${fileStat.mtimeMs}:${fileStat.size}`
  const cached = WORKSPACE_ENTRY_CACHE.get(sessionId)
  if (cached !== undefined && cached.key === cacheKey) return cached.entries

  let events
  try {
    events = await ctx.sessionQuery.inspectSession(sessionId, session => session.snapshotEvents())
  } catch {
    return []
  }
  const paths = new Set()
  for (const event of events) {
    if (event?.type !== 'tool/call' || typeof event.data?.name !== 'string') continue
    const raw = event.data.arguments
    if (typeof raw !== 'string') continue
    let args
    try {
      args = JSON.parse(raw)
    } catch {
      continue
    }
    if (args !== null && typeof args === 'object' && !Array.isArray(args)) {
      collectToolPaths(event.data.name, args, paths)
    }
  }

  const topLevel = new Set()
  for (const candidate of paths) collectTopLevel(workspacePath, candidate, topLevel)
  const entries = []
  for (const name of topLevel) {
    let info
    try {
      info = await stat(join(workspacePath, name))
    } catch {
      continue
    }
    entries.push(info.isDirectory() ? `${name}/` : name)
  }
  entries.sort((left, right) => left.localeCompare(right))
  WORKSPACE_ENTRY_CACHE.set(sessionId, { key: cacheKey, entries })
  return entries
}

/**
 * List every persisted Session that a Workspace accounts for.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @returns {Promise<{groups: unknown[], total: number}>} table payload.
 */
async function listSessions(ctx) {
  const workspaces = ctx.workspaceRegistry.list()
  const snapshots = await ctx.sessionPersistence.list()
  const byId = new Map(snapshots.map(snapshot => [String(snapshot.header.id), snapshot]))
  const archived = new Set(ctx.workspaceRegistry.archivedSessionIds.map(String))
  const seen = new Set()
  const collected = []
  const groups = []

  for (const workspace of workspaces) {
    const rows = []
    for (const rawId of workspace.sessionIds) {
      const id = String(rawId)
      if (seen.has(id)) continue
      const snapshot = byId.get(id)
      if (snapshot?.location?.path === undefined) continue
      seen.add(id)
      collected.push(id)
      rows.push({ id, snapshot, workspacePath: workspace.path })
    }
    if (rows.length > 0) groups.push({ workspace, rows })
  }

  const titles = await readTitles(ctx, collected)
  const entriesById = new Map()
  await Promise.all(groups.flatMap(({ rows }) => rows.map(async row => {
    entriesById.set(row.id, await workspaceEntriesFor(ctx, row.id, row.workspacePath))
  })))
  return {
    total: collected.length,
    groups: groups.map(({ workspace, rows }) => ({
      workspaceId: String(workspace.id),
      title: workspace.title || workspace.path,
      path: workspace.path,
      sessions: rows.map(({ id, snapshot }) => ({
        id,
        title: titles.get(id) || '',
        createdAt: snapshot.header.createdAt,
        sizeBytes: Number(snapshot.sizeBytes ?? 0),
        path: snapshot.location.path,
        cwd: snapshot.header.cwd ?? '',
        archived: archived.has(id),
        workspaceEntries: entriesById.get(id) ?? [],
      })),
    })),
  }
}

/**
 * Read durable titles in one query, tolerating an unreadable log per Session.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string[]} ids - Session ids.
 * @returns {Promise<Map<string, string>>} id to title.
 */
async function readTitles(ctx, ids) {
  const titles = new Map()
  if (ids.length === 0) return titles
  try {
    const results = await ctx.sessionQuery.readTitleSnapshots(ids)
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const title = result.value?.title?.title
      if (typeof title === 'string' && title.length > 0) titles.set(String(result.sessionId), title)
    }
  } catch (error) {
    ctx.logger?.warn?.(`session-manager: title read failed: ${String(error)}`)
  }
  return titles
}

/**
 * List every trash entry grouped by its recorded Workspace.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} trashRoot - absolute trash directory.
 * @returns {Promise<{groups: unknown[], total: number}>} trash payload.
 */
async function listTrash(ctx, trashRoot) {
  await ensureTrashRoot(trashRoot)
  const workspaces = ctx.workspaceRegistry.list()
  const current = new Map(workspaces.map(workspace => [String(workspace.id), workspace]))
  const order = new Map(workspaces.map((workspace, index) => [String(workspace.id), index]))
  const groups = new Map()
  let total = 0

  for (const entry of await readdir(trashRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const id = entry.name
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u.test(id) || id.includes('..')) continue
    const directory = join(trashRoot, id)
    let meta
    try {
      meta = JSON.parse(await readFile(join(directory, META_FILE), 'utf8'))
    } catch {
      continue
    }
    if (meta === null || typeof meta !== 'object' || typeof meta.id !== 'string') continue
    const workspaceId = typeof meta.workspaceId === 'string' ? meta.workspaceId : ''
    const workspace = workspaceId === '' ? undefined : current.get(workspaceId)
    const key = workspaceId !== '' ? workspaceId : (typeof meta.workspacePath === 'string' ? meta.workspacePath : 'unknown')
    let group = groups.get(key)
    if (group === undefined) {
      group = {
        workspaceId: workspaceId === '' ? null : workspaceId,
        title: workspace?.title || meta.workspaceTitle || '',
        path: workspace?.path || meta.workspacePath || '',
        sessions: [],
      }
      groups.set(key, group)
    }
    group.sessions.push({
      id,
      title: typeof meta.title === 'string' ? meta.title : '',
      createdAt: Number(meta.createdAt) || 0,
      sizeBytes: Number(meta.sizeBytes) || 0,
      originalPath: typeof meta.originalPath === 'string' ? meta.originalPath : '',
      deletedAt: typeof meta.deletedAt === 'string' ? meta.deletedAt : '',
      cwd: typeof meta.cwd === 'string' ? meta.cwd : '',
      archived: meta.archived === true,
      workspaceEntries: Array.isArray(meta.workspaceEntries)
        ? meta.workspaceEntries.filter(entry => typeof entry === 'string')
        : [],
    })
    total += 1
  }

  const ordered = [...groups.values()].sort((left, right) => {
    const leftRank = order.get(left.workspaceId) ?? Number.MAX_SAFE_INTEGER
    const rightRank = order.get(right.workspaceId) ?? Number.MAX_SAFE_INTEGER
    return leftRank - rightRank || left.title.localeCompare(right.title)
  })
  for (const group of ordered) {
    group.sessions.sort((left, right) => String(right.deletedAt).localeCompare(String(left.deletedAt)))
  }
  return { total, groups: ordered }
}

/**
 * Move one Session's storage into trash and detach it from its Workspaces.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} trashRoot - absolute trash directory.
 * @param {unknown} rawId - requested Session id.
 * @returns {Promise<{workspaceId: string | null}>} operation result.
 */
async function trashSession(ctx, trashRoot, rawId) {
  const id = requireSessionId(rawId)
  // Use the same activity waterfall that gates DSH's own archive action:
  // an idle Agent (DSH keeps one per loaded Session) is not activity, while a
  // running turn, job, subagent, or schedule protects the Session.
  const activity = await ctx.waterfall(
    'workspace/session-activity',
    { sessionId: id },
    () => Promise.resolve([]),
  )
  if (activity.length > 0) {
    const kinds = activity.map(entry => entry.kind).join(', ')
    throw new ActionError(
      'session-active',
      `This session still has running work (${kinds}). Stop it before deleting the session.`,
      409,
    )
  }

  const snapshot = await ctx.sessionPersistence.stat(id)
  if (snapshot?.location?.path === undefined) {
    throw new ActionError('session-not-found', 'The session storage file was not found.', 404)
  }

  const registry = ctx.workspaceRegistry
  const memberships = registry.list().filter(workspace => workspace.sessionIds.includes(id))
  const primary = memberships[0]
  const archived = registry.archivedSessionIds.includes(id)
  const pinned = registry.pinnedSessionIds.includes(id)
  const title = (await readTitles(ctx, [id])).get(id) || ''
  const workspaceEntries = primary?.path === undefined
    ? []
    : await workspaceEntriesFor(ctx, id, primary.path)

  const directory = dirname(snapshot.location.path)
  const trashDirectory = join(trashRoot, id)
  if (await pathExists(trashDirectory)) {
    throw new ActionError('trash-exists', 'A trash entry with this session id already exists.', 409)
  }

  const cachePath = join(PROJECTION_CACHE_DIR, `${id}.json`)
  const hasCache = await pathExists(cachePath)
  const meta = {
    version: 1,
    id,
    title,
    createdAt: snapshot.header.createdAt,
    sizeBytes: Number(snapshot.sizeBytes ?? 0),
    originalPath: snapshot.location.path,
    originalSessionDir: directory,
    cwd: snapshot.header.cwd ?? '',
    workspaceId: primary === undefined ? null : String(primary.id),
    workspaceTitle: primary?.title ?? null,
    workspacePath: primary?.path ?? null,
    archived,
    pinned,
    workspaceEntries,
    deletedAt: new Date().toISOString(),
  }

  let moved = false
  let cacheMoved = false
  try {
    if (archived) await registry.unarchiveSession(id)
    if (pinned) await registry.unpinSession(id)
    for (const workspace of memberships) await workspace.detachSession(id)
    await ensureTrashRoot(trashRoot)
    await moveDirectory(directory, trashDirectory)
    moved = true
    if (hasCache) {
      await moveFile(cachePath, join(trashDirectory, CACHE_FILE))
      cacheMoved = true
    }
    await writeFile(join(trashDirectory, META_FILE), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
  } catch (error) {
    if (cacheMoved) {
      try {
        await moveFile(join(trashDirectory, CACHE_FILE), cachePath)
      } catch {
        // Best effort: the cache is derived data.
      }
    }
    if (moved) {
      try {
        await moveDirectory(trashDirectory, directory)
      } catch {
        // Keep the original failure; the entry remains in trash.
      }
    }
    for (const workspace of memberships) {
      try {
        await workspace.attachSession(id)
      } catch {
        // Membership rollback is best effort; the session files are intact.
      }
    }
    if (archived) {
      try {
        await registry.archiveSession(id)
      } catch {
        // Best effort.
      }
    }
    if (pinned) {
      try {
        await registry.pinSession(id)
      } catch {
        // Best effort.
      }
    }
    throw error
  }

  return { workspaceId: primary === undefined ? null : String(primary.id) }
}

/**
 * Restore one trash entry.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} trashRoot - absolute trash directory.
 * @param {unknown} rawId - requested Session id.
 * @returns {Promise<{workspaceId: string, rehomed: boolean, targetTitle: string}>} operation result.
 */
async function restoreSession(ctx, trashRoot, rawId) {
  const id = requireSessionId(rawId)
  const trashDirectory = join(trashRoot, id)
  if (!(await pathExists(trashDirectory))) {
    throw new ActionError('trash-missing', 'The trash entry was not found.', 404)
  }
  if (await ctx.sessionPersistence.stat(id) !== undefined) {
    throw new ActionError('session-exists', 'A session with this id already exists in storage.', 409)
  }

  let meta
  try {
    meta = JSON.parse(await readFile(join(trashDirectory, META_FILE), 'utf8'))
  } catch {
    throw new ActionError('trash-meta-missing', 'The trash entry has no readable metadata.', 500)
  }
  const originalDirectory = typeof meta.originalSessionDir === 'string' ? meta.originalSessionDir : ''
  if (originalDirectory === '') {
    throw new ActionError('trash-meta-invalid', 'The trash entry has no original session directory.', 500)
  }

  const registry = ctx.workspaceRegistry
  const original = typeof meta.workspaceId === 'string' ? registry.get(meta.workspaceId) : undefined
  const target = original !== undefined && await workspaceIsUsable(original)
    ? original
    : await defaultWorkspace(ctx)

  const cwd = typeof meta.cwd === 'string' ? meta.cwd : ''
  const canonicalCwd = cwd === '' ? null : await realpathOrNull(cwd)
  const rehome = canonicalCwd === null || canonicalCwd !== target.path

  if (!rehome) {
    await restoreInPlace(ctx, id, trashDirectory, originalDirectory, target, meta)
    return { workspaceId: String(target.id), rehomed: false, targetTitle: target.title }
  }

  await rehomeInto(ctx, id, trashRoot, trashDirectory, originalDirectory, target, meta)
  return { workspaceId: String(target.id), rehomed: true, targetTitle: target.title }
}

/**
 * Restore the files to their original directory and attach the Session.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} id - Session id.
 * @param {string} trashDirectory - current trash entry.
 * @param {string} originalDirectory - original session directory.
 * @param {{ attachSession: (id: string) => Promise<void>, id: string }} target - Workspace to attach.
 * @param {Record<string, unknown>} meta - trash metadata.
 */
async function restoreInPlace(ctx, id, trashDirectory, originalDirectory, target, meta) {
  if (await pathExists(originalDirectory)) {
    throw new ActionError('restore-target-exists', 'The original session directory already exists.', 409)
  }
  await mkdir(dirname(originalDirectory), { recursive: true })
  const cacheInTrash = join(trashDirectory, CACHE_FILE)
  const cachePath = join(PROJECTION_CACHE_DIR, `${id}.json`)
  const hasCache = await pathExists(cacheInTrash)
  let movedCache = false

  let metaRemoved = false
  try {
    await rm(join(trashDirectory, META_FILE), { force: true })
    metaRemoved = true
    if (hasCache) {
      await mkdir(PROJECTION_CACHE_DIR, { recursive: true })
      await moveFile(cacheInTrash, cachePath)
      movedCache = true
    }
    await moveDirectory(trashDirectory, originalDirectory)
    await target.attachSession(id)
  } catch (error) {
    if (await pathExists(originalDirectory)) {
      try {
        await moveDirectory(originalDirectory, trashDirectory)
      } catch {
        // Keep the original failure.
      }
    }
    if (movedCache) {
      try {
        await moveFile(cachePath, join(trashDirectory, CACHE_FILE))
      } catch {
        // Derived data.
      }
    }
    if (metaRemoved) {
      try {
        await writeFile(join(trashDirectory, META_FILE), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
      } catch {
        // Metadata is already available from the caller.
      }
    }
    throw error
  }
}

/**
 * Rehome a Session whose original Workspace is gone: replay its log into a new
 * generation whose header cwd is the target Workspace.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} id - Session id.
 * @param {string} trashRoot - absolute trash directory.
 * @param {string} trashDirectory - current trash entry.
 * @param {string} originalDirectory - original session directory.
 * @param {{ path: string, attachSession: (id: string) => Promise<void> }} target - target Workspace.
 * @param {Record<string, unknown>} meta - trash metadata.
 */
async function rehomeInto(ctx, id, trashRoot, trashDirectory, originalDirectory, target, meta) {
  if (await pathExists(originalDirectory)) {
    throw new ActionError('restore-target-exists', 'The original session directory already exists.', 409)
  }
  await mkdir(dirname(originalDirectory), { recursive: true })
  await moveDirectory(trashDirectory, originalDirectory)

  const replayPath = join(trashRoot, `${id}.replay.ndjson`)
  let reader
  let writer
  let createdSession = false
  try {
    reader = await ctx.sessionPersistence.open(id, 'read')
    const header = { ...reader.header, cwd: target.path }
    const inheritedEventCount = reader.inheritedEventCount

    const replay = await open(replayPath, 'w')
    try {
      let offset = 0
      for (;;) {
        const result = await reader.read(offset, 250)
        const events = result.events
        if (events.length === 0) break
        const lines = `${events.map(event => JSON.stringify(event)).join('\n')}\n`
        await replay.write(lines)
        offset += events.length
      }
    } finally {
      await replay.close()
    }
    await reader.close()
    reader = undefined

    // The original directory must leave the storage root before the replayed
    // generation can be created under the same id.
    await moveDirectory(originalDirectory, trashDirectory)

    writer = await ctx.sessionPersistence.create(header, { inheritedEventCount })
    createdSession = true
    const input = createReadStream(replayPath, { encoding: 'utf8' })
    const lines = createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY })
    let batch = []
    for await (const line of lines) {
      if (line.trim() === '') continue
      batch.push(JSON.parse(line))
      if (batch.length >= 200) {
        await writer.append(batch)
        batch = []
      }
    }
    if (batch.length > 0) await writer.append(batch)
    await writer.flush()
    await writer.close()
    writer = undefined

    await target.attachSession(id)
  } catch (error) {
    if (reader !== undefined) {
      try {
        await reader.close()
      } catch {
        // Keep the original failure.
      }
    }
    if (writer !== undefined) {
      try {
        await writer.close()
      } catch {
        // Keep the original failure.
      }
    }
    // Remove a partially created generation, then put the original files back
    // into trash so the entry can be retried. Only touch the storage path when
    // this call really created a new generation: a failed create would
    // otherwise make `stat` report the original log and delete it.
    if (createdSession) {
      try {
        const created = await ctx.sessionPersistence.stat(id)
        if (created?.location?.path !== undefined) {
          await rm(dirname(created.location.path), { recursive: true, force: true })
        }
      } catch {
        // Best effort.
      }
    }
    try {
      if (await pathExists(originalDirectory)) await moveDirectory(originalDirectory, trashDirectory)
    } catch {
      // Keep the original failure.
    }
    throw error
  } finally {
    await rm(replayPath, { force: true }).catch(() => {})
  }

  // Success: the trash entry is no longer needed.
  try {
    await rm(trashDirectory, { recursive: true, force: true })
  } catch (error) {
    ctx.logger?.warn?.(`session-manager: restored "${id}" but could not remove trash entry: ${String(error)}`)
  }
  await rm(join(PROJECTION_CACHE_DIR, `${id}.json`), { force: true }).catch(() => {})
}

/**
 * Delete one trash entry permanently.
 * @param {string} trashRoot - absolute trash directory.
 * @param {unknown} rawId - requested Session id.
 * @returns {Promise<{id: string}>} operation result.
 */
async function purgeSession(trashRoot, rawId) {
  const id = requireSessionId(rawId)
  const trashDirectory = join(trashRoot, id)
  if (!(await pathExists(trashDirectory))) {
    throw new ActionError('trash-missing', 'The trash entry was not found.', 404)
  }
  await rm(trashDirectory, { recursive: true, force: true })
  return { id }
}

/**
 * Pick the default Workspace, falling back to the first usable registration.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @returns {Promise<any>} a usable Workspace.
 */
async function defaultWorkspace(ctx) {
  const workspaces = ctx.workspaceRegistry.list()
  if (workspaces.length === 0) {
    throw new ActionError('no-workspace', 'No Workspace is registered to receive this session.', 409)
  }
  let defaultId
  try {
    const state = JSON.parse(
      await readFile(join(DSH_HOME, 'storages', 'workspace.json'), 'utf8'),
    )
    defaultId = state?.global?.defaultWorkspaceId
  } catch {
    defaultId = undefined
  }
  const preferred = typeof defaultId === 'string' ? ctx.workspaceRegistry.get(defaultId) : undefined
  const candidates = preferred === undefined
    ? workspaces
    : [preferred, ...workspaces.filter(workspace => workspace.id !== preferred.id)]
  for (const workspace of candidates) {
    if (await workspaceIsUsable(workspace)) return workspace
  }
  throw new ActionError('no-workspace', 'No usable Workspace is registered to receive this session.', 409)
}

/**
 * Whether a Workspace directory currently exists.
 * @param {{ status: () => Promise<'ok' | 'missing-dir'> }} workspace - Workspace entity.
 * @returns {Promise<boolean>} true when usable.
 */
async function workspaceIsUsable(workspace) {
  try {
    return await workspace.status() === 'ok'
  } catch {
    return false
  }
}

/**
 * Resolve an existing directory to its canonical path.
 * @param {string} path - candidate path.
 * @returns {Promise<string | null>} canonical path, or null.
 */
async function realpathOrNull(path) {
  try {
    return await realpath(path)
  } catch {
    return null
  }
}

/**
 * Create the trash directory if needed.
 * @param {string} trashRoot - absolute trash directory.
 */
async function ensureTrashRoot(trashRoot) {
  await mkdir(trashRoot, { recursive: true })
}

/**
 * Check for an existing path.
 * @param {string} path - path to check.
 * @returns {Promise<boolean>} true when it exists.
 */
async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Move a directory, falling back to copy/remove across devices.
 * @param {string} from - source directory.
 * @param {string} to - destination directory.
 */
async function moveDirectory(from, to) {
  try {
    await rename(from, to)
    return
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error
  }
  await cp(from, to, { recursive: true, force: false, errorOnExist: true })
  await rm(from, { recursive: true, force: true })
}

/**
 * Move one file, falling back to copy/remove across devices.
 * @param {string} from - source file.
 * @param {string} to - destination file.
 */
async function moveFile(from, to) {
  try {
    await rename(from, to)
    return
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error
  }
  await cp(from, to, { force: false, errorOnExist: true })
  await rm(from, { force: true })
}
