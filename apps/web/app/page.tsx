import App from "../src/App";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const cluster = typeof params.cluster === "string" ? params.cluster : undefined;

  return (
    <App
      initialSignature={typeof params.signature === "string" ? params.signature : ""}
      initialCluster={cluster === "devnet" || cluster === "testnet" ? cluster : "mainnet-beta"}
    />
  );
}
