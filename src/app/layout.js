import "./globals.css"
export const metadata = {
  title: "Hospitality Alpha Engine",
  description: "AI-powered investment intelligence for hospitality equities"
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
