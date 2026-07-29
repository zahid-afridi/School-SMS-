import PageLoader from "./components/PageLoader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f9f9fb] p-4">
      <PageLoader label="Opening School SMS" />
    </div>
  );
}
