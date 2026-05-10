/**
 * Legacy Next.js placeholder page (optional). The production app is Vite + Vercel `/api/*`.
 * Use `npm run dev` (Vite) or `npm run dev:vercel` for APIs locally.
 */
export default function ProjectHome() {
  return (
    <main
      style={{
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        padding: 32,
        maxWidth: 560,
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Operating Model Simulator</h1>
      <p>
        UI: run <code>npm run dev</code> → <code>http://localhost:5173</code> (including <code>/debug</code>).
      </p>
      <p>
        Full-stack local (Vite + serverless <code>/api</code>): run <code>npm run dev:vercel</code>.
      </p>
      <p>Deployed API examples:</p>
      <ul>
        <li>
          <code>POST /api/gemini</code> — body <code>{`{ "prompt": "..." }`}</code>
        </li>
        <li>
          <code>POST /api/predict-allocation</code> — body{' '}
          <code>{`{ "engagementId": "uuid", "taskId": "uuid" }`}</code>
        </li>
        <li>
          <code>PATCH /api/tasks/[id]</code> — task override fields
        </li>
      </ul>
    </main>
  )
}
