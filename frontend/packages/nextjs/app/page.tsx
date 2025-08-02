import { EthIndexerDashboard } from "../components/ethindexer/Dashboard";

export default function Home() {
  return (
    <main>
      <EthIndexerDashboard />
    </main>
  );
}

// Optional: You can also add metadata for better SEO
export const metadata = {
  title: "EthIndexer - AI-Powered Blockchain Data Indexing",
  description: "Index Ethereum blockchain data using natural language queries powered by AI",
};