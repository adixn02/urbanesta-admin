import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css'
import React from "react";
import 'bootstrap-icons/font/bootstrap-icons.css';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
  title: 'Urbanesta Admin Panel',
  description: 'Admin panel for Urbanesta property management',
  icons: {
    icon: [
      { url: '/img/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/img/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/img/favicon-32.png',
    apple: '/img/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
