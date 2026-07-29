export function normalizePhilippineMobileNumber(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 10 && digits.startsWith('9')) {
    return `+63${digits}`
  }

  if (digits.length === 11 && digits.startsWith('09')) {
    return `+63${digits.slice(1)}`
  }

  if (digits.length === 12 && digits.startsWith('639')) {
    return `+63${digits.slice(2)}`
  }

  return ''
}

export function isValidPhilippineMobileNumber(value: string) {
  return normalizePhilippineMobileNumber(value) !== ''
}
