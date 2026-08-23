import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app-shell">
      <section className="hero">
        <span className="eyebrow">React + Vite</span>
        <h1>Your new app is ready.</h1>
        <p className="intro">
          Start building by editing <code>src/App.jsx</code>. Your changes will
          appear instantly while the development server is running.
        </p>

        <div className="actions">
          <button type="button" onClick={() => setCount((value) => value + 1)}>
            Count is {count}
          </button>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            Read the React docs <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </main>
  )
}

export default App
