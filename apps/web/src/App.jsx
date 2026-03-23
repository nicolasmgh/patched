import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ReportDetail from "./pages/ReportDetail";
import Profile from "./pages/Profile";
import NewReport from "./pages/NewReport";
import NotFound from "./pages/NotFound";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/new-report" element={<NewReport />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
