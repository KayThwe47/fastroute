import './globals.css'

export const metadata = {
  title: 'fastroute - Delivery Bot System',
  description: 'Route optimization for delivery bots',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
