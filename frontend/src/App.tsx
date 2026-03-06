import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import RouteError from "./components/RouteError";
import Home from "./views/Home";
import Auth from "./views/Auth";
import Collaborations from "./views/Collaborations";
import CollaborationDetail from "./views/CollaborationDetail";
import Events from "./views/Events";
import EventDetail from "./views/EventDetail";
import EditEvent from "./views/EditEvent";
import Schedule from "./views/Schedule";
import Messages from "./views/Messages";
import CreateCollaboration from "./views/CreateCollaboration";
import SuggestEvent from "./views/SuggestEvent";
import Moderation from "./views/Moderation";
import MyAccount from "./views/MyAccount";
import NotFound from "./views/NotFound";
import { useAuthStore } from "./stores/auth.store";
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
        path: "collaborations",
        element: <Collaborations />,
        handle: { title: "Collabs", breadcrumb: "Collabs" } satisfies RouteHandle,
      },
      {
        path: "collaborations/new",
        element: <CreateCollaboration />,
        handle: { title: "New Collaboration", breadcrumb: "New Collaboration" } satisfies RouteHandle,
      },
      {
        path: "collaborations/:collaborationId/edit",
        element: <CreateCollaboration />,
        handle: { title: "Edit Collaboration", breadcrumb: "Edit Collaboration" } satisfies RouteHandle,
      },
      {
        path: "collaborations/:collaborationId",
        element: <CollaborationDetail />,
        handle: { title: "Collab Detail", breadcrumb: "Collab Detail" } satisfies RouteHandle,
      },
      {
        path: "events",
        element: <Events />,
        handle: { title: "Events", breadcrumb: "Events" } satisfies RouteHandle,
      },
      {
        path: "schedule",
        element: <Schedule />,
        handle: { title: "Schedule", breadcrumb: "Schedule" } satisfies RouteHandle,
      },
      {
        path: "events/suggest",
        element: <SuggestEvent />,
        handle: { title: "Suggest Event", breadcrumb: "Suggest Event" } satisfies RouteHandle,
      },
      {
        path: "events/:eventId",
        element: <EventDetail />,
        handle: { title: "Event Detail", breadcrumb: "Event Detail" } satisfies RouteHandle,
      },
      {
        path: "events/:eventId/edit",
        element: <EditEvent />,
        handle: { title: "Edit Event", breadcrumb: "Edit Event" } satisfies RouteHandle,
      },
      {
        path: "messages",
        element: <Messages />,
        handle: { title: "Messages", breadcrumb: "Messages" } satisfies RouteHandle,
      },
      {
        path: "messages/:conversationId",
        element: <Messages />,
        handle: { title: "Messages", breadcrumb: "Messages" } satisfies RouteHandle,
      },
      {
        path: "admin/moderation",
        element: <Moderation />,
        handle: { title: "Moderation", breadcrumb: "Moderation" } satisfies RouteHandle,
      },
      {
        path: "account",
        element: <MyAccount />,
        handle: { title: "My Account", breadcrumb: "My Account" } satisfies RouteHandle,
      },
      {
        path: "login",
        element: <Auth />,
        handle: { title: "Login", breadcrumb: "Login" } satisfies RouteHandle,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, [init]);

  return <RouterProvider router={router} />;
}
