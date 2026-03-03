import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import RouteError from "./components/RouteError";
import Home from "./views/Home";
import NotFound from "./views/NotFound";
import type { RouteHandle } from "./types/route";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Home />,
        handle: { title: "Home", breadcrumb: "Home" } satisfies RouteHandle,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
