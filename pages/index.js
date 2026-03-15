import dynamic from 'next/dynamic';

const GastosApp = dynamic(() => import('../src/GastosApp'), { ssr: false });

export default function Home() {
  return <GastosApp />;
}
