import { Helmet } from 'react-helmet-async';
import { markdownToPlainText } from '../../utils/markdown';

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

// Builds QAPage + Question/Answer JSON-LD (https://schema.org/QAPage) for a
// post's <Seo jsonLd> prop. `answers` is the post's top-level comments only
// (replies aren't separate schema.org Answers) - the accepted one, if any,
// becomes acceptedAnswer and the rest become suggestedAnswer, matching what
// a reader actually sees on the page.
export const buildQaPageJsonLd = ({ post, answers = [] }) => {
  const url = toAbsoluteUrl(`/posts/${post._id}`);
  const netVotes = (item) =>
    (item.upvotes?.length || 0) - (item.downvotes?.length || 0);
  const toPlainText = (markdown) =>
    markdownToPlainText(markdown).trim().replace(/\s+/g, ' ');

  const toAnswerJsonLd = (answer) => ({
    '@type': 'Answer',
    text: toPlainText(answer.content),
    upvoteCount: netVotes(answer),
    dateCreated: answer.createdAt,
    url,
    ...(answer.user?.name && {
      author: { '@type': 'Person', name: answer.user.name }
    })
  });

  const acceptedAnswer = answers.find((answer) => answer.isAnswer);
  const suggestedAnswers = answers.filter((answer) => !answer.isAnswer);

  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: post.title,
      text: toPlainText(post.content),
      url,
      answerCount: answers.length,
      upvoteCount: netVotes(post),
      dateCreated: post.createdAt,
      ...(post.user?.name && {
        author: { '@type': 'Person', name: post.user.name }
      }),
      ...(acceptedAnswer && { acceptedAnswer: toAnswerJsonLd(acceptedAnswer) }),
      ...(suggestedAnswers.length > 0 && {
        suggestedAnswer: suggestedAnswers.map(toAnswerJsonLd)
      })
    }
  };
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
  noindex = false,
  jsonLd
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
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default Seo;
