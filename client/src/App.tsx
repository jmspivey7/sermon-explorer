import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "./pages/home";
import Sermons from "./pages/sermons";
import Viewer from "./pages/viewer";
import Upload from "./pages/upload";
import Admin from "./pages/admin";
import Worship from "./pages/worship";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sermons" component={Sermons} />
      <Route path="/view/:sermonId" component={Viewer} />
      <Route path="/upload" component={Upload} />
      <Route path="/admin" component={Admin} />
      <Route path="/worship" component={Worship} />
      <Route>
        <div className="flex items-center justify-center min-h-screen bg-se-navy">
          <p className="text-lg text-white/60">Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}
