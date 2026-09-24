import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
      <p className="text-sm font-semibold tracking-wide text-orange uppercase">404</p>
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-navy/80">We couldn&apos;t find the page you were looking for.</p>
      <Link href="/" className="font-medium text-carolina-dark underline">
        Back to home
      </Link>
    </div>
  );
}
