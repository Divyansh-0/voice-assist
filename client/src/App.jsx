import Chat from "./components/Chat";
import Dashboard from "./components/Dashboard";
import Form from "./components/Form";
import Root from "./Root";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

export default function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Root />,
      children: [
        {
          path: "/chat",
          element: <Chat />,
        },

        {
          path: "/register",
          element: <Form />,
          index: true,
        },
        {
          path: "/admin_dashboard",
          element: <Dashboard />,
        },
      ],
    },
  ]);
  return (
    <div className="flex justify-center items-center flex-col bg-slate-500 h-screen">
      <RouterProvider router={router} />
    </div>
  );
}
