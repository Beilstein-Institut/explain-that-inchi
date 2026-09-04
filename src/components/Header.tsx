import logoUrl from '../assets/beilstein-institut-logo-wide.png';

export function Header() {
  return (
    <header className="header">
      <div className="header-title">
        <h1>
          Explain that <em>InChI</em>
        </h1>
        {/* Labels the editor <section> in KetcherPanel via aria-labelledby. */}
        <h2 id="editor-heading">Draw a molecule to learn more about its InChI</h2>
      </div>
      <a
        className="header-logo"
        href="https://www.beilstein-institut.de/en/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={logoUrl} width={507} height={120} alt="Beilstein-Institut" />
      </a>
    </header>
  );
}
