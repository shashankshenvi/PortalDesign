// components/Layout/Layout.jsx
import React, { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import Sidebar from "../Sidebar/Sidebar";
import "./Layout.css";

const Layout = () => {
  // track sidebar expanded/collapsed so the layout can adapt (optional)
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // called by Sidebar -> onToggle(expanded)
  const handleSidebarToggle = useCallback((expanded) => {
    setSidebarExpanded(Boolean(expanded));
  }, []);

  return (
    <div
      className={`layout-wrapper ${
        sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"
      }`}
      role="application"
      aria-live="polite"
    >
      <Header />

      <div className="layout-body">
        {/* Sidebar informs the layout when it expands/collapses */}
        <Sidebar
          onToggle={handleSidebarToggle}
          defaultExpanded={sidebarExpanded}
        />

        {/* Outlet is where nested routes (MainPage, ProfilePage, etc.) will render */}
        <main className="layout-main">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Layout;
