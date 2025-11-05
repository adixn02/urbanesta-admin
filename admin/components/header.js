import React from 'react';

export default function Header({toggleSidebar, handleSignOut}) {
    return (
        <>
         <header className="custom-header shadow-sm fixed-top">
        <nav className="container-fluid d-flex align-items-center justify-content-between">
          {/* Left Section - Logo + Title */}
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-3" onClick={toggleSidebar}>
              <i className="bi bi-list fs-4"></i>
            </button>

            <h1 className="brand-title mb-0">Urbanesta Realtors</h1>
          </div>

          {/* Right Section - User Action */}
          <div>
            <button className="btn btn-danger px-3" onClick={handleSignOut}>
              <i className="bi bi-box-arrow-right me-2"></i>
              Sign Out
            </button>
          </div>
        </nav>
      </header>
        </>
    )
}