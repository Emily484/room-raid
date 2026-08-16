/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../src/App.jsx';

describe('App smoke render', () => {
  it('renders without crashing (mount + unmount)', () => {
    const { container, unmount } = render(
      React.createElement(MemoryRouter, null, React.createElement(App, null))
    );

    expect(container).toBeTruthy();
    unmount();
  });
});
