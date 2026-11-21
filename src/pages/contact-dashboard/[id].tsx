import { useRouter } from 'next/router';
import { TailwindPageLayout } from '@/components/layout/TailwindPageLayout';
import ContactDashboard from '@/components/contact-dashboard/ContactDashboard';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';

// Page component doesn't need to define the DashboardData interface anymore
// as the EntityDashboard component now handles data loading internally

export default function EntityDashboardPage() {
  const router = useRouter();
  const { id } = router.query;
  
  return (
    <Layout>
      <Head>
        <title>Contact Dashboard | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
        header={<div className="flex flex-col space-y-4 bg-white py-2 rounded-lg">
          <div>
            {!id ? (
              <div>Loading...</div>
            ) : (
              <ContactDashboard
                entityId={id as string} />
            )}
          </div>
        </div>} children={''} >      
      </TailwindPageLayout>
    </Layout>
    
  );
}
