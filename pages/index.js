/**
 * Next.js in this repo is used for API routes only; the SPA runs on Vite (port 5173).
 * This page avoids a confusing 404 when opening http://localhost:3000.
 */
export default function ApiServerHome() {
  return (
    <main
      style={{
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        padding: 32,
        maxWidth: 560,
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Next.js API (local)</h1>
      <p>
        The UI (including <code>/debug</code>) is served by Vite — run{' '}
        <code>npm run dev</code> and open <code>http://localhost:5173</code>.
      </p>
      <p>API routes on this server:</p>
      <ul>
        <li>
          <code>POST /api/gemini</code> — body <code>{`{ "prompt": "..." }`}</code>
        </li>
        <li>
          <code>POST /api/predict-allocation</code> — body{' '}
          <code>{`{ "engagementId": "uuid", "taskId": "uuid" }`}</code>
        </li>
      </ul>
    </main>
  )
}
