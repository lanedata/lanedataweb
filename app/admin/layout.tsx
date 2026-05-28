import { AdminNav } from '@/components/admin/AdminNav'

export const metadata = { title: { default: 'Admin · lanedata', template: '%s · Admin · lanedata' } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  )
}
