import logoUrl from '../assets/beilstein-institut-logo-wide.png';

// Publisher mark. Header (main app) and LegalPage (hash routes) both show it
// top right; sizing lives in the parent's CSS (.header-logo / .legal-top).
export function BrandLogo({ className }: { className: string }) {
  return (
    <a
      className={className}
      href="https://www.beilstein-institut.de/en/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img src={logoUrl} width={507} height={120} alt="Beilstein-Institut" />
    </a>
  );
}
