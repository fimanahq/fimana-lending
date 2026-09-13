import type { AddressDetails } from '@/lib/types/lending'

export type ListBorrowersParams = {
    page?: number
    itemsPerPage?: number
    search?: string
    hasDefaultedLoan?: boolean
}

export type CreateBorrowerInput = {
    fullName: string
    email?: string
    contactNumber?: string
    income?: number | null
    notes?: string
    addressDetails?: AddressDetails | null
}

export type UpdateBorrowerInput = Partial<CreateBorrowerInput>
