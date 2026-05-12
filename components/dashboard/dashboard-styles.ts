import { classNames } from '@/utils/class-names'
import dashboardStyles from './dashboard.module.css'

export function dashboardClass(...values: Array<string | false | null | undefined>) {
  return classNames(...values.map((value) => (value ? dashboardStyles[value] : value)))
}
