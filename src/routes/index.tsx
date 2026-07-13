import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main>
      <h1 className="sr-only">Ledger & Co. — prémium könyvelő iroda</h1>
      <Hero />
    </main>
  );
}
