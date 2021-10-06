import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

import Top from "./pages/Top";
import Join from "./pages/Join";
import Create from "./pages/Create";
import Conference from "./pages/Conference";

function App() {
  return (
    <>
      <Router>
        <Switch>
          <Route exact path="/">
            <Top />
          </Route>
          <Route exact path="/join">
            <Join />
          </Route>
          <Route exact path="/create">
            <Create />
          </Route>
          <Route path="/conference/:roomId">
            <Conference />
          </Route>
        </Switch>
      </Router>
    </>
  );
}

export default App;
