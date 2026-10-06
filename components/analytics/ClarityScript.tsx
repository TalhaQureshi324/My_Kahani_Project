/**
 * Microsoft Clarity loader (session recordings, heatmaps).
 *
 * Mounted once in the root layout so it loads on every page. Rendered
 * as a plain inline script (Clarity's official manual-install snippet):
 * the stub itself is ~300 bytes and only appends an async
 * clarity.ms/tag script, so the heavy bundle never blocks parse,
 * hydration, or first paint. A next/script afterInteractive variant
 * would inject client-side only — invisible in served HTML and prone
 * to hydration-order quirks — with no perf benefit for an async loader.
 */
// Verified live against https://www.clarity.ms/tag/<id> (HTTP 200);
// the transposed variant "ytujc5cdn4" returns 204 and records nothing.
const CLARITY_PROJECT_ID = "ytjuc5cdn4";

const SNIPPET = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`;

export default function ClarityScript() {
  return (
    <script
      id="ms-clarity"
      // Static trusted string defined above — not user input.
      dangerouslySetInnerHTML={{ __html: SNIPPET }}
    />
  );
}
