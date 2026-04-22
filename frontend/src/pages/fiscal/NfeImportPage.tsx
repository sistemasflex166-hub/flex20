import { useRef, useState, useCallback } from 'react'
import { Upload, CheckCircle, XCircle, AlertTriangle, Loader2, Trash2, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { previewNfe, importNfe, previewNfse, importNfse } from '@/api/nfeImport'

type OnDuplicate = 'skip' | 'overwrite'
type FileStatus = 'pending' | 'parsing' | 'ready' | 'importing' | 'done' | 'skipped' | 'error'
type DocType = 'nfe' | 'nfse' | 'unknown'

interface PreviewInfo {
  tipo: DocType
  numero: string
  serie: string
  company_name: string | null
  cnpj_not_found: boolean
  cnpj_in_file: string
  already_imported: boolean
  // NF-e
  is_purchase?: boolean
  emit_nome?: string
  dest_nome?: string
  v_total?: string
  // NFS-e
  is_provided?: boolean
  emit_nfse_nome?: string
  toma_nome?: string
  v_liq?: string
}

interface FileItem {
  id: string
  file: File
  status: FileStatus
  preview?: PreviewInfo
  error?: string
  resultCode?: number
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function fmtBRL(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

  const parseFile = useCallback(async (item: FileItem) => {
    // Tenta NFS-e primeiro (namespace sped.fazenda), depois NF-e
    let preview: PreviewInfo | null = null

    // Detecta pelo conteúdo do arquivo antes de chamar a API
    const text = await item.file.text()
    const isNfse = text.includes('sped.fazenda.gov.br/nfse')

    try {
      if (isNfse) {
        const raw = await previewNfse(item.file, tenantId)
        preview = {
          tipo: 'nfse',
          numero: raw.n_nfse,
          serie: raw.serie,
          company_name: raw.company_name,
          cnpj_not_found: raw.cnpj_not_found,
          cnpj_in_file: raw.cnpj_in_file,
          already_imported: raw.already_imported,
          is_provided: raw.is_provided,
          emit_nfse_nome: raw.emit?.nome,
          toma_nome: raw.toma?.nome,
          v_liq: raw.totais?.v_liq,
        }
      } else {
        const raw = await previewNfe(item.file, tenantId)
        preview = {
          tipo: 'nfe',
          numero: raw.numero,
          serie: raw.serie,
          company_name: raw.company_name,
          cnpj_not_found: raw.cnpj_not_found,
          cnpj_in_file: raw.cnpj_in_file,
          already_imported: raw.already_imported,
          is_purchase: raw.is_purchase,
          emit_nome: raw.emit?.nome,
          dest_nome: raw.dest?.nome,
          v_total: raw.totais?.v_nf,
        }
      }
      updateItem(item.id, { status: 'ready', preview })
    } catch (err: any) {
      updateItem(item.id, {
        status: 'error',
        error: err?.response?.data?.detail ?? 'Erro ao ler o arquivo.',
      })
    }
  }, [tenantId, updateItem])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const xmlFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.xml'))
    if (!xmlFiles.length) return

    const newItems: FileItem[] = xmlFiles.map((file) => ({ id: uid(), file, status: 'parsing' }))
    setItems((prev) => [...prev, ...newItems])
    await Promise.all(newItems.map(parseFile))
  }, [parseFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))
  const clearDone = () => setItems((prev) => prev.filter((i) => i.status !== 'done' && i.status !== 'skipped'))

  const readyCount = items.filter((i) => i.status === 'ready' && !i.preview?.cnpj_not_found).length
  const hasCnpjErrors = items.some((i) => i.preview?.cnpj_not_found)
  const hasErrors = items.some((i) => i.status === 'error')

  const runImport = async () => {
    const toImport = items.filter((i) => i.status === 'ready' && !i.preview?.cnpj_not_found)
    if (!toImport.length) return

    setRunning(true)
    for (const item of toImport) {
      updateItem(item.id, { status: 'importing' })
      try {
        let res: any
        if (item.preview?.tipo === 'nfse') {
          res = await importNfse(item.file, onDuplicate, tenantId)
        } else {
          res = await importNfe(item.file, onDuplicate, tenantId)
        }
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
      case 'importing': return <Loader2 size={15} className="animate-spin text-brand-500" />
      case 'done': return <CheckCircle size={15} className="text-green-500" />
      case 'skipped': return <AlertTriangle size={15} className="text-yellow-500" />
      case 'error': return <XCircle size={15} className="text-red-500" />
      default: return <FileText size={15} className="text-gray-400" />
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
    if (item.status === 'skipped' || item.preview?.already_imported) return 'bg-yellow-50'
    return ''
  }

  const tipoLabel = (item: FileItem) => {
    if (!item.preview) return <span className="text-gray-300">—</span>
    const { tipo, is_purchase, is_provided } = item.preview
    if (tipo === 'nfse') {
      return is_provided
        ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">NFS-e Saída</span>
        : <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">NFS-e Entrada</span>
    }
    return is_purchase
      ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">NF-e Entrada</span>
      : <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">NF-e Saída</span>
  }

  const parceiroNome = (item: FileItem) => {
    if (!item.preview) return '—'
    const { tipo, is_purchase, is_provided, emit_nome, dest_nome, emit_nfse_nome, toma_nome } = item.preview
    if (tipo === 'nfse') return is_provided ? toma_nome : emit_nfse_nome
    return is_purchase ? emit_nome : dest_nome
  }

  const valorTotal = (item: FileItem) => {
    if (!item.preview) return '—'
    const v = item.preview.tipo === 'nfse' ? item.preview.v_liq : item.preview.v_total
    return v ? fmtBRL(v) : '—'
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-800">Importar XML Fiscal</h1>
      <p className="mb-6 text-sm text-gray-500">
        Selecione ou arraste XMLs de NF-e (modelo 55) ou NFS-e (padrão nacional). O sistema identifica o tipo e a empresa automaticamente.
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
        <p className="text-sm font-medium text-gray-700">Clique ou arraste arquivos XML aqui</p>
        <p className="mt-0.5 text-xs text-gray-400">
          Múltiplos arquivos · NF-e modelo 55 e NFS-e padrão nacional · máx. 5 MB por arquivo
        </p>
        <input ref={fileRef} type="file" accept=".xml" multiple className="hidden" onChange={handleFileInput} />
      </div>

      {items.length > 0 && (
        <>
          {/* Opções globais */}
          <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-700">Se já foi importado:</span>
              {(['skip', 'overwrite'] as OnDuplicate[]).map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input type="radio" name="dup" value={v} checked={onDuplicate === v}
                    onChange={() => setOnDuplicate(v)} disabled={running} />
                  {v === 'skip' ? 'Ignorar' : 'Sobrepor'}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {items.some((i) => i.status === 'done' || i.status === 'skipped') && (
                <button onClick={clearDone} disabled={running} className="text-xs text-gray-400 hover:text-gray-700">
                  Limpar concluídos
                </button>
              )}
              <button
                onClick={runImport}
                disabled={running || readyCount === 0}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {running
                  ? <><Loader2 size={14} className="animate-spin" /> Importando...</>
                  : <>Importar {readyCount > 0 ? `${readyCount} arquivo${readyCount > 1 ? 's' : ''}` : ''}</>}
              </button>
            </div>
          </div>

          {hasCnpjErrors && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">
                Alguns arquivos possuem CNPJs não cadastrados (marcados em vermelho). Cadastre as empresas antes de importar esses arquivos.
              </p>
            </div>
          )}

          {/* Tabela */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Arquivo</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Nº / Série</th>
                  <th className="px-4 py-3 text-left">Parceiro</th>
                  <th className="px-4 py-3 text-right">Total</th>
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
                    <td className="px-4 py-2.5 text-xs">
                      {item.preview
                        ? item.preview.cnpj_not_found
                          ? <span className="text-red-600">Não cadastrada</span>
                          : item.preview.company_name
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">{tipoLabel(item)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {item.preview ? `${item.preview.numero} / ${item.preview.serie}` : '—'}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2.5 text-xs text-gray-600" title={parceiroNome(item) ?? ''}>
                      {parceiroNome(item) || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-medium">{valorTotal(item)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(item)}
                        <span className={`text-xs ${
                          item.status === 'error' || item.preview?.cnpj_not_found ? 'text-red-600'
                          : item.status === 'done' ? 'text-green-700'
                          : item.status === 'skipped' ? 'text-yellow-700'
                          : 'text-gray-500'
                        }`}>
                          {statusLabel(item)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!running && (
                        <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400">
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
            {hasErrors && ` · ${items.filter((i) => i.status === 'error').length} com erro`}
          </p>
        </>
      )}
    </div>
  )
}
