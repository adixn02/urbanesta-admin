import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css'
import React from "react";
import 'bootstrap-icons/font/bootstrap-icons.css';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
  title: 'Urbanesta Admin Panel',
  description: 'Admin panel for Urbanesta property management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
