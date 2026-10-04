import { requireSession } from '../lib/page-guard.ts'
import { ConversationList } from './_cliente/ConversationList.tsx'

export const dynamic = 'force-dynamic'

export default async function Home() {
  await requireSession()
  return <ConversationList />
}
