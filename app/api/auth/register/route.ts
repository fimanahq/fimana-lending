import { jsonError } from '@/lib/server/backend'

export async function POST() {
  return jsonError('FiMana Lending account registration is not available from the public site.', 403)
}
