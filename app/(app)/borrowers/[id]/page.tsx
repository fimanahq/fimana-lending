import { BorrowerProfile } from '@/components/borrowers/borrower-profile'

export default async function BorrowerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <BorrowerProfile borrowerId={id} />
}
