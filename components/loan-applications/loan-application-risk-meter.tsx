import { Card } from '@/components/shared'
import {
  BORROWER_RISK_BANDS,
  calculateDti,
  getBorrowerRiskBand,
  getComfortableMonthlyPaymentRange,
  getComfortablePerCutoffRange,
  type BorrowerRiskLevel,
  type PaymentRange,
} from '@/lib/borrower-risk'
import { formatCurrency } from '@/lib/format'
import { classNames } from '@/utils/class-names'
import styles from './loan-application-risk-meter.module.css'

interface LoanApplicationRiskMeterProps {
  className?: string
  currency?: string
  monthlyIncome?: number | null
  proposedMonthlyPayment?: number | null
}

const GAUGE_MAX_DTI = 60
const GAUGE_PATH = 'M 24 116 A 96 96 0 0 1 216 116'
const NEEDLE_CENTER = { x: 120, y: 116 }
const NEEDLE_LENGTH = 74

const riskToneByLevel: Record<BorrowerRiskLevel, string> = {
  low: '#2d7a58',
  moderate: '#c08a24',
  high: '#c9682f',
  very_high: '#9f3329',
}

const riskLabelClassByLevel: Record<BorrowerRiskLevel | 'unknown', string> = {
  low: styles.labelLow,
  moderate: styles.labelModerate,
  high: styles.labelHigh,
  very_high: styles.labelVeryHigh,
  unknown: styles.labelUnknown,
}

function formatPercent(value: number | null) {
  if (value === null) {
    return 'Not available'
  }

  return `${value.toFixed(1)}%`
}

function formatMoney(value: number | null | undefined, currency = 'PHP') {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? formatCurrency(value, currency)
    : 'Not set'
}

function formatRange(range: PaymentRange | null, currency = 'PHP') {
  if (!range) {
    return 'Not available'
  }

  return `${formatCurrency(range.minimum, currency)} - ${formatCurrency(range.maximum, currency)}`
}

function getNeedleEnd(dti: number | null) {
  const clampedDti = Math.min(Math.max(dti ?? 0, 0), GAUGE_MAX_DTI)
  const angleRadians = (180 + (clampedDti / GAUGE_MAX_DTI) * 180) * (Math.PI / 180)

  return {
    x: NEEDLE_CENTER.x + Math.cos(angleRadians) * NEEDLE_LENGTH,
    y: NEEDLE_CENTER.y + Math.sin(angleRadians) * NEEDLE_LENGTH,
  }
}

function getBandDashLength(minDti: number, maxDti: number | null) {
  const cappedMin = Math.min(minDti, GAUGE_MAX_DTI)
  const cappedMax = Math.min(maxDti ?? GAUGE_MAX_DTI, GAUGE_MAX_DTI)

  return ((cappedMax - cappedMin) / GAUGE_MAX_DTI) * 100
}

function getBandDashOffset(minDti: number) {
  return -(Math.min(minDti, GAUGE_MAX_DTI) / GAUGE_MAX_DTI) * 100
}

export function LoanApplicationRiskMeter({
  className,
  currency = 'PHP',
  monthlyIncome,
  proposedMonthlyPayment,
}: LoanApplicationRiskMeterProps) {
  const dti = calculateDti(proposedMonthlyPayment, monthlyIncome)
  const riskBand = getBorrowerRiskBand(dti)
  const comfortableMonthlyRange = getComfortableMonthlyPaymentRange(monthlyIncome)
  const comfortablePerCutoffRange = getComfortablePerCutoffRange(monthlyIncome)
  const needleEnd = getNeedleEnd(dti)
  const riskLabel = riskBand?.label ?? 'Risk unavailable'
  const riskLevel = riskBand?.level ?? 'unknown'
  const proposedPaymentLabel = formatMoney(proposedMonthlyPayment, currency)

  return (
    <Card
      className={classNames(styles.meter, className)}
      title="Borrower Risk Meter"
      description="Proposed payment vs borrower income."
    >
      <div className={styles.content}>
        <div className={styles.gaugeWrap}>
          <svg className={styles.gauge} viewBox="0 0 240 136" role="img" aria-label={`${riskLabel}, DTI ${formatPercent(dti)}`}>
            <path className={styles.track} d={GAUGE_PATH} pathLength={100} />
            {BORROWER_RISK_BANDS.map((band) => (
              <path
                key={band.level}
                className={styles.band}
                d={GAUGE_PATH}
                pathLength={100}
                stroke={riskToneByLevel[band.level]}
                strokeDasharray={`${getBandDashLength(band.minDti, band.maxDti)} ${100 - getBandDashLength(band.minDti, band.maxDti)}`}
                strokeDashoffset={getBandDashOffset(band.minDti)}
              />
            ))}
            <line
              className={styles.needle}
              x1={NEEDLE_CENTER.x}
              y1={NEEDLE_CENTER.y}
              x2={needleEnd.x}
              y2={needleEnd.y}
            />
            <circle className={styles.hub} cx={NEEDLE_CENTER.x} cy={NEEDLE_CENTER.y} r="8" />
          </svg>

          <div className={styles.reading}>
            <span className={classNames(styles.label, riskLabelClassByLevel[riskLevel])}>
              {riskLabel}
            </span>
            <strong>{formatPercent(dti)}</strong>
            <span className="muted">Debt-to-income ratio</span>
          </div>
        </div>

        <dl className={styles.stats}>
          <div>
            <dt>Monthly income</dt>
            <dd>{formatMoney(monthlyIncome, currency)}</dd>
          </div>
          <div>
            <dt>Proposed monthly payment</dt>
            <dd>{proposedPaymentLabel}</dd>
          </div>
          <div>
            <dt>Comfortable monthly payment</dt>
            <dd>{formatRange(comfortableMonthlyRange, currency)}</dd>
          </div>
          <div>
            <dt>Comfortable per cutoff</dt>
            <dd>{formatRange(comfortablePerCutoffRange, currency)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
