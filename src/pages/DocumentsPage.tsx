import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Download, Ellipsis, Eye, Folder as FolderIcon, FolderOpen, FolderPlus, Pencil, Trash2, Upload } from 'lucide-react'
import clsx from 'clsx'
import { api, documentUrl } from '@/lib/api'
import { useDataMutation, useSync, useUserMap } from '@/lib/data'
import { diffFields, type ChangeLine, type FieldSpec } from '@/lib/diff'
import { formatBytes, formatMoment } from '@/lib/format'
import { useOnline } from '@/lib/online'
import type { DocumentFile, Folder } from '@/lib/types'
import { Page, PageHeader } from '@/components/AppShell'
import { Button, EmptyState, IconButton, SelectInput, Spinner, TextArea, TextInput } from '@/components/ui'
import { Sheet } from '@/components/Sheet'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { fileKind, KIND_META } from '@/components/documents/fileKinds'
import { PigAvatar } from '@/components/PigAvatar'
import { useToast } from '@/components/Toast'

function stripExtension(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function useFolderOptions(folders: Folder[], exclude?: string) {
  const { t } = useTranslation()
  return useMemo(() => {
    const children = new Map<string | null, Folder[]>()
    for (const folder of folders) {
      const key = folder.parentId ?? null
      children.set(key, [...(children.get(key) ?? []), folder])
    }
    const options = [{ value: '', label: t('documents.root') }]
    const walk = (parent: string | null, depth: number) => {
      for (const folder of (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
        if (folder.id === exclude) continue
        options.push({ value: folder.id, label: `${' '.repeat(depth)}${folder.name}` })
        walk(folder.id, depth + 1)
      }
    }
    walk(null, 1)
    return options
  }, [folders, exclude, t])
}

interface FolderDraft {
  name: string
  parentId: string
}

function FolderSheet({ open, onClose, folder, parentId, folders }: { open: boolean; onClose: () => void; folder: Folder | null; parentId: string | null; folders: Folder[] }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [draft, setDraft] = useState<FolderDraft>({ name: '', parentId: '' })
  const [confirming, setConfirming] = useState(false)
  const [lastOpen, setLastOpen] = useState(false)
  const options = useFolderOptions(folders, folder?.id)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setDraft({ name: folder?.name ?? '', parentId: folder ? folder.parentId ?? '' : parentId ?? '' })
  }
  const specs: FieldSpec<FolderDraft>[] = [
    { key: 'name', label: t('documents.folderName') },
    { key: 'parentId', label: t('documents.location'), format: (value) => folders.find((entry) => entry.id === value)?.name ?? t('documents.root') },
  ]
  const before = folder ? { name: folder.name, parentId: folder.parentId ?? '' } : null
  const mutation = useDataMutation((body: { name: string; parentId: string | null }) =>
    folder
      ? api<Folder>(`/api/documents/folders/${folder.id}`, { method: 'PUT', json: { ...body, version: folder.version } })
      : api<Folder>('/api/documents/folders', { method: 'POST', json: body }),
  )

  return (
    <>
      <Sheet
        open={open && !confirming}
        onClose={onClose}
        title={folder ? t('documents.editFolder') : t('documents.newFolder')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => draft.name.trim() && setConfirming(true)} disabled={!draft.name.trim()}>
              {t('common.review')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextInput label={t('documents.folderName')} value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-autofocus />
          <SelectInput label={t('documents.location')} value={draft.parentId} options={options} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} />
        </div>
      </Sheet>
      <ConfirmChanges
        open={confirming}
        onClose={() => setConfirming(false)}
        mode={folder ? 'update' : 'create'}
        subject={draft.name}
        lines={diffFields(specs, before, draft)}
        onConfirm={async () => {
          try {
            await mutation.mutateAsync({ name: draft.name.trim(), parentId: draft.parentId || null })
            toast.success(folder ? t('documents.folderUpdated') : t('documents.folderCreated'))
            setConfirming(false)
            onClose()
          } catch (error) {
            setConfirming(false)
            toast.error(error)
          }
        }}
      />
    </>
  )
}

interface DocumentDraft {
  name: string
  description: string
  folderId: string
}

function DocumentEditSheet({ document, onClose, folders }: { document: DocumentFile | null; onClose: () => void; folders: Folder[] }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [draft, setDraft] = useState<DocumentDraft>({ name: '', description: '', folderId: '' })
  const [confirming, setConfirming] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)
  const options = useFolderOptions(folders)
  if ((document?.id ?? null) !== lastId) {
    setLastId(document?.id ?? null)
    if (document) setDraft({ name: document.name, description: document.description ?? '', folderId: document.folderId ?? '' })
  }
  const specs: FieldSpec<DocumentDraft>[] = [
    { key: 'name', label: t('documents.name') },
    { key: 'description', label: t('documents.description') },
    { key: 'folderId', label: t('documents.location'), format: (value) => folders.find((entry) => entry.id === value)?.name ?? t('documents.root') },
  ]
  const mutation = useDataMutation((body: { name: string; description: string | null; folderId: string | null }) =>
    api<DocumentFile>(`/api/documents/${document!.id}`, { method: 'PUT', json: { ...body, version: document!.version } }),
  )
  const before = document ? { name: document.name, description: document.description ?? '', folderId: document.folderId ?? '' } : null

  return (
    <>
      <Sheet
        open={document !== null && !confirming}
        onClose={onClose}
        title={t('documents.editDocument')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => draft.name.trim() && setConfirming(true)} disabled={!draft.name.trim()}>
              {t('common.review')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextInput label={t('documents.name')} value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-autofocus />
          <TextArea label={t('documents.description')} value={draft.description} maxLength={2000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <SelectInput label={t('documents.location')} value={draft.folderId} options={options} onChange={(e) => setDraft({ ...draft, folderId: e.target.value })} />
        </div>
      </Sheet>
      <ConfirmChanges
        open={confirming}
        onClose={() => setConfirming(false)}
        mode="update"
        subject={draft.name}
        lines={diffFields(specs, before, draft)}
        onConfirm={async () => {
          try {
            await mutation.mutateAsync({ name: draft.name.trim(), description: draft.description.trim() || null, folderId: draft.folderId || null })
            toast.success(t('documents.documentUpdated'))
            setConfirming(false)
            onClose()
          } catch (error) {
            setConfirming(false)
            toast.error(error)
          }
        }}
      />
    </>
  )
}

interface PendingUpload {
  key: string
  file: File
  name: string
  description: string
  status: 'idle' | 'uploading' | 'done' | 'error'
}

function UploadSheet({ files, folderId, folderName, onClose }: { files: File[]; folderId: string | null; folderName: string; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [items, setItems] = useState<PendingUpload[]>([])
  const [confirming, setConfirming] = useState(false)
  const [lastFiles, setLastFiles] = useState<File[]>([])
  const mutation = useDataMutation(async (list: PendingUpload[]) => {
    let failures = 0
    for (const item of list) {
      setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, status: 'uploading' } : entry)))
      const form = new FormData()
      form.append('file', item.file, item.file.name)
      form.append('name', item.name.trim() || stripExtension(item.file.name))
      if (item.description.trim()) form.append('description', item.description.trim())
      if (folderId) form.append('folderId', folderId)
      try {
        await api<DocumentFile>('/api/documents', { method: 'POST', form })
        setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, status: 'done' } : entry)))
      } catch (error) {
        failures++
        toast.error(error)
        setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, status: 'error' } : entry)))
      }
    }
    return failures
  })

  if (files !== lastFiles) {
    setLastFiles(files)
    setItems(files.map((file, index) => ({ key: `${file.name}-${index}-${file.size}`, file, name: stripExtension(file.name), description: '', status: 'idle' })))
  }

  const lines: ChangeLine[] = items.map((item) => ({
    label: `${item.name.trim() || item.file.name} (${formatBytes(item.file.size)})`,
    kind: 'added',
    before: '',
    after: item.description.trim() || item.file.name,
  }))

  return (
    <>
      <Sheet
        open={files.length > 0 && !confirming}
        onClose={() => !mutation.isPending && onClose()}
        title={t('documents.uploadTitle', { count: items.length })}
        description={t('documents.uploadInto', { folder: folderName })}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setConfirming(true)} loading={mutation.isPending} disabled={items.length === 0}>
              {t('common.review')}
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const kind = fileKind(item.file.type, item.file.name)
            const Icon = KIND_META[kind].icon
            return (
              <li key={item.key} className="rounded-2xl border border-line p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-ink-soft">
                  <Icon className="size-4" style={{ color: KIND_META[kind].color }} />
                  <span className="truncate">{item.file.name}</span>
                  <span className="ml-auto shrink-0 tabular">{formatBytes(item.file.size)}</span>
                  {item.status === 'uploading' ? <Spinner className="size-4" /> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="field"
                    aria-label={t('documents.name')}
                    placeholder={t('documents.name')}
                    value={item.name}
                    maxLength={120}
                    onChange={(e) => setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, name: e.target.value } : entry)))}
                  />
                  <input
                    className="field"
                    aria-label={t('documents.description')}
                    placeholder={t('documents.description')}
                    value={item.description}
                    maxLength={2000}
                    onChange={(e) => setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, description: e.target.value } : entry)))}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </Sheet>
      <ConfirmChanges
        open={confirming}
        onClose={() => setConfirming(false)}
        mode="create"
        subject={t('documents.uploadInto', { folder: folderName })}
        lines={lines}
        onConfirm={async () => {
          setConfirming(false)
          const failures = await mutation.mutateAsync(items.filter((item) => item.status !== 'done'))
          if (failures === 0) {
            toast.success(t('documents.uploaded', { count: items.length }))
            onClose()
          }
        }}
      />
    </>
  )
}

export function DocumentsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const { data, isPending } = useSync()
  const users = useUserMap()
  const [params, setParams] = useSearchParams()
  const input = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<File[]>([])
  const [folderSheet, setFolderSheet] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null })
  const [editing, setEditing] = useState<DocumentFile | null>(null)
  const [deleting, setDeleting] = useState<{ folder?: Folder; document?: DocumentFile } | null>(null)
  const [actions, setActions] = useState<DocumentFile | null>(null)
  const [dragging, setDragging] = useState(false)

  const folders = useMemo(() => data?.documents.folders ?? [], [data])
  const documents = useMemo(() => data?.documents.documents ?? [], [data])
  const currentId = params.get('folder')
  const current = folders.find((folder) => folder.id === currentId) ?? null
  const openId = params.get('open')
  const viewing = documents.find((document) => document.id === openId) ?? null

  const breadcrumbs = useMemo(() => {
    const chain: Folder[] = []
    let cursor = current
    const guard = new Set<string>()
    while (cursor && !guard.has(cursor.id)) {
      guard.add(cursor.id)
      chain.unshift(cursor)
      cursor = folders.find((folder) => folder.id === cursor!.parentId) ?? null
    }
    return chain
  }, [current, folders])

  const subfolders = folders.filter((folder) => (folder.parentId ?? null) === (current?.id ?? null)).sort((a, b) => a.name.localeCompare(b.name))
  const files = documents.filter((document) => (document.folderId ?? null) === (current?.id ?? null)).sort((a, b) => a.name.localeCompare(b.name))

  const countIn = (folderId: string) => folders.filter((folder) => folder.parentId === folderId).length + documents.filter((document) => document.folderId === folderId).length

  const navigateTo = (folderId: string | null) => {
    const next = new URLSearchParams()
    if (folderId) next.set('folder', folderId)
    setParams(next)
  }

  const setOpen = (documentId: string | null) => {
    const next = new URLSearchParams(params)
    if (documentId) next.set('open', documentId)
    else next.delete('open')
    setParams(next, { replace: !documentId })
  }

  const removeFolder = useDataMutation((folder: Folder) => api(`/api/documents/folders/${folder.id}?version=${folder.version}`, { method: 'DELETE' }))
  const removeDocument = useDataMutation((document: DocumentFile) => api(`/api/documents/${document.id}?version=${document.version}`, { method: 'DELETE' }))

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (!online) return
    const dropped = Array.from(event.dataTransfer.files)
    if (dropped.length) setUploads(dropped)
  }

  const deleteLines = (): ChangeLine[] => {
    if (deleting?.document) {
      const document = deleting.document
      return [
        { label: t('documents.name'), kind: 'removed', before: document.name, after: '' },
        { label: t('documents.size'), kind: 'removed', before: formatBytes(document.size), after: '' },
      ]
    }
    if (deleting?.folder) {
      const descendants = new Set<string>([deleting.folder.id])
      let grew = true
      while (grew) {
        grew = false
        for (const folder of folders) {
          if (folder.parentId && descendants.has(folder.parentId) && !descendants.has(folder.id)) {
            descendants.add(folder.id)
            grew = true
          }
        }
      }
      const inside = documents.filter((document) => document.folderId && descendants.has(document.folderId))
      return [
        { label: t('documents.folder'), kind: 'removed', before: deleting.folder.name, after: '' },
        ...(descendants.size > 1 ? [{ label: t('documents.subfolders'), kind: 'removed' as const, before: String(descendants.size - 1), after: '' }] : []),
        ...inside.map((document) => ({ label: t('documents.file'), kind: 'removed' as const, before: document.name, after: '' })),
      ]
    }
    return []
  }

  return (
    <Page wide>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (online) setDragging(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false)
        }}
        onDrop={onDrop}
        className="relative"
      >
        <PageHeader
          title={t('documents.title')}
          subtitle={t('documents.subtitle', { count: documents.length })}
          actions={
            <>
              <Button variant="secondary" icon={FolderPlus} onClick={() => setFolderSheet({ open: true, folder: null })} disabled={!online}>
                {t('documents.newFolder')}
              </Button>
              <Button icon={Upload} onClick={() => input.current?.click()} disabled={!online}>
                {t('documents.upload')}
              </Button>
            </>
          }
        />
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? [])
            if (selected.length) setUploads(selected)
            event.target.value = ''
          }}
        />

        <nav aria-label={t('documents.path')} className="mb-5 flex flex-wrap items-center gap-1 text-sm font-semibold">
          <button type="button" onClick={() => navigateTo(null)} className={clsx('rounded-lg px-2 py-1 hover:bg-surface-2', !current ? 'text-ink' : 'text-ink-soft')}>
            {t('documents.root')}
          </button>
          {breadcrumbs.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight className="size-4 text-ink-faint" />
              <button
                type="button"
                onClick={() => navigateTo(folder.id)}
                className={clsx('rounded-lg px-2 py-1 hover:bg-surface-2', index === breadcrumbs.length - 1 ? 'text-ink' : 'text-ink-soft')}
              >
                {folder.name}
              </button>
            </span>
          ))}
          {current ? (
            <span className="ml-auto flex items-center gap-1">
              <IconButton icon={Pencil} label={t('documents.editFolder')} size="sm" onClick={() => setFolderSheet({ open: true, folder: current })} disabled={!online} />
              <IconButton icon={Trash2} label={t('documents.deleteFolder')} size="sm" tone="danger" onClick={() => setDeleting({ folder: current })} disabled={!online} />
            </span>
          ) : null}
        </nav>

        {isPending && !data ? (
          <div className="grid min-h-[40dvh] place-items-center">
            <Spinner />
          </div>
        ) : subfolders.length === 0 && files.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={current ? t('documents.emptyFolder') : t('documents.emptyTitle')}
            text={t('documents.emptyText')}
            action={
              <Button icon={Upload} onClick={() => input.current?.click()} disabled={!online}>
                {t('documents.upload')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {subfolders.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {subfolders.map((folder, index) => (
                  <motion.li key={folder.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>
                    <button
                      type="button"
                      onClick={() => navigateTo(folder.id)}
                      className="group flex w-full items-center gap-3 rounded-[1.4rem] bg-surface p-3.5 text-left shadow-card transition-transform hover:-translate-y-0.5"
                    >
                      <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-saffron-soft text-[color-mix(in_oklab,var(--saffron)_70%,var(--ink))]">
                        <FolderIcon className="size-5.5 transition-transform group-hover:scale-110" fill="currentColor" fillOpacity={0.25} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{folder.name}</span>
                        <span className="text-xs text-ink-soft">{t('documents.items', { count: countIn(folder.id) })}</span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            ) : null}

            {files.length > 0 ? (
              <ul className="overflow-hidden rounded-[1.4rem] bg-surface shadow-card">
                {files.map((document) => {
                  const kind = fileKind(document.contentType, document.originalFilename)
                  const meta = KIND_META[kind]
                  const author = document.createdBy ? users.get(document.createdBy) : undefined
                  return (
                    <li key={document.id} className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 sm:px-4">
                      <button type="button" onClick={() => setOpen(document.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${meta.color} 14%, transparent)`, color: meta.color }}>
                          <meta.icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{document.name}</span>
                          <span className="block truncate text-sm text-ink-soft">{document.description || document.originalFilename}</span>
                        </span>
                      </button>
                      <span className="hidden shrink-0 items-center gap-2 text-sm text-ink-soft md:flex">
                        {author ? <PigAvatar avatar={author.avatar} size={22} title={author.firstName} /> : null}
                        <span className="w-28 tabular">{formatMoment(document.createdAt)}</span>
                        <span className="w-16 text-right tabular">{formatBytes(document.size)}</span>
                      </span>
                      <span className="hidden shrink-0 items-center sm:flex">
                        <IconButton icon={Eye} label={t('documents.view')} size="sm" onClick={() => setOpen(document.id)} />
                        <a href={documentUrl(document.id, true)} className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label={t('common.download')} title={t('common.download')}>
                          <Download className="size-4" />
                        </a>
                        <IconButton icon={Pencil} label={t('common.edit')} size="sm" onClick={() => setEditing(document)} disabled={!online} />
                        <IconButton icon={Trash2} label={t('common.delete')} size="sm" tone="danger" onClick={() => setDeleting({ document })} disabled={!online} />
                      </span>
                      <IconButton icon={Ellipsis} label={t('common.actions')} className="sm:hidden" onClick={() => setActions(document)} />
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )}

        <AnimatePresence>
          {dragging ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-[2rem] border-[3px] border-dashed border-cobalt bg-cobalt-soft/80"
            >
              <span className="flex flex-col items-center gap-2 font-display text-3xl font-extrabold text-cobalt">
                <Upload className="size-10" />
                {t('documents.drop')}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Sheet open={actions !== null} onClose={() => setActions(null)} title={actions?.name ?? ''} size="sm">
        {actions ? (
          <div className="flex flex-col gap-1">
            <button type="button" className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-surface-2" onClick={() => { setOpen(actions.id); setActions(null) }}>
              <Eye className="size-5" /> {t('documents.view')}
            </button>
            <a className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-surface-2" href={documentUrl(actions.id, true)} onClick={() => setActions(null)}>
              <Download className="size-5" /> {t('common.download')}
            </a>
            <button type="button" disabled={!online} className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-surface-2 disabled:opacity-40" onClick={() => { setEditing(actions); setActions(null) }}>
              <Pencil className="size-5" /> {t('common.edit')}
            </button>
            <button type="button" disabled={!online} className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold text-poppy hover:bg-poppy-soft disabled:opacity-40" onClick={() => { setDeleting({ document: actions }); setActions(null) }}>
              <Trash2 className="size-5" /> {t('common.delete')}
            </button>
          </div>
        ) : null}
      </Sheet>

      <FolderSheet open={folderSheet.open} folder={folderSheet.folder} parentId={current?.id ?? null} folders={folders} onClose={() => setFolderSheet({ open: false, folder: null })} />
      <DocumentEditSheet document={editing} folders={folders} onClose={() => setEditing(null)} />
      <UploadSheet files={uploads} folderId={current?.id ?? null} folderName={current?.name ?? t('documents.root')} onClose={() => setUploads([])} />
      <ConfirmChanges
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        mode="delete"
        subject={deleting?.folder?.name ?? deleting?.document?.name ?? ''}
        lines={deleteLines()}
        undoable={false}
        onConfirm={async () => {
          try {
            if (deleting?.folder) {
              const parent = deleting.folder.parentId
              await removeFolder.mutateAsync(deleting.folder)
              toast.success(t('documents.folderDeleted'))
              if (current?.id === deleting.folder.id) navigateTo(parent)
            } else if (deleting?.document) {
              await removeDocument.mutateAsync(deleting.document)
              toast.success(t('documents.documentDeleted'))
            }
            setDeleting(null)
          } catch (error) {
            setDeleting(null)
            toast.error(error)
          }
        }}
      />
      <DocumentViewer document={viewing} onClose={() => setOpen(null)} />
    </Page>
  )
}
