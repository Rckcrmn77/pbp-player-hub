"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col gap-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-navy/80">Please try again. If the problem continues, contact PBP staff.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mx-auto rounded-md bg-orange px-4 py-2 font-semibold text-white hover:bg-orange-dark"
      >
        Try again
      </button>
    </div>
  );
}
