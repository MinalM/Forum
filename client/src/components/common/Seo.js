import { Helmet } from 'react-helmet-async';

export const SITE_NAME = 'AI/ML Career Forum';
export const DEFAULT_DESCRIPTION =
  'AI/ML Career Transition Forum - A community for professionals transitioning to AI/ML careers';

// Vite replaces %REACT_APP_SITE_URL% in index.html at build time; read the
// same env var here so canonical/og:url stay in sync with that value.
const SITE_URL = (import.meta.env.REACT_APP_SITE_URL || '').replace(/\/+$/, '');

export const toAbsoluteUrl = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return SITE_URL ? `${SITE_URL}${normalizedPath}` : normalizedPath;
};

export const truncateDescription = (text, maxLength = 160) => {
  if (!text) return DEFAULT_DESCRIPTION;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
};

// Per-route <head> tags: description, canonical, and Open Graph/Twitter
// metadata. Rendered nested inside the App-level default Seo (below), so a
// route that doesn't override a field falls back to the site-wide default -
// react-helmet-async merges outer/inner Helmet instances, inner wins.
// Deliberately does not touch <title>; useDocumentTitle already owns
// document.title and racing two mechanisms against it would make title
// assertions flaky.
const Seo = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  type = 'website',
  image,
  noindex = false
}) => {
  const socialTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = toAbsoluteUrl(path);

  return (
    <Helmet>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={socialTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={socialTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta name="twitter:image" content={image} />}
      {noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
};

export default Seo;
