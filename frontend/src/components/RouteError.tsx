import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{error.status}</h1>
        <p>{error.statusText}</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Unexpected Error</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
      <Link to="/">Go home</Link>
    </div>
  );
}
