import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface UploadZoneProps {
  onUpload: (file: File) => void
  uploading: boolean
  error: string | null
}

export function UploadZone({ onUpload, uploading, error }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0])
      }
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: { 'application/pdf': ['.pdf'] },
      maxFiles: 1,
      maxSize: 50 * 1024 * 1024, // 50MB
      disabled: uploading,
    })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          uploading && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-foreground">
                Subiendo contrato...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {isDragActive ? (
                  <FileText className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isDragActive
                    ? 'Suelta el archivo aquí'
                    : 'Arrastra un PDF o haz clic para seleccionar'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF hasta 50MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(error || fileRejections.length > 0) && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || 'Solo se aceptan archivos PDF de hasta 50MB'}
        </div>
      )}
    </div>
  )
}
