import { classNames } from '@/utils/class-names'

export function getDashboardClass(
  styles: Record<string, string>,
  ...values: Array<string | false | null | undefined>
) {
  return classNames(...values.map((value) => (value ? styles[value] : value)))
}
