'use client'
import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Sidebar({isSidebarOpen, toggleSidebar}) {
    const { user } = useAuth();
    
    return(
        <>
          {/* side bar */}

         {/* sidebar */}
          <aside className={`sidebar bg-pepsi text-white ${isSidebarOpen ? 'sidebar-show' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo d-flex align-items-center justify-content-center py-4">
        <button className="btn btn-danger" onClick={toggleSidebar}>X</button>
        <h3 className="ms-2 mb-0">Urbanesta</h3>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav mt-4">
        <ul className="nav flex-column">
          {[
            { icon: "bi-house-door", label: "Dashboard" ,path:"/admin", roles: ["admin", "subadmin"]},
            { icon: "bi-building", label: "Manage Property", path:"/manageproperty", roles: ["admin", "subadmin"] },
            { icon: "bi-geo-alt", label: "City", path:"/city", roles: ["admin", "subadmin"] },
            { icon: "bi-hammer", label: "Builders", path:"/buildermanagement", roles: ["admin", "subadmin"] },
            { icon: "bi-tags", label: "Categories", path:"/categories", roles: ["admin", "subadmin"] },
            { icon: "bi-people", label: "Users", path:"/users", roles: ["admin"] },
            { icon: "bi-telephone", label: "Leads", path:"/leads", roles: ["admin"] },
            { icon: "bi-gear", label: "Settings", path:"/settings", roles: ["admin"] },
            { icon: "bi-file-text", label: "Logs", path:"/logs", roles: ["admin"] },
          ].filter(item => {
            // If no roles specified, show to all users
            if (!item.roles) return true;
            // If user role is not available, show all items temporarily
            if (!user?.role) return true;
            // Otherwise filter by role
            return item.roles.includes(user.role);
          }).map((item, index) => (
            <li className="nav-item" key={index}>
              <Link href={item.path} className="nav-link text-white d-flex align-items-center sidebar-link">
                <i className={`bi ${item.icon} me-2`}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer mt-auto p-3 border-top border-white">
        <div className="d-flex align-items-center">
          <i className="bi bi-person-circle fs-3 me-2"></i>
          <div>
            <div>{user?.name || 'Admin User'}</div>
            <small>{user?.role === 'admin' ? 'Administrator' : 'Sub-Administrator'}</small>
          </div>
        </div>
      </div>
    </aside>
        </>
    )
}