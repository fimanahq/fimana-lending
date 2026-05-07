function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="ui-skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className="ui-skeleton__line" />
      ))}
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="dashboard-overview dashboard-overview--loading stack" aria-busy="true" aria-live="polite">
      <section className="dashboard-overview__executive">
        <section className="dashboard-overview__kpiGrid dashboard-overview__kpiGrid--six">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={index}
              className={`dashboard-overview__statCard ${
                index === 1
                  ? 'dashboard-overview__statCard--sage'
                  : index === 2
                    ? 'dashboard-overview__statCard--ink'
                    : 'dashboard-overview__statCard--plain'
              }`}
            >
              <SkeletonLines />
            </article>
          ))}
        </section>

        <section className="dashboard-overview__contentGrid">
          <div className="dashboard-overview__mainColumn">
            <article className="dashboard-overview__progressCard">
              <SkeletonLines count={5} />
            </article>
            <article className="dashboard-overview__progressCard">
              <SkeletonLines count={5} />
            </article>
            <article className="dashboard-overview__tableCard">
              <SkeletonLines count={6} />
            </article>
          </div>

          <aside className="dashboard-overview__sideColumn">
            <article className="dashboard-overview__progressCard">
              <SkeletonLines count={4} />
            </article>
            <article className="dashboard-overview__progressCard">
              <SkeletonLines count={4} />
            </article>
          </aside>
        </section>
      </section>
    </div>
  )
}
