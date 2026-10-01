import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Download, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import { useNotify } from '@/hooks/use-notify'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { listConditionItems } from '../../services/conditions/conditionsTable'
import {
  ConditionsUploadError,
  buildConditionsUpload,
  parseConditionsCsv,
  readConditionsFiles,
} from '../../services/conditions/importConditions'
import { DownloadConditionsDialog } from './DownloadConditionsDialog'
import { UploadConditionsDialog } from './UploadConditionsDialog'

// Sits at the right end of the Conditions tab bar. Upload reads the file first, then opens a
// preview dialog; nothing changes until the user applies it.
export function ConditionsButtons({ className = '' }) {
  const notify = useNotify()
  const fileInputRef = useRef(null)
  const species = useSelector((state) => state.mechanism.config.mechanism?.species || EMPTY_ARRAY)
  const reactions = useSelector((state) => state.mechanism.config.mechanism?.reactions || EMPTY_ARRAY)
  const conditions = useSelector((state) => state.conditions)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const files = await readConditionsFiles(file)
      const parsed = files.map(parseConditionsCsv)
      const items = listConditionItems({ species, reactions, conditions })
      setPendingUpload({ fileName: file.name, upload: buildConditionsUpload(parsed, items) })
    } catch (error) {
      const message =
        error instanceof ConditionsUploadError ? error.message : 'The file could not be read.'
      notify.error('Upload Failed', message)
    }
  }

  // The labels hide on narrow screens so the tabs keep their room; the icons and titles stay.
  return (
    <div className={`flex gap-1.5 ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5 px-2 sm:px-3"
        title="Upload conditions from a CSV or zip file"
        aria-label="Upload conditions"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5 px-2 sm:px-3"
        title="Download conditions as CSV"
        aria-label="Download conditions"
        onClick={() => setDownloadOpen(true)}
      >
        <Download className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline">Download</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.zip"
        className="hidden"
        aria-label="Conditions file"
        onChange={handleFile}
      />

      {downloadOpen && <DownloadConditionsDialog onClose={() => setDownloadOpen(false)} />}
      {pendingUpload && (
        <UploadConditionsDialog
          fileName={pendingUpload.fileName}
          upload={pendingUpload.upload}
          onClose={() => setPendingUpload(null)}
        />
      )}
    </div>
  )
}

export default ConditionsButtons
