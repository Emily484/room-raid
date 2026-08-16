/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../src/App.jsx';

describe('App smoke render (jsx)', () => {
  it('renders without crashing (mount + unmount)', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(container).toBeTruthy();
    unmount();
  });
});
/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../src/App.jsx';

describe('App smoke render', () => {
  it('renders without crashing (mount + unmount)', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(container).toBeTruthy();
    unmount();
  });
});
