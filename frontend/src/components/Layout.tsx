import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <nav>
          <a href="/">App</a>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
