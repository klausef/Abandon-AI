import { Settings } from 'lucide-react'
import { ModulePlaceholderPage } from '../../components/ModulePlaceholderPage'

const plannedCapabilities = [
  'Interface and alert preferences',
  'Mock provider configuration status',
  'Future backend and AI integration settings',
]

export function SettingsPage() {
  return (
    <ModulePlaceholderPage
      description="System preferences and provider configuration will be introduced after the core operational workflows are complete."
      icon={Settings}
      phase="Future phase"
      plannedCapabilities={plannedCapabilities}
      title="System Settings"
    />
  )
}
