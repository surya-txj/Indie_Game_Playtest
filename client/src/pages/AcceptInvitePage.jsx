import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { acceptInvitation } from '../api/endpoints.js';
import { Card, ErrorMessage, Spinner } from '../components/ui/index.js';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    acceptInvitation(token)
      .then(({ sessionId }) => {
        qc.invalidateQueries({ queryKey: ['workspace'] });
        navigate(`/sessions/${sessionId}`, { replace: true });
      })
      .catch(setError);
  }, [token, navigate, qc]);

  return (
    <div className="mx-auto max-w-lg">
      <Card title="Accept playtest invitation">
        {!error && <Spinner label="Accepting your invitation…" />}
        {error && (
          <div className="space-y-3">
            <ErrorMessage error={error} />
            <p className="text-sm text-slate-600">
              Make sure you are logged in with the email address the invitation was sent to.{' '}
              <Link to="/" className="text-brand-700 hover:underline">Go to your sessions</Link>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
