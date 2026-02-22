import { ChevronLeft } from 'lucide-react'

interface LegalPageProps {
  onBack: () => void
}

export function Impressum({ onBack }: LegalPageProps) {
  return (
    <main className="legal-page">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={18} /> Zurück
      </button>
      <h2>Impressum</h2>
      <h3>Angaben nach §5 TMG</h3>
      <p>Nomadiq Labs GmbH<br/>Korsörer Straße 2<br/>10437 Berlin</p>
      <h3>Vertreten durch</h3>
      <p>Robert Strobl</p>
      <h3>Registergericht</h3>
      <p>Handelsregister<br/>HRB 249 234 B<br/>Amtsgericht Charlottenburg</p>
      <h3>Umsatzsteuer ID</h3>
      <p>DE358933512</p>
      <h3>Kontakt</h3>
      <p>E-Mail: mail@rstrobl.com</p>
      <h3>Haftung für Inhalte</h3>
      <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      <h3>Haftung für Links</h3>
      <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.</p>
    </main>
  )
}

export function Datenschutz({ onBack }: LegalPageProps) {
  return (
    <main className="legal-page">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={18} /> Zurück
      </button>
      <h2>Datenschutzerklärung</h2>
      <h3>1. Verantwortlicher</h3>
      <p>Nomadiq Labs GmbH<br/>Korsörer Straße 2, 10437 Berlin<br/>E-Mail: mail@rstrobl.com</p>
      <h3>2. Erhebung und Speicherung personenbezogener Daten</h3>
      <p>Beim Besuch unserer Website werden automatisch Informationen an den Server übermittelt (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite). Diese Daten werden nur zur Bereitstellung der Website benötigt und nach 7 Tagen gelöscht.</p>
      <h3>3. Warteliste / E-Mail-Erfassung</h3>
      <p>Wenn Sie sich auf unsere Warteliste eintragen, speichern wir Ihre E-Mail-Adresse, den Namen und das Alter des Kindes sowie Ihre Hörspiel-Wünsche. Diese Daten verwenden wir ausschließlich, um Ihr personalisiertes Hörspiel zu erstellen und Sie über die Fertigstellung zu informieren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).</p>
      <h3>4. Weitergabe von Daten</h3>
      <p>Eine Weitergabe Ihrer Daten an Dritte erfolgt nicht, es sei denn, dies ist zur Erbringung unserer Dienstleistung erforderlich (z.B. Hosting-Provider). Wir nutzen Server in Deutschland (EU).</p>
      <h3>5. Ihre Rechte</h3>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten. Zur Ausübung Ihrer Rechte kontaktieren Sie uns unter mail@rstrobl.com.</p>
      <h3>6. Löschung</h3>
      <p>Ihre Daten werden gelöscht, sobald der Zweck der Speicherung entfällt oder Sie Ihre Einwilligung widerrufen.</p>
      <h3>7. Cookies</h3>
      <p>Diese Website verwendet keine Cookies und kein Tracking.</p>
    </main>
  )
}