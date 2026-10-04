import { notFound } from 'next/navigation'

import { parseConversationId } from '../../../lib/handlers.ts'
import { requireSession } from '../../../lib/page-guard.ts'
import { Thread } from '../../_cliente/Thread.tsx'

export const dynamic = 'force-dynamic'

export default async function ConversationPage({ params }: { readonly params: Promise<{ id: string }> }) {
  await requireSession()
  const id = parseConversationId((await params).id)
  if (id === null) notFound()
  return <Thread id={id} />
}
