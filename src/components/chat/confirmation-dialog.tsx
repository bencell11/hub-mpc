'use client'

import { AlertTriangle, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

interface ConfirmationDialogProps {
  toolName: string
  toolDescription: string
  input: Record<string, unknown>
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmationDialog({
  toolName,
  toolDescription,
  input,
  riskLevel,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmationDialogProps) {
  const riskColors = {
    LOW: 'text-green-500',
    MEDIUM: 'text-yellow-500',
    HIGH: 'text-red-500',
  }

  const riskLabels = {
    LOW: 'Risque faible',
    MEDIUM: 'Risque moyen',
    HIGH: 'Risque élevé',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-muted ${riskColors[riskLevel]}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Confirmation requise</CardTitle>
              <CardDescription>{toolDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Action:</span>
            <code className="rounded bg-muted px-2 py-1 text-sm">{toolName}</code>
            <span className={`text-xs ${riskColors[riskLevel]}`}>{riskLabels[riskLevel]}</span>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-2">Paramètres:</p>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>

          {riskLevel === 'HIGH' && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">
                Cette action est irréversible et peut avoir un impact externe (envoi de message, modification de données, etc.)
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={onConfirm} loading={isLoading}>
            <Check className="mr-2 h-4 w-4" />
            Confirmer
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
