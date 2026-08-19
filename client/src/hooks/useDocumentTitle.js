import { useEffect } from 'react';

const SITE_NAME = 'AI/ML Career Forum';

export const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
};
