interface LoadingPageProps {
  message: string
}

export function LoadingPage({ message }: LoadingPageProps) {
  return (
    <main className="loading">
      <div className="loading-visual">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="loading-bar" />
        ))}
      </div>
      <p className="loading-text">{message}</p>
      <p className="loading-sub">Nur ein paar Sekunden...</p>
    </main>
  )
}