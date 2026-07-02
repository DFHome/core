import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DeviceDetail from "./pages/DeviceDetail";
import ScenarioForm from "./pages/ScenarioForm";
import Scenarios from "./pages/Scenarios";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1>DFHome</h1>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Устройства
          </NavLink>
          <NavLink to="/scenarios" className={({ isActive }) => (isActive ? "active" : "")}>
            Сценарии
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            Настройки
          </NavLink>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices/:id" element={<DeviceDetail />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/scenarios/new" element={<ScenarioForm />} />
          <Route path="/scenarios/:id/edit" element={<ScenarioForm />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
