import { useEffect, useState } from 'react';
import { getScreenshotBlob } from '../../api/endpoints.js';

/** Screenshots need the auth header, so they load as blobs instead of plain <img src>. */
export function Screenshot({ reportId, file }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    getScreenshotBlob(reportId, file)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reportId, file]);
  if (failed) return <div className="flex h-32 items-center justify-center rounded bg-slate-100 text-xs text-slate-500">Not available</div>;
  if (!url) return <div className="h-32 animate-pulse rounded bg-slate-100" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Tester screenshot" className="h-32 w-full rounded border border-slate-200 object-cover" />
    </a>
  );
}
