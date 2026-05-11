  export type ListBorrowersParams = {
    page?: number
    itemsPerPage?: number
    search?: string
  }

  export type CreateBorrowerInput = {
    fullName: string
    email?: string
    contactNumber?: string
    income?: number | null
    notes?: string
  }
  
  export type UpdateBorrowerInput = Partial<CreateBorrowerInput>
