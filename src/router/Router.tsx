import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Home from "../pages/Home.tsx";
import DemoTest from "../pages/DemoTest.tsx";
import Project from "../pages/Project.tsx";

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/demo',
    element: <DemoTest />,
  },
  {
    path: '/project/:id',
    element: <Project />,
  }
]);

export default function Router() {
  return <RouterProvider router={router} />
}
