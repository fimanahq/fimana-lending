export async function readJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
