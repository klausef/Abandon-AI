import { useEffect } from 'react'

const applicationName = 'Public Space Safety Command'

export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    document.title = `${pageTitle} · ${applicationName}`
  }, [pageTitle])
}
