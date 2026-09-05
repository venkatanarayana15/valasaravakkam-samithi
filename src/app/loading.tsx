import SaiLoader from "@/components/SaiLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SaiLoader size="lg" caption="Sai Ram… loading" />
    </div>
  );
}
