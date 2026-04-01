import '@/app/ui/global.css'
import 'katex/dist/katex.min.css'
import { robotoMono } from './ui/fonts'
import AppProvider from "./providers";

export const metadata = {
  title: 'danzel serrano',
  description: 'danzelserrano.com',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${robotoMono.className} antialiased`} suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
