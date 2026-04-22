import { useRef, useState, useCallback } from 'react'
import {
  Upload, CheckCircle, XCircle, AlertTriangle, Loader2, Trash2, FileText
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { previewNfe, importNfe, type NFePreview } from '@/api/nfeImport'

type OnDuplicate = 'skip' | 'overwrite'

type FileStatus = 'pending' | 'parsing' | 'ready' | 'importing' | 'done' | 'skipped' | 'error'

interface FileItem {
  id: string
  file: File
  status: FileStatus
  preview?: NFePreview
  error?: string
  resultCode?: number
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export function NfeImportPage() {
  const { user } = useAuth()
  const tenantId = user?.role === 'platform_admin' ? 1 : undefined

  const dropRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<FileItem[]>([])
  const [onDuplicate, setOnDuplicate] = useState<OnDuplicate>('skip')
  const [running, setRunning] = useState(false)

  const updateItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }, [])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const xmlFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.xml'))
      if (!xmlFiles.length) return

      const newItems: FileItem[] = xmlFiles.map((file) => ({
        id: uid(),
        file,
        status: 'parsing',
      }))

      setItems((prev) => [...prev, ...newItems])

      // Parse em paralelo
      await Promise.all(
        newItems.map(async (item) => {
          try {
            const preview = await previewNfe(item.file, tenantId)
            updateItem(item.id, { status: 'ready', preview })
          } catch (err: any) {
            updateItem(item.id, {
              status: 'error',
              error: err?.response?.data?.detail ?? 'Erro ao ler o arquivo.',
            })
          }
        })
      )
    },
    [tenantId, updateItem]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearDone = () => {
    setItems((prev) => prev.filter((i) => i.status !== 'done' && i.status !== 'skipped'))
  }

  const readyCount = items.filter((i) => i.status === 'ready').length
  const hasErrors = items.some((i) => i.status === 'error')
  const hasCnpjErrors = items.some((i) => i.preview?.cnpj_not_found)

  const runImport = async () => {
    const toImport = items.filter(
      (i) => i.status === 'ready' && !i.preview?.cnpj_not_found
    )
    if (!toImport.length) return

    setRunning(true)
    for (const item of toImport) {
      updateItem(item.id, { status: 'importing' })
      try {
        const res = await importNfe(item.file, onDuplicate, tenantId)
        if (onDuplicate === 'skip' && item.preview?.already_imported) {
          updateItem(item.id, { status: 'skipped' })
        } else {
          updateItem(item.id, { status: 'done', resultCode: res.code })
        }
      } catch (err: any) {
        updateItem(item.id, {
          status: 'error',
          error: err?.response?.data?.detail ?? 'Erro ao importar.',
        })
      }
    }
    setRunning(false)
  }

  const statusIcon = (item: FileItem) => {
    switch (item.status) {
      case 'parsing':
      case 'importing':
        return <Loader2 size={15} className="animate-spin text-brand-500" />
      case 'done':
        return <CheckCircle size={15} className="text-green-500" />
      case 'skipped':
        return <AlertTriangle size={15} className="text-yellow-500" />
      case 'error':
        return <XCircle size={15} className="text-red-500" />
      default:
        return <FileText size={15} className="text-gray-400" />
    }
  }

  const statusLabel = (item: FileItem): string => {
    switch (item.status) {
      case 'parsing': return 'Lendo...'
      case 'importing': return 'Importando...'
      case 'done': return item.resultCode ? `Importado — lançamento #${item.resultCode}` : 'Importado'
      case 'skipped': return 'Ignorado (já importado)'
      case 'error': return item.error ?? 'Erro'
      case 'ready':
        if (item.preview?.cnpj_not_found) return `CNPJ ${item.preview.cnpj_in_file} não cadastrado`
        if (item.preview?.already_imported) return 'Já importado anteriormente'
        return 'Pronto'
      default: return ''
    }
  }

  const rowBg = (item: FileItem) => {
    if (item.status === 'error' || item.preview?.cnpj_not_found) return 'bg-red-50'
    if (item.status === 'done') return 'bg-green-50'
    if (item.status === 'skipped') return 'bg-yellow-50'
    if (item.preview?.already_imported) return 'bg-yellow-50'
    return ''
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-800">Importar XML NF-e</h1>
      <p className="mb-6 text-sm text-gray-500">
        Selecione ou arraste um ou mais arquivos XML. O sistema identifica a empresa pelo CNPJ automaticamente.
      </p>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-10 text-center transition hover:border-brand-400 hover:bg-brand-50"
      >
        <Upload size={32} className="mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">
          Clique ou arraste arquivos XML aqui
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          Múltiplos arquivos permitidos · NF-e modelo 55 · máx. 5 MB por arquivo
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {items.length > 0 && (
        <>
          {/* Opções globais */}
          <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-700">Se a nota já foi importada:</span>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  name="dup"
                  value="skip"
                  checked={onDuplicate === 'skip'}
                  onChange={() => setOnDuplicate('skip')}
                  disabled={running}
                />
                Ignorar
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  name="dup"
                  value="overwrite"
                  checked={onDuplicate === 'overwrite'}
                  onChange={() => setOnDuplicate('overwrite')}
                  disabled={running}
                />
                Sobrepor
              </label>
            </div>

            <div className="flex items-center gap-2">
              {items.some((i) => i.status === 'done' || i.status === 'skipped') && (
                <button
                  onClick={clearDone}
                  className="text-xs text-gray-400 hover:text-gray-700"
                  disabled={running}
                >
                  Limpar concluídos
                </button>
              )}
              <button
                onClick={runImport}
                disabled={running || readyCount === 0}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {running ? (
                  <><Loader2 size={14} className="animate-spin" /> Importando...</>
                ) : (
                  <>Importar {readyCount > 0 ? `${readyCount} arquivo${readyCount > 1 ? 's' : ''}` : ''}</>
                )}
              </button>
            </div>
          </div>

          {/* Alertas globais */}
          {hasCnpjErrors && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">
                Alguns arquivos possuem CNPJs não cadastrados (marcados em vermelho). Cadastre as empresas antes de importar esses arquivos. Os demais serão importados normalmente.
              </p>
            </div>
          )}

          {/* Tabela de arquivos */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Arquivo</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Nº / Série</th>
                  <th className="px-4 py-3 text-left">Parceiro</th>
                  <th className="px-4 py-3 text-right">Total NF</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={`border-t border-gray-50 ${rowBg(item)}`}>
                    <td className="max-w-[160px] truncate px-4 py-2.5 font-mono text-xs text-gray-500" title={item.file.name}>
                      {item.file.name}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.preview
                        ? item.preview.cnpj_not_found
                          ? <span className="text-red-600">Não cadastrada</span>
                          : item.preview.company_name
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.preview
                        ? item.preview.is_purchase
                          ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Entrada</span>
                          : <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Saída</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {item.preview ? `${item.preview.numero} / ${item.preview.serie}` : '—'}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2.5 text-xs text-gray-600" title={item.preview?.is_purchase ? item.preview.emit.nome : item.preview?.dest.nome}>
                      {item.preview
                        ? item.preview.is_purchase
                          ? item.preview.emit.nome
                          : item.preview.dest.nome
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {item.preview ? fmtBRL(item.preview.totais.v_nf) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(item)}
                        <span className={`text-xs ${
                          item.status === 'error' || item.preview?.cnpj_not_found
                            ? 'text-red-600'
                            : item.status === 'done'
                            ? 'text-green-700'
                            : item.status === 'skipped'
                            ? 'text-yellow-700'
                            : 'text-gray-500'
                        }`}>
                          {statusLabel(item)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!running && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-right text-xs text-gray-400">
            {items.length} arquivo{items.length !== 1 ? 's' : ''} na fila
            {items.filter((i) => i.status === 'done').length > 0 &&
              ` · ${items.filter((i) => i.status === 'done').length} importado${items.filter((i) => i.status === 'done').length !== 1 ? 's' : ''}`}
            {hasErrors &&
              ` · ${items.filter((i) => i.status === 'error').length} com erro`}
          </p>
        </>
      )}
    </div>
  )
}

function fmtBRL(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
