import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound() {
    return (
        <div className="mx-auto max-w-md py-20 text-center">
            <p className="font-display text-6xl font-semibold text-forest-900/20">404</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">Page not found</h1>
            <p className="mt-2 text-sm text-forest-900/60">
                The page you requested does not exist in HH AI Manager.
            </p>
            <Link to="/" className="mt-6 inline-block">
                <Button>Return to overview</Button>
            </Link>
        </div>
    );
}