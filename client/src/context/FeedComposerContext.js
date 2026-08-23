import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

// Coordinates the feed's inline answer/reply composers so opening one
// closes any other already open in the same list. `useOpenComposer` falls
// back to local-only state when no provider is present, so PostItem stays
// usable (just uncoordinated) outside a feed list, e.g. in isolated tests.
const FeedComposerContext = createContext(null);

export const FeedComposerProvider = ({ children }) => {
  const [openPostId, setOpenPostId] = useState(null);

  return (
    <FeedComposerContext.Provider value={{ openPostId, setOpenPostId }}>
      {children}
    </FeedComposerContext.Provider>
  );
};

FeedComposerProvider.propTypes = {
  children: PropTypes.node
};

export const useFeedComposer = () => useContext(FeedComposerContext);
