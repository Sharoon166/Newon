import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Newon Inventory Management System',
    short_name: 'newon',
    description: 'An inventory management system for newon & waymor.',
    start_url: '/',
    display: 'standalone',
    // 🖥️ Gives a cleaner native feel on desktop (hides browser controls better)
    display_override: ['window-controls-overlay', 'standalone'], 
    background_color: '#ffffff',
    theme_color: '#000000',
    // 📱 Restricts orientation if your dashboard layouts break on mobile rotation
    // orientation: 'portrait-primary', 
    
    // 🔒 Security: Prevents the app from navigating to external unapproved domains
    scope: '/', 

    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/newon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable', // 📐 Allows Android to crop the icon nicely
      },
      {
        src: '/newon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],

    // ⚡ App Shortcuts: Right-click/Long-press the app icon to jump straight to these pages
    shortcuts: [
      {
        name: 'View Inventory',
        short_name: 'Stocks',
        description: 'Check current stock levels',
        url: '/inventory',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      },
      {
        name: 'New Sale / Order',
        short_name: 'New Order',
        description: 'Create a new customer order',
        url: '/orders/new',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      }
    ],

    // 🎨 Customizes the splash screen launch behavior on Android/iOS
    // screenshots: [
    //   {
    //     src: '/screenshots/desktop-dashboard.png',
    //     sizes: '2560x1440',
    //     type: 'image/png',
    //     form_factor: 'wide', // Desktop PWA install preview
    //     label: 'Main Dashboard View'
    //   },
    //   {
    //     src: '/screenshots/mobile-dashboard.png',
    //     sizes: '1080x1920',
    //     type: 'image/png',
    //     form_factor: 'narrow', // Mobile PWA install preview
    //     label: 'Mobile Inventory Tracking'
    //   }
    // ]
  }
}
