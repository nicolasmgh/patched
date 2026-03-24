import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ReportDetail from "./pages/ReportDetail";
import Profile from "./pages/Profile";
import NewReport from "./pages/NewReport";
import NotFound from "./pages/NotFound";
import PublicProfile from "./pages/PublicProfile";
import Admin from "./pages/Admin";
import AdminReport from "./pages/AdminReport";

import Stats from './pages/Stats'

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
            <Route path="/users/:userId" element={<PublicProfile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/reports/:id" element={<AdminReport />} /><Route path="/stats" element={<Stats />} />
        </Routes>
    );
}

export default App;
