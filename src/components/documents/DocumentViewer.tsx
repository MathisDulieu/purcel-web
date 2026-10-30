import { Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Document, Page, pdfjs } from 'react-pdf'
import { Download, FileQuestion, Minus, Plus, X } from 'lucide-react'
import { documentUrl } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import type { DocumentFile } from '@/lib/types'
import { buttonClass, Spinner } from '@/components/ui'
import { fileKind, KIND_META, viewable } from '@/components/documents/fileKinds'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

function useDocumentBlob(document: DocumentFile | null, enabled: boolean) {
  const [state, setState] = useState<{ blob: Blob | null; error: boolean }>({ blob: null, error: false })
  useEffect(() => {
    if (!document || !enabled) return
    const controller = new AbortController()
    setState({ blob: null, error: false })
    fetch(documentUrl(document.id), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.blob()
      })
      .then((blob) => setState({ blob, error: false }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setState({ blob: null, error: true })
      })
    return () => controller.abort()
  }, [document, enabled])
  return state
}

function PdfView({ blob }: { blob: Blob }) {
  const { t } = useTranslation()
  const { ref, width } = useContainerWidth()
  const [pages, setPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-4xl">
      <Document
        file={blob}
        onLoadSuccess={(pdf) => setPages(pdf.numPages)}
        loading={<div className="grid h-64 place-items-center"><Spinner /></div>}
        error={<p className="py-16 text-center text-bg/70">{t('documents.previewError')}</p>}
      >
        {width > 0
          ? Array.from({ length: pages }, (_, index) => (
              <div key={index} className="mb-3 overflow-x-auto rounded-lg bg-white shadow-lg">
                <Page pageNumber={index + 1} width={Math.max(240, width * zoom)} renderTextLayer={false} renderAnnotationLayer={false} />
              </div>
            ))
          : null}
      </Document>
      {pages > 0 ? (
        <div className="sticky bottom-4 mx-auto flex w-max items-center gap-1 rounded-full bg-[#121A33]/90 p-1 text-white shadow-lg backdrop-blur">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label={t('documents.zoomOut')}>
            <Minus className="size-4" />
          </button>
          <span className="w-14 text-center text-sm font-semibold tabular">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label={t('documents.zoomIn')}>
            <Plus className="size-4" />
          </button>
          <span className="px-3 text-sm text-white/70 tabular">{t('documents.pages', { count: pages })}</span>
        </div>
      ) : null}
    </div>
  )
}

function TextView({ blob }: { blob: Blob }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    void blob.text().then(setText)
  }, [blob])
  if (text === null) return <Spinner />
  return <pre className="mx-auto w-full max-w-3xl overflow-x-auto rounded-2xl bg-white p-5 font-mono text-sm whitespace-pre-wrap text-[#121A33]">{text}</pre>
}

function MediaView({ blob, video }: { blob: Blob; video: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  if (!url) return null
  return video ? (
    <video src={url} controls className="mx-auto max-h-full max-w-full rounded-xl" />
  ) : (
    <img src={url} alt="" className="mx-auto max-h-full max-w-full rounded-xl object-contain" />
  )
}

export function DocumentViewer({ document, onClose }: { document: DocumentFile | null; onClose: () => void }) {
  const { t } = useTranslation()
  const kind = document ? fileKind(document.contentType, document.originalFilename) : 'other'
  const canView = viewable(kind)
  const { blob, error } = useDocumentBlob(document, canView)
  const Icon = KIND_META[kind].icon

  useEffect(() => {
    if (!document) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      window.document.body.style.overflow = ''
    }
  }, [document, onClose])

  return createPortal(
    <AnimatePresence>
      {document ? (
        <motion.div
          className="fixed inset-0 z-[65] flex flex-col bg-[#0A1022] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={document.name}
        >
          <header className="flex items-start gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-2xl leading-tight font-extrabold">{document.name}</p>
              <p className="truncate text-sm text-white/60">
                {document.description ? `${document.description} ` : ''}
                <span className="tabular">({formatBytes(document.size)})</span>
              </p>
            </div>
            <a href={documentUrl(document.id, true)} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label={t('common.download')} title={t('common.download')}>
              <Download className="size-5" />
            </a>
            <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label={t('common.close')}>
              <X className="size-6" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-6">
            {!canView ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <FileQuestion className="size-14 text-white/50" strokeWidth={1.4} />
                <p className="max-w-sm text-white/70">{t('documents.noPreview')}</p>
                <a href={documentUrl(document.id, true)} className={buttonClass('primary', 'md')}>
                  <Download className="size-[1.15em]" />
                  {t('common.download')}
                </a>
              </div>
            ) : error ? (
              <p className="py-16 text-center text-white/70">{t('documents.previewError')}</p>
            ) : !blob ? (
              <div className="grid h-full place-items-center">
                <Spinner className="size-8 text-white/70" />
              </div>
            ) : kind === 'pdf' ? (
              <Suspense fallback={<div className="grid h-full place-items-center"><Spinner className="size-8 text-white/70" /></div>}>
                <PdfView blob={blob} />
              </Suspense>
            ) : kind === 'text' ? (
              <TextView blob={blob} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <MediaView blob={blob} video={kind === 'video'} />
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    window.document.body,
  )
}
