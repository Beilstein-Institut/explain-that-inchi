import { BrandLogo } from './BrandLogo';

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
      <BrandLogo className="header-logo" />
    </header>
  );
}
