import type { Metadata } from 'next'
import OrganizersView from './OrganizersView'

export const metadata: Metadata = {
  title: 'Ban tổ chức',
  description: 'Gặp gỡ đội ngũ kiến tạo và các đơn vị đồng tổ chức cuộc thi khởi nghiệp công nghệ GenD Arena 2026.',
  openGraph: {
    title: 'Ban tổ chức | GenD Arena 2026',
    description: 'Gặp gỡ đội ngũ kiến tạo và các đơn vị đồng tổ chức cuộc thi khởi nghiệp công nghệ GenD Arena 2026.',
  },
}

export default function OrganizersPage() {
  return <OrganizersView />
}
