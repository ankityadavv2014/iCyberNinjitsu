import { redirect } from 'next/navigation';

/**
 * Trends and pipeline run are now on the Dashboard (live feed + Run pipeline).
 * Redirect so bookmarks and old links still work.
 */
export default function PipelinesPage() {
  redirect('/dashboard');
}
