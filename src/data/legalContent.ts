// Legal page content — converted verbatim from the Word documents supplied by
// the Beilstein-Institut (Impressum / Privacy Policy / Terms & Conditions,
// dated 2026). Only *formatting* was adjusted for on-screen readability:
// bold pseudo-headings in the source were promoted to real <h1>/<h2> headings,
// and the letterhead logo image was omitted (the operator is named in text).
// The wording is unchanged. These are static developer-authored strings, so
// rendering them via dangerouslySetInnerHTML carries no injection risk.

// Single source of truth — the same block is rendered in the imprint and the
// privacy policy, so they can never drift apart.
const ADDRESS_HTML = `
<p>
  Beilstein-Institut zur Förderung der Chemischen Wissenschaften<br />
  Trakehner Str. 7–9<br />
  60487 Frankfurt am Main<br />
  Germany<br />
  Phone: +49 69 716732-0<br />
  Fax: +49 69 716732-19<br />
  Email: <a href="mailto:info@beilstein-institut.de">info@beilstein-institut.de</a><br />
  Website: <a href="https://www.beilstein-institut.de" target="_blank" rel="noopener noreferrer">https://www.beilstein-institut.de</a>
</p>`;

export const IMPRINT_HTML = `
<h1>Impressum</h1>
<p>This website is operated by the Beilstein-Institut zur Förderung der Chemischen Wissenschaften.</p>
${ADDRESS_HTML}
<p>
  The Beilstein-Institut is a foundation established under civil law.<br />
  Board members: Olaf Beckmann-Haag, Dr. Wendy Patterson
</p>
<p>Foundation Number: (AZ): III 21-25d 04/11-(12)-22</p>
<p>Disclaimer: Despite careful checking of external links, we are not liable for any of their content. The responsibility for the content of the linked website is exclusively with the operators of this website.</p>
<p>We have tried to ensure that all information provided through our website is complete and accurate. However in view of the possibility of human error or changes in scientific knowledge, we do not warrant that the information included on the site is in every respect accurate or complete, and we are not responsible for any errors or omissions or the result obtained from use of such information.</p>
<p>Copyright © 2026 Beilstein-Institut zur Förderung der Chemischen Wissenschaften.</p>
`;

export const PRIVACY_HTML = `
<h1>Privacy Policy</h1>

<h2>§ 1 Information on the collection of personal data</h2>
<p>(1) In the following, we inform you about the processing of personal data when using this website and our services as well as about further processing procedures by us. Personal data are all data that can be related to you personally, such as name, address, e-mail address or user behavior.</p>
<p>(2) The responsible party pursuant to Art. 4 (7) of the General Data Protection Regulation (GDPR) is the</p>
${ADDRESS_HTML}
<p>You can reach our data protection officer at <a href="mailto:datenschutz@beilstein-institut.de">datenschutz@beilstein-institut.de</a> or at our postal address with the addition "Der Datenschutzbeauftragte".</p>
<p>(3) When you contact us by e-mail, telephone or mail, the data you provide (e-mail address, postal address, name or telephone number) will be stored by us in accordance with Art. 6 (1) lit. c GDPR in order to answer your questions.</p>
<p>We delete the data accruing in this context after the storage is no longer necessary. If the request is assigned to a contract, we may also initially restrict processing in accordance with the contract terms and then delete it. In the case of statutory retention obligations, deletion will only take place when they expire.</p>
<p>(4) No data is transferred to third parties in the sense of Art. 4 (10) GDPR</p>

<h2>§ 2 Data processing when you visit our website</h2>
<p>(1) When you visit our website without otherwise providing us with information, we process the personal data that your browser transmits to our server. The data described below is technically necessary for us to display our website to you and to ensure stability and security and must therefore be processed by us:</p>
<ul>
  <li>IP address</li>
  <li>Date and time of the request</li>
  <li>Time zone difference to Greenwich Mean Time (GMT)</li>
  <li>Content of the request (specific page)</li>
  <li>Access status/HTTP status code (e.g. file found, file not found)</li>
  <li>Amount of data transferred in each case</li>
  <li>Website from which the request came to us</li>
  <li>Browser</li>
  <li>Operating system and its interface</li>
  <li>Language and version of the browser software.</li>
</ul>
<p>(2) We use this data collected and stored in log files for stability and security reasons and delete them within 2 weeks.<br />
Data that require further storage for evidentiary purposes are exempt from deletion until the respective incident has been finally clarified. The collection of data for the provision of the website and the storage of the data in log files is absolutely necessary for the operation of the website. Therefore, the user has no right to object.</p>
<p>(3) Data processing is carried out on the basis of our legal obligation to guarantee IT security in accordance with Art. 6 (1) lit. c in conjunction with Art. 32 GDPR and in accordance with Art. 6 (1) lit. f GDPR, as otherwise we would not be able to provide our offered services in a functional manner. Your visit to our website is based on your autonomous decision. This wish can only be fulfilled by means of the described data processing.</p>
<p>(4) Explain that InChI is a static web application. Any molecule you draw and the identifiers derived from it (InChI, InChIKey, molecular formula) are processed entirely within your browser; they are never transmitted to, or stored on, our servers.</p>

<h2>§ 3 Cookies and local storage</h2>
<p>(1) We do not use Cookies. We do not use tracking, analytics or advertising technologies of any kind.</p>
<p>(2) The embedded molecule editor (Ketcher) stores technically necessary settings in your browser's local storage, for example display options such as bond length and zoom level, and any structures you mark as favourites. This data remains on your device, is never transmitted to our servers or to third parties, and contains no personal data. It is used solely to make the editor work as expected. You can delete it at any time via your browser's settings for site data.</p>
<p>(3) When this website is served from GitHub Pages, a Service Worker is registered in your browser. It serves the single purpose of setting the security headers (Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy) that the browser requires before the WebAssembly component computing the InChI may run. It performs no tracking and transmits no data.</p>

<h2>§ 4 Your rights</h2>
<p>(1) You have the following rights with regard to the personal data concerning you:</p>
<ul>
  <li>right to information,</li>
  <li>right to correction or deletion,</li>
  <li>right to restriction of processing,</li>
  <li>right to object to processing,</li>
  <li>right to data portability.</li>
</ul>
<p>(2) You also have the right to complain to the competent data protection supervisory authority about the processing of your personal data by us, for example the Hessian Commissioner for Data Protection and Freedom of Information.</p>

<h2>§ 5 Objection to or revocation of the processing of your data</h2>
<p>(1) Insofar as we base the processing of your personal data on the legal basis of the exercise of a legitimate interest pursuant to Art. 6 (1) lit. f GDPR, you may object to the processing. This is the case if the processing is not necessary, in particular, for the fulfillment of a contract with you. When exercising such an objection, we ask you to explain the reasons why we should not process your personal data in the way we have done. In the event of your objection, we will review the situation and either discontinue or adjust the data processing or show you our compelling legitimate grounds on the basis of which we will continue the processing.</p>
<p>(2) Of course, you can object to the processing of your personal data for data analysis purposes at any time.</p>
<p>Version 07.07.2026</p>
`;

export const TERMS_HTML = `
<h1>Terms &amp; Conditions</h1>
<p>This Web Site and its content is protected by copyright law. Use of this Web Site is subject to these Terms and Conditions.</p>
<ol>
  <li>Explain that InChI is Open Source Software under the MIT License (see below). Bundled third-party components retain their own licenses, as set out in the sections below.</li>
  <li>Everybody is free to use Explain that InChI to draw a molecule and explore the structure of its InChI (the IUPAC International Chemical Identifier).</li>
  <li>This Web Site and its content is provided for use "as is". The Beilstein-Institut makes no representations or warranties with respect to this Web Site or its contents including without limitation quality, completeness, timeliness or accuracy of data. The identifiers shown (InChI, InChIKey, molecular formula) are generated automatically in your browser and may contain errors.</li>
  <li>The general terms and conditions of our <a href="#privacy">Privacy Policy</a> apply.</li>
  <li>The Beilstein-Institut reserves the right in whole or in part to change or delete this Web Site or suspend your access or terminate this Web Site at any time without notice.</li>
  <li>In no event shall Beilstein-Institut be liable for any damages of any nature result directly or indirectly from use or disuse of the information provided on this Web Site unless damages were demonstrably caused deliberately or caused by gross negligence of the Beilstein-Institut.</li>
  <li>The Beilstein-Institut shall not be held liable for the content of any third-party web sites this Web Site is linked to.</li>
  <li>These terms shall be governed by the laws of the Federal Republic of Germany. Sole place of jurisdiction for all disputes arising out or in connection with the use of this Web Site and its contents shall be Frankfurt am Main.</li>
</ol>

<h2>MIT License</h2>
<p>Copyright © 2026 Beilstein-Institut zur Förderung der Chemischen Wissenschaften</p>
<p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:</p>
<p>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</p>
<p>The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.</p>

<h2>Third-party components</h2>
<p>Explain that InChI runs entirely in the browser and bundles the following open-source components. The complete dependency list with resolved versions is in package-lock.json; the full attribution notices are in THIRD-PARTY-NOTICES.md.</p>
<p><strong>Ketcher</strong> (ketcher-core, ketcher-react, ketcher-standalone, indigo-ketcher) — Apache-2.0<br />
The molecule editor and the in-browser WebAssembly provider that computes the InChI and InChIKey. © EPAM Systems, Inc.</p>
<p><strong>IBM Plex Sans / Mono / Serif</strong> — OFL-1.1<br />
Self-hosted webfonts, delivered via the @fontsource packages. © IBM Corp.</p>
<p><strong>React &amp; React DOM</strong> — MIT<br />
UI framework for the single-page application.</p>
<p><strong>Zustand</strong> — MIT<br />
Client-side state management.</p>
<p>The remaining dependencies (react-transition-group, dom-helpers, and transitive utilities) are licensed under MIT, ISC, or BSD-2/3-Clause; their notices ship inside each package and, where bundled, within the distributed output.</p>
`;
