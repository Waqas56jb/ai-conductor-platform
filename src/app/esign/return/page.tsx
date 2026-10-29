import { SigningReturn } from "./SigningReturn";

/**
 * DocuSign sends the signing frame here when the signer is done (or leaves).
 * The page only tells the app around it; the status itself is read from
 * DocuSign by the server, never trusted from this URL.
 */
export default async function SigningReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; event?: string }>;
}) {
  const { r, event } = await searchParams;
  return <SigningReturn requestId={r ?? ""} event={event ?? ""} />;
}
